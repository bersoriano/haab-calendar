import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildAuthorizationUrl,
  createOAuthNonce,
  createOAuthState,
  createPkcePair,
  exchangeAuthorizationCode,
  GoogleOAuthError,
  hasRequiredScopes,
  missingScopes,
  refreshAccessToken,
  statesMatch,
} from "@/lib/google/oauth";
import { GoogleConfigError } from "@/lib/google/config";

const EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const LIST_SCOPE = "https://www.googleapis.com/auth/calendar.calendarlist.readonly";

function configure() {
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
  vi.stubEnv("GOOGLE_OAUTH_REDIRECT_URI", "https://haab.test/api/google/oauth/callback");
  vi.stubEnv("GOOGLE_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
}

function tokenResponse(body: Record<string, unknown>, status = 200) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  ) as unknown as typeof fetch;
}

beforeEach(configure);
afterEach(() => vi.unstubAllEnvs());

describe("PKCE and state", () => {
  it("produces a verifier inside RFC 7636's length range", () => {
    const { verifier, challenge } = createPkcePair();

    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(challenge).not.toBe(verifier);
  });

  it("produces a different pair every time", () => {
    expect(createPkcePair().verifier).not.toBe(createPkcePair().verifier);
    expect(createOAuthState()).not.toBe(createOAuthState());
    expect(createOAuthNonce()).not.toBe(createOAuthNonce());
  });

  it("matches a state against itself and nothing else", () => {
    const state = createOAuthState();

    expect(statesMatch(state, state)).toBe(true);
    expect(statesMatch(state, createOAuthState())).toBe(false);
    expect(statesMatch(state, "")).toBe(false);
    expect(statesMatch("", "")).toBe(false);
  });
});

