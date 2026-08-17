import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { requireEntitlement } from "@/lib/entitlements/server";
import { isGoogleConfigured, requireGoogleConfig } from "@/lib/google/config";
import { saveConnection } from "@/lib/google/connections";
import { verifyGoogleIdToken } from "@/lib/google/identity";
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
  OAUTH_NONCE_COOKIE,
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

  // Bound to the configured redirect URI's origin, not the request's host: a
  // forwarded Host header must not be able to steer where this redirects.
  let appOrigin: string;
  try {
    appOrigin = new URL(requireGoogleConfig().redirectUri).origin;
  } catch {
    appOrigin = request.nextUrl.origin;
  }

  const settingsUrl = new URL("/?google=", appOrigin);

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
  const expectedNonce = store.get(OAUTH_NONCE_COOKIE)?.value;

  // Single use, whatever happens next.
  store.delete(OAUTH_STATE_COOKIE);
  store.delete(OAUTH_VERIFIER_COOKIE);
  store.delete(OAUTH_NONCE_COOKIE);

  const params = request.nextUrl.searchParams;

  if (params.get("error")) {
    // The user declined at Google's consent screen. Not a failure to report.
    return finish("declined");
  }

  const code = params.get("code");
  const state = params.get("state");

  if (!code || !state || !expectedState || !verifier || !expectedNonce) {
    return finish("invalid");
  }

  if (!statesMatch(expectedState, state)) {
    // Either a stale tab or a forged callback. Both end here.
    log.warn("google.oauth.failed", { errorCode: "oauth_state_mismatch" });
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
      log.warn("google.oauth.failed", {
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

    // Which Google account this is comes from the verified ID token. The Haab
    // session says who is signed in here, which is a different question — a
    // provider may connect any Google account they can authenticate to.
    const identity = await verifyGoogleIdToken({
      idToken: tokens.idToken ?? "",
      expectedNonce,
    });

    await saveConnection({
      providerId: context.providerId,
      refreshToken: tokens.refreshToken,
      grantedScopes: tokens.grantedScopes,
      accountEmail: identity.emailVerified ? identity.email : undefined,
      accountSubject: identity.subject,
    });

    log.info("google.oauth.succeeded", { providerId: context.providerId });
    log.info("google.connection.saved", { providerId: context.providerId });

    return finish("connected");
  } catch (error) {
    log.error("google.oauth.failed", {
      providerId: context.providerId,
      errorCode:
        error instanceof Error && "code" in error
          ? String((error as { code: unknown }).code)
          : "oauth_callback_failed",
    });

    return finish("failed");
  }
}
