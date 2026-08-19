/**
 * The short-lived cookies that carry one OAuth attempt.
 *
 * Shared between the start route and the callback, which sit under different
 * path prefixes: the callback's path is whatever is registered in the Google
 * console, while the start route is ours to place. Keeping the names and the
 * cookie path in one module stops the two drifting apart — a mismatch there
 * would fail every connection with a state error that looks like an attack.
 */

export const OAUTH_STATE_COOKIE = "haab_google_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "haab_google_oauth_verifier";
export const OAUTH_NONCE_COOKIE = "haab_google_oauth_nonce";

/** Ten minutes is longer than any honest consent screen takes. */
export const OAUTH_COOKIE_MAX_AGE = 600;

/**
 * Both routes live under /api, and nothing narrower covers both. Still far from
 * site-wide: these cookies are never sent to a page request.
 */
export const OAUTH_COOKIE_PATH = "/api";
