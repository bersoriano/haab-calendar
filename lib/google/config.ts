import "server-only";

/**
 * Google configuration, read at call time.
 *
 * Lazy for the same reason the Stripe config is: `next build` must succeed on a
 * machine with no Google credentials, and every reader fails closed — a missing
 * value disables the feature rather than half-enabling it.
 */

/**
 * One-way projection needs to write events and to list the calendars a provider
 * could write to. Nothing more. The full `calendar` scope would also grant read
 * access to every event body on every calendar, which this feature has no use
 * for and no business holding.
 */
export const GOOGLE_ONE_WAY_SCOPES = [
  "openid",
  // Requested because the settings page shows which account is connected, and
  // an account nobody can identify is not something a provider can audit.
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
] as const;

export class GoogleConfigError extends Error {
  constructor(readonly code: string) {
    super(`Google Calendar is not configured: ${code}`);
    this.name = "GoogleConfigError";
  }
}

export type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  namespace: string;
};

export function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID?.trim() || undefined;
}

export function getGoogleRedirectUri() {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() || undefined;
}

/**
 * Which deployment owns an event.
 *
 * Stamped into every managed event's private properties, so a staging
 * deployment pointed at a shared calendar can never mistake a production
 * booking's event for its own. Defaulting is deliberate but explicit: an
 * unset namespace means "local", never "same as production".
 */
export function getDeploymentNamespace() {
  return process.env.HAAB_DEPLOYMENT_NAMESPACE?.trim() || "local";
}

/**
 * Where Google delivers push notifications.
 *
 * Derived from the redirect URI rather than configured separately: the two must
 * be the same public origin, and a second variable is a second thing to get
 * wrong. Google requires HTTPS here and will refuse to create a channel
 * otherwise, so a local deployment simply has no watch address.
 */
export function getWatchNotificationUrl(): string | undefined {
  const redirect = getGoogleRedirectUri();

  if (!redirect) {
    return undefined;
  }

  try {
    const origin = new URL(redirect).origin;

    return origin.startsWith("https://")
      ? `${origin}/api/webhooks/google-calendar`
      : undefined;
  } catch {
    return undefined;
  }
}

export function isGoogleConfigured() {
  return Boolean(
    getGoogleClientId() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim() &&
      getGoogleRedirectUri() &&
      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim(),
  );
}

export function requireGoogleConfig(): GoogleConfig {
  const clientId = getGoogleClientId();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = getGoogleRedirectUri();

  if (!clientId) throw new GoogleConfigError("missing_client_id");
  if (!clientSecret) throw new GoogleConfigError("missing_client_secret");
  if (!redirectUri) throw new GoogleConfigError("missing_redirect_uri");

  // Checked here too: a connection whose tokens cannot be sealed must never be
  // created, or the callback would store a plaintext refresh token.
  if (!process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim()) {
    throw new GoogleConfigError("missing_encryption_key");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    namespace: getDeploymentNamespace(),
  };
}
