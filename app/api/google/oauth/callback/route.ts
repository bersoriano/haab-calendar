import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { requireEntitlement } from "@/lib/entitlements/server";
import { isGoogleConfigured } from "@/lib/google/config";
import { saveConnection } from "@/lib/google/connections";
import {
  exchangeAuthorizationCode,
  hasRequiredScopes,
  missingScopes,
  statesMatch,
} from "@/lib/google/oauth";
import { resolveRequestId, withRequestId } from "@/lib/observability/context";
import { logger } from "@/lib/observability/logger";
import { getProviderDashboardContext } from "@/lib/supabase/bookings";
import { createClient } from "@/lib/supabase/server";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from "@/app/api/google/oauth/start/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Completes the Google connection.
 *
 * Order matters: session, then state, then code exchange, then scopes, then
 * storage. Anything before the state check is attacker-controlled — a callback
 * URL can be forged, so an unverified `code` must never be exchanged against
 * this application's credentials.
 */
export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request.headers);
  const log = logger.child({ requestId });
  const settingsUrl = new URL("/?google=", request.nextUrl.origin);

  const finish = (outcome: string) => {
    settingsUrl.search = `?google=${outcome}`;
    return withRequestId(NextResponse.redirect(settingsUrl), requestId);
  };

  if (!isGoogleConfigured()) {
    return finish("unavailable");
  }

  const store = await cookies();
  const expectedState = store.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = store.get(OAUTH_VERIFIER_COOKIE)?.value;

  // Single use, whatever happens next.
  store.delete(OAUTH_STATE_COOKIE);
  store.delete(OAUTH_VERIFIER_COOKIE);

  const params = request.nextUrl.searchParams;

  if (params.get("error")) {
    // The user declined at Google's consent screen. Not a failure to report.
    return finish("declined");
  }

  const code = params.get("code");
  const state = params.get("state");

  if (!code || !state || !expectedState || !verifier) {
    return finish("invalid");
  }

  if (!statesMatch(expectedState, state)) {
    // Either a stale tab or a forged callback. Both end here.
    log.warn("entitlements.denied", { errorCode: "oauth_state_mismatch" });
    return finish("invalid");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return finish("signed_out");
  }

  const context = await getProviderDashboardContext(supabase, user.id);

  if (!context) {
    return finish("no_provider");
  }

  try {
    await requireEntitlement(context.providerId, "google_calendar_sync");
  } catch {
    return finish("not_entitled");
  }

  try {
    const tokens = await exchangeAuthorizationCode({ code, codeVerifier: verifier });

    // Granular consent lets a user approve some scopes and decline others, so a
    // successful exchange is not a promise that the feature can work.
    if (!hasRequiredScopes(tokens.grantedScopes)) {
      log.warn("entitlements.denied", {
        providerId: context.providerId,
        errorCode: "missing_scopes",
        // Count only: the scope strings themselves are not secret, but there is
        // no operational reason to write them down per provider.
        missingCount: missingScopes(tokens.grantedScopes).length,
      });
      return finish("missing_scopes");
    }

    if (!tokens.refreshToken) {
      // Without one, the connection dies at the first token expiry. Better to
      // refuse now than to store something that stops working in an hour.
      return finish("no_refresh_token");
    }

    await saveConnection({
      providerId: context.providerId,
      refreshToken: tokens.refreshToken,
      grantedScopes: tokens.grantedScopes,
      accountEmail: user.email ?? undefined,
    });

    log.info("entitlements.override_applied", {
      providerId: context.providerId,
      featureKey: "google_calendar_sync",
      outcome: "connected",
    });

    return finish("connected");
  } catch (error) {
    log.error("entitlements.denied", {
      providerId: context.providerId,
      errorCode:
        error instanceof Error && "code" in error
          ? String((error as { code: unknown }).code)
          : "oauth_callback_failed",
    });

    return finish("failed");
  }
}
