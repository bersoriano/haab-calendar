import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GoogleIdentityError, verifyGoogleIdToken } from "@/lib/google/identity";

const CLIENT_ID = "test-client-id.apps.googleusercontent.com";
const NONCE = "nonce-from-the-cookie";

function configure() {
  vi.stubEnv("GOOGLE_CLIENT_ID", CLIENT_ID);
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
  vi.stubEnv("GOOGLE_OAUTH_REDIRECT_URI", "https://haab.test/api/google/oauth/callback");
  vi.stubEnv("GOOGLE_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 5).toString("base64"));
}

/** Stands in for the library's key-fetching verifier. */
function verifierReturning(payload: Record<string, unknown> | undefined) {
  return () => ({
    verifyIdToken: async () => ({ getPayload: () => payload }),
  });
}

function rejectingVerifier() {
  return () => ({
    verifyIdToken: async () => {
      throw new Error("Invalid token signature");
    },
  });
}

const validPayload = {
  iss: "https://accounts.google.com",
  aud: CLIENT_ID,
  sub: "1096283746152",
  email: "owner@example.invalid",
  email_verified: true,
  nonce: NONCE,
};

beforeEach(configure);
afterEach(() => vi.unstubAllEnvs());

describe("verifyGoogleIdToken", () => {
  it("returns the Google subject and verified email", async () => {
    const identity = await verifyGoogleIdToken(
      { idToken: "header.payload.sig", expectedNonce: NONCE },
      verifierReturning(validPayload),
    );

    expect(identity).toEqual({
      subject: "1096283746152",
      email: "owner@example.invalid",
      emailVerified: true,
    });
  });

  it("withholds an unverified email rather than trusting it", async () => {
    const identity = await verifyGoogleIdToken(
      { idToken: "t", expectedNonce: NONCE },
      verifierReturning({ ...validPayload, email_verified: false }),
    );

    expect(identity.emailVerified).toBe(false);
    expect(identity.subject).toBe("1096283746152");
  });

  it("rejects a token whose nonce does not match this flow", async () => {
    // Without this, an ID token obtained anywhere else could be replayed here.
    await expect(
      verifyGoogleIdToken(
        { idToken: "t", expectedNonce: NONCE },
        verifierReturning({ ...validPayload, nonce: "someone-elses-nonce" }),
      ),
    ).rejects.toMatchObject({ code: "nonce_mismatch" });
  });

  it("rejects a token with no nonce at all", async () => {
    const withoutNonce = { ...validPayload, nonce: undefined };

    await expect(
      verifyGoogleIdToken(
        { idToken: "t", expectedNonce: NONCE },
        verifierReturning(withoutNonce),
      ),
    ).rejects.toMatchObject({ code: "nonce_mismatch" });
  });

  it("rejects a token minted for another application", async () => {
    await expect(
      verifyGoogleIdToken(
        { idToken: "t", expectedNonce: NONCE },
        verifierReturning({ ...validPayload, aud: "someone-elses-client-id" }),
      ),
    ).rejects.toMatchObject({ code: "unexpected_audience" });
  });

  it("rejects a token from an unexpected issuer", async () => {
    await expect(
      verifyGoogleIdToken(
        { idToken: "t", expectedNonce: NONCE },
        verifierReturning({ ...validPayload, iss: "https://accounts.evil.invalid" }),
      ),
    ).rejects.toMatchObject({ code: "unexpected_issuer" });
  });

  it("accepts either issuer spelling Google uses", async () => {
    await expect(
      verifyGoogleIdToken(
        { idToken: "t", expectedNonce: NONCE },
        verifierReturning({ ...validPayload, iss: "accounts.google.com" }),
      ),
    ).resolves.toMatchObject({ subject: "1096283746152" });
  });

  it("reports a failed signature or expiry as one thing", async () => {
    // Distinguishing them tells an attacker which part they got right.
    await expect(
      verifyGoogleIdToken({ idToken: "t", expectedNonce: NONCE }, rejectingVerifier()),
    ).rejects.toMatchObject({ code: "verification_failed" });
  });

  it("rejects a token with no subject", async () => {
    const withoutSubject = { ...validPayload, sub: undefined };

    await expect(
      verifyGoogleIdToken(
        { idToken: "t", expectedNonce: NONCE },
        verifierReturning(withoutSubject),
      ),
    ).rejects.toMatchObject({ code: "missing_subject" });
  });

  it("rejects an empty payload", async () => {
    await expect(
      verifyGoogleIdToken(
        { idToken: "t", expectedNonce: NONCE },
        verifierReturning(undefined),
      ),
    ).rejects.toMatchObject({ code: "empty_payload" });
  });

  it("rejects a missing token before calling anything", async () => {
    await expect(
      verifyGoogleIdToken({ idToken: "", expectedNonce: NONCE }, verifierReturning(validPayload)),
    ).rejects.toBeInstanceOf(GoogleIdentityError);
  });

  it("never puts token contents in the error", async () => {
    try {
      await verifyGoogleIdToken(
        { idToken: "header.SENSITIVE_PAYLOAD.sig", expectedNonce: NONCE },
        rejectingVerifier(),
      );
      throw new Error("Expected a verification failure.");
    } catch (error) {
      expect((error as Error).message).not.toContain("SENSITIVE_PAYLOAD");
      expect((error as Error).message).not.toContain("signature");
    }
  });
});
