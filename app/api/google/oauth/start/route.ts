import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { requireEntitlement } from "@/lib/entitlements/server";
import { GoogleConfigError, isGoogleConfigured } from "@/lib/google/config";
import {
  buildAuthorizationUrl,
  createOAuthState,
  createPkcePair,
} from "@/lib/google/oauth";
import { resolveRequestId, withRequestId } from "@/lib/observability/context";
import { logger } from "@/lib/observability/logger";
import { getProviderDashboardContext } from "@/lib/supabase/bookings";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Ten minutes is longer than any honest consent screen takes. */
const OAUTH_COOKIE_MAX_AGE = 600;
export const OAUTH_STATE_COOKIE = "haab_google_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "haab_google_oauth_verifier";

/**
 * Starts the Google connection.
 *
 * The provider is resolved from the session, never from a parameter: a
 * connection is bound to whoever is signed in, and accepting a provider id here
 * would let anyone attach their calendar to someone else's account.
 *
 * State and PKCE verifier go into httpOnly cookies. They must survive a
 * redirect to Google and come back unreadable by any script on the page.
 */
export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request.headers);
  const log = logger.child({ requestId });
  const respond = (body: Record<string, unknown>, status: number) =>
    withRequestId(NextResponse.json(body, { status }), requestId);

  if (!isGoogleConfigured()) {
    return respond({ userMessage: "Google Calendar is not available." }, 404);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return respond({ userMessage: "Sign in first." }, 401);
  }

  const context = await getProviderDashboardContext(supabase, user.id);

  if (!context) {
    return respond({ userMessage: "Create your booking page first." }, 404);
  }

  try {
    // Server-side, at the moment of the request. The dashboard may believe the
    // feature is available; this is what decides it.
    await requireEntitlement(context.providerId, "google_calendar_sync");
  } catch {
    log.warn("entitlements.denied", {
      providerId: context.providerId,
      featureKey: "google_calendar_sync",
    });
    return respond({ userMessage: "Google Calendar sync is not enabled." }, 403);
  }

  try {
    const state = createOAuthState();
    const { verifier, challenge } = createPkcePair();

    const store = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // Lax, not Strict: Google redirects the browser back here, and a Strict
      // cookie would not be sent on that cross-site navigation.
      sameSite: "lax" as const,
      path: "/api/google/oauth",
      maxAge: OAUTH_COOKIE_MAX_AGE,
    };

    store.set(OAUTH_STATE_COOKIE, state, cookieOptions);
    store.set(OAUTH_VERIFIER_COOKIE, verifier, cookieOptions);

    const url = buildAuthorizationUrl({
      state,
      codeChallenge: challenge,
      loginHint: user.email ?? undefined,
    });

    return withRequestId(NextResponse.redirect(url), requestId);
  } catch (error) {
    log.error("entitlements.denied", {
      providerId: context.providerId,
      errorCode: error instanceof GoogleConfigError ? error.code : "oauth_start_failed",
    });

    return respond({ userMessage: "Could not start the Google connection." }, 500);
  }
}
