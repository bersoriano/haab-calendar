import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Envelope encryption for Google refresh tokens.
 *
 * The tokens are stored encrypted at the application layer rather than trusted
 * to the database, so a dump — a leaked backup, an over-broad read — yields
 * ciphertext and nothing else. AES-256-GCM authenticates as well as encrypts:
 * a tampered row fails to open instead of decrypting into something plausible.
 *
 * `keyVersion` is stored beside the ciphertext so a key can be rotated by
 * writing new rows at version 2 while version 1 still opens the old ones.
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;
export const CURRENT_KEY_VERSION = 1;

export class TokenCryptoError extends Error {
  constructor(readonly code: string) {
    // The code only. A message quoting the key, even partially, would put it in
    // whatever log caught the error.
    super(`Google token encryption failed: ${code}`);
    this.name = "TokenCryptoError";
  }
}

export type SealedSecret = {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
};

function readKey(): Buffer {
  const raw = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim();

  if (!raw) {
    throw new TokenCryptoError("missing_key");
  }

  const key = Buffer.from(raw, "base64");

  if (key.length !== KEY_BYTES) {
    throw new TokenCryptoError("invalid_key_length");
  }

  return key;
}

export function encryptSecret(secret: string): SealedSecret {
  if (!secret) {
    throw new TokenCryptoError("empty_secret");
  }

  const key = readKey();
  // A fresh IV every time: reusing one under the same key would let an observer
  // tell that two providers hold the same token.
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion: CURRENT_KEY_VERSION,
  };
}

export function decryptSecret(sealed: SealedSecret): string {
  const key = readKey();

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(sealed.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(sealed.authTag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(sealed.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Wrong key, tampered ciphertext, tampered tag — one answer for all three,
    // because distinguishing them tells an attacker which one they achieved.
    throw new TokenCryptoError("decrypt_failed");
  }
}