describe("buildAuthorizationUrl", () => {
  it("asks for offline access, PKCE, and incremental scopes", () => {
    const url = new URL(
      buildAuthorizationUrl({ state: "state-1", nonce: "nonce-1", codeChallenge: "challenge-1" }),
    );

    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-1");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("include_granted_scopes")).toBe("true");
    expect(url.searchParams.get("state")).toBe("state-1");
    // Echoed back inside the ID token, which is what stops a token minted for
    // another flow being replayed into this callback.
    expect(url.searchParams.get("nonce")).toBe("nonce-1");
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  it("requests only the narrow scopes, never full calendar access", () => {
    const url = new URL(
      buildAuthorizationUrl({ state: "s", nonce: "n", codeChallenge: "c" }),
    );
    const scopes = (url.searchParams.get("scope") ?? "").split(" ");

    expect(scopes).toContain(EVENTS_SCOPE);
    expect(scopes).toContain(LIST_SCOPE);
    expect(scopes).not.toContain("https://www.googleapis.com/auth/calendar");
  });

  it("never puts the client secret in the URL", () => {
    const url = buildAuthorizationUrl({ state: "s", nonce: "n", codeChallenge: "c" });

    expect(url).not.toContain("test-client-secret");
  });

  it("refuses to build a URL when nothing is configured", () => {
    vi.unstubAllEnvs();

    expect(() => buildAuthorizationUrl({ state: "s", nonce: "n", codeChallenge: "c" })).toThrow(
      GoogleConfigError,
    );
  });
});

describe("exchangeAuthorizationCode", () => {
  it("posts the code and verifier, and reads the tokens back", async () => {
    const fetchImpl = tokenResponse({
      access_token: "ya29.test",
      refresh_token: "1//refresh",
      expires_in: 3600,
      scope: `${EVENTS_SCOPE} ${LIST_SCOPE}`,
    });

    const tokens = await exchangeAuthorizationCode(
      { code: "auth-code", codeVerifier: "verifier" },
      fetchImpl,
    );

    expect(tokens).toMatchObject({
      accessToken: "ya29.test",
      refreshToken: "1//refresh",
      grantedScopes: [EVENTS_SCOPE, LIST_SCOPE],
    });

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect((init as RequestInit).headers).toMatchObject({
      "content-type": "application/x-www-form-urlencoded",
    });
    expect(String((init as RequestInit).body)).toContain("code_verifier=verifier");
  });

  it("expires a little early, so a token is refreshed before it is refused", async () => {
    const tokens = await exchangeAuthorizationCode(
      { code: "c", codeVerifier: "v" },
      tokenResponse({ access_token: "a", expires_in: 3600 }),
    );

    const remaining = new Date(tokens.expiresAt).getTime() - Date.now();
    expect(remaining).toBeLessThan(3600 * 1000);
    expect(remaining).toBeGreaterThan(3500 * 1000);
  });

  it("treats a 4xx as permanent and a 5xx as retryable", async () => {
    await expect(
      exchangeAuthorizationCode({ code: "c", codeVerifier: "v" }, tokenResponse({}, 400)),
    ).rejects.toMatchObject({ code: "token_rejected", retryable: false });

    await expect(
      exchangeAuthorizationCode({ code: "c", codeVerifier: "v" }, tokenResponse({}, 503)),
    ).rejects.toMatchObject({ code: "token_endpoint_unavailable", retryable: true });
  });

  it("treats a rate limit as retryable", async () => {
    await expect(
      exchangeAuthorizationCode({ code: "c", codeVerifier: "v" }, tokenResponse({}, 429)),
    ).rejects.toMatchObject({ retryable: true });
  });

  it("treats a network failure as retryable", async () => {
    const failing = vi.fn(async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;

    await expect(
      exchangeAuthorizationCode({ code: "c", codeVerifier: "v" }, failing),
    ).rejects.toMatchObject({ code: "token_request_failed", retryable: true });
  });

  it("rejects a response with no access token", async () => {
    await expect(
      exchangeAuthorizationCode(
        { code: "c", codeVerifier: "v" },
        tokenResponse({ scope: EVENTS_SCOPE }),
      ),
    ).rejects.toBeInstanceOf(GoogleOAuthError);
  });

  it("never echoes Google's error body", async () => {
    const fetchImpl = tokenResponse(
      { error: "invalid_client", error_description: "client secret test-client-secret" },
      401,
    );

    await expect(
      exchangeAuthorizationCode({ code: "c", codeVerifier: "v" }, fetchImpl),
    ).rejects.toSatisfy(
      (error: Error) => !error.message.includes("test-client-secret"),
    );
  });
});

describe("refreshAccessToken", () => {
  it("sends the refresh grant", async () => {
    const fetchImpl = tokenResponse({ access_token: "ya29.new", expires_in: 3600 });

    await refreshAccessToken("1//stored-refresh", fetchImpl);

    const body = String(
      (
        (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
          .calls[0][1] as RequestInit
      ).body,
    );
    expect(body).toContain("grant_type=refresh_token");
    expect(body).toContain("refresh_token=1%2F%2Fstored-refresh");
  });

  it("reports no new refresh token when Google reuses the grant", async () => {
    // Google returns a refresh token only on consent. The caller must keep the
    // stored one rather than overwriting it with undefined.
    const tokens = await refreshAccessToken(
      "1//stored",
      tokenResponse({ access_token: "ya29.new", expires_in: 3600 }),
    );

    expect(tokens.refreshToken).toBeUndefined();
    expect(tokens.accessToken).toBe("ya29.new");
  });
});

describe("scope validation", () => {
  it("accepts a grant that covers the writing and listing scopes", () => {
    expect(hasRequiredScopes([EVENTS_SCOPE, LIST_SCOPE, "openid", "email"])).toBe(true);
    expect(missingScopes([EVENTS_SCOPE, LIST_SCOPE])).toEqual([]);
  });

  it("refuses a partial grant, which granular consent makes possible", () => {
    expect(hasRequiredScopes([EVENTS_SCOPE])).toBe(false);
    expect(missingScopes([EVENTS_SCOPE])).toEqual([LIST_SCOPE]);
  });

  it("refuses an empty grant", () => {
    expect(hasRequiredScopes([])).toBe(false);
  });

  it("does not require the identity scopes, which are not capabilities", () => {
    // openid and email name the account; the feature works without either.
    expect(hasRequiredScopes([EVENTS_SCOPE, LIST_SCOPE])).toBe(true);
    expect(missingScopes([EVENTS_SCOPE, LIST_SCOPE])).toEqual([]);
  });

  it("reads the id token out of the exchange", async () => {
    const tokens = await exchangeAuthorizationCode(
      { code: "c", codeVerifier: "v" },
      tokenResponse({ access_token: "a", id_token: "header.payload.sig", expires_in: 3600 }),
    );

    expect(tokens.idToken).toBe("header.payload.sig");
  });
});
