import "server-only";

import { OAuth2Client } from "google-auth-library";

import { requireGoogleConfig } from "@/lib/google/config";

/**
 * Establishing *which* Google account was connected.
 *
 * The account has to come from the ID token, verified against Google's own
 * signing keys — not from the Haab session. A provider signed in as
 * alice@haab.example may perfectly well connect bob@gmail.example's calendar,
 * and recording the Haab address would then be a lie that later reconnect
 * checks would act on.
 *
 * The nonce closes the other gap: without it, an ID token obtained elsewhere
 * could be replayed into this callback.
 */

export class GoogleIdentityError extends Error {
  constructor(readonly code: string) {
    // The code alone. A verification failure message can quote token contents.
    super(`Google identity could not be verified: ${code}`);
    this.name = "GoogleIdentityError";
  }
}

export type GoogleIdentity = {
  /** Google's stable subject id. Survives an email change; an email does not. */
  subject: string;
  email?: string;
  emailVerified: boolean;
};

type Verifier = {
  verifyIdToken(options: { idToken: string; audience: string }): Promise<{
    getPayload(): Record<string, unknown> | undefined;
  }>;
};

type VerifierFactory = (clientId: string) => Verifier;

/**
 * The real verifier fetches and caches Google's signing keys and checks the
 * signature, issuer, audience, and expiry. Tests substitute their own, so CI
 * needs no network and no Google account.
 */
const defaultVerifier: VerifierFactory = (clientId) =>
  new OAuth2Client(clientId) as unknown as Verifier;

/**
 * Verifies signature, issuer, audience, expiry, and nonce.
 *
 * The library checks the first four against Google's published keys. The nonce
 * is ours to check, and it is the one that makes this callback-specific.
 */
export async function verifyGoogleIdToken(
  input: { idToken: string; expectedNonce: string },
  createVerifier: VerifierFactory = defaultVerifier,
): Promise<GoogleIdentity> {
  const config = requireGoogleConfig();

  if (!input.idToken) {
    throw new GoogleIdentityError("missing_id_token");
  }

  let payload: Record<string, unknown> | undefined;

  try {
    const ticket = await createVerifier(config.clientId).verifyIdToken({
      idToken: input.idToken,
      audience: config.clientId,
    });

    payload = ticket.getPayload();
  } catch {
    // Bad signature, wrong audience, expired — one answer, because telling them
    // apart tells an attacker which part they got right.
    throw new GoogleIdentityError("verification_failed");
  }

  if (!payload) {
    throw new GoogleIdentityError("empty_payload");
  }

  const issuer = String(payload.iss ?? "");

  // Belt and braces: the library checks this, and an issuer check is cheap
  // enough that having it twice costs nothing.
  if (issuer !== "https://accounts.google.com" && issuer !== "accounts.google.com") {
    throw new GoogleIdentityError("unexpected_issuer");
  }

  if (payload.aud !== config.clientId) {
    throw new GoogleIdentityError("unexpected_audience");
  }

  if (typeof payload.nonce !== "string" || payload.nonce !== input.expectedNonce) {
    // A token minted for some other flow, replayed into this one.
    throw new GoogleIdentityError("nonce_mismatch");
  }

  const subject = typeof payload.sub === "string" ? payload.sub : "";

  if (!subject) {
    throw new GoogleIdentityError("missing_subject");
  }

  return {
    subject,
    email: typeof payload.email === "string" ? payload.email : undefined,
    emailVerified: payload.email_verified === true,
  };
}
