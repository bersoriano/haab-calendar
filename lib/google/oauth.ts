import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import {
  GOOGLE_ONE_WAY_SCOPES,
  GoogleConfigError,
  requireGoogleConfig,
} from "@/lib/google/config";

/**
 * The OAuth half of the Google connection.
 *
 * Endpoints and parameters follow Google's current web-server OAuth
 * documentation: authorization at accounts.google.com/o/oauth2/v2/auth, token
 * exchange and refresh at oauth2.googleapis.com/token as form-encoded POSTs.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export class GoogleOAuthError extends Error {
  constructor(
    readonly code: string,
    readonly retryable = false,
  ) {
    // Never Google's own error body: it can echo the client secret back.
    super(`Google OAuth failed: ${code}`);
    this.name = "GoogleOAuthError";
  }
}

export type PkcePair = { verifier: string; challenge: string };

export function createPkcePair(): PkcePair {
  // 32 random bytes base64url — inside RFC 7636's 43–128 character range.
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  return { verifier, challenge };
}

export function createOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

/** Constant-time, because a state comparison that returns early leaks it. */
export function statesMatch(expected: string, received: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);

  if (a.length !== b.length || a.length === 0) {
    return false;
  }

  return timingSafeEqual(a, b);
}

export function buildAuthorizationUrl(input: {
  state: string;
  codeChallenge: string;
  loginHint?: string;
}): string {
  const config = requireGoogleConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_ONE_WAY_SCOPES.join(" "),
    // offline is what returns a refresh token at all; without it the connection
    // dies the first time the access token expires.
    access_type: "offline",
    // Google only returns a refresh token on the consent screen. Forcing it
    // means a reconnect always yields one rather than silently reusing a grant
    // whose refresh token this deployment never received.
    prompt: "consent",
    include_granted_scopes: "true",
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    ...(input.loginHint ? { login_hint: input.loginHint } : {}),
  });

  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export type GoogleTokens = {
  accessToken: string;
  /** Absent when Google reuses an existing grant; the stored one must be kept. */
  refreshToken?: string;
  expiresAt: string;
  grantedScopes: string[];
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

async function postToken(
  body: URLSearchParams,
  fetchImpl: typeof fetch,
): Promise<GoogleTokens> {
  let response: Response;

  try {
    response = await fetchImpl(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    // Network, not refusal. Worth retrying.
    throw new GoogleOAuthError("token_request_failed", true);
  }

  if (!response.ok) {
    // 5xx is Google having a bad day; 4xx means the grant is gone and retrying
    // would only repeat the rejection.
    throw new GoogleOAuthError(
      response.status >= 500 ? "token_endpoint_unavailable" : "token_rejected",
      response.status >= 500 || response.status === 429,
    );
  }

  const payload = (await response.json().catch(() => ({}))) as TokenResponse;

  if (!payload.access_token) {
    throw new GoogleOAuthError("token_response_invalid");
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    // A minute of slack, so a token is refreshed before it is refused.
    expiresAt: new Date(Date.now() + ((payload.expires_in ?? 3600) - 60) * 1000).toISOString(),
    grantedScopes: (payload.scope ?? "").split(" ").filter(Boolean),
  };
}

export async function exchangeAuthorizationCode(
  input: { code: string; codeVerifier: string },
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleTokens> {
  const config = requireGoogleConfig();

  return postToken(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: input.code,
      code_verifier: input.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
    fetchImpl,
  );
}

export async function refreshAccessToken(
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleTokens> {
  const config = requireGoogleConfig();

  return postToken(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    fetchImpl,
  );
}

/**
 * Whether the grant actually covers what the feature needs.
 *
 * Google's granular consent lets a user approve some scopes and decline
 * others, so a successful callback is not a promise that anything was granted.
 * `openid` is excluded: it is requested for identity, and the feature works
 * without it.
 */
export function hasRequiredScopes(granted: readonly string[]): boolean {
  const required = GOOGLE_ONE_WAY_SCOPES.filter((scope) => scope !== "openid");

  return required.every((scope) => granted.includes(scope));
}

/**
 * Best-effort revocation at Google.
 *
 * Deleting the row stops Haab using the token; revoking stops anyone else who
 * ever obtained a copy. Failure is deliberately ignored — the local row must be
 * removed either way, and a provider disconnecting must never be blocked by
 * Google being unreachable.
 */
export async function revokeRefreshToken(
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const response = await fetchImpl("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export function missingScopes(granted: readonly string[]): string[] {
  return GOOGLE_ONE_WAY_SCOPES.filter(
    (scope) => scope !== "openid" && !granted.includes(scope),
  );
}

export { GoogleConfigError };
