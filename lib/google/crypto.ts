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

function parseKey(raw: string | undefined, code: string): Buffer {
  if (!raw?.trim()) {
    throw new TokenCryptoError(code);
  }

  const key = Buffer.from(raw.trim(), "base64");

  if (key.length !== KEY_BYTES) {
    throw new TokenCryptoError("invalid_key_length");
  }

  return key;
}

/**
 * The key a given version was sealed with.
 *
 * Rotation works by setting GOOGLE_TOKEN_ENCRYPTION_KEY to the new key and
 * moving the old one to GOOGLE_TOKEN_ENCRYPTION_KEY_PREVIOUS. New rows are
 * written at the current version; existing rows keep opening with the previous
 * one until something rewrites them. A version this build does not know is
 * refused rather than guessed at — decrypting with the wrong key would fail the
 * authentication tag anyway, but failing early says why.
 */
function readKeyForVersion(version: number): Buffer {
  if (version === CURRENT_KEY_VERSION) {
    return parseKey(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY, "missing_key");
  }

  if (version === CURRENT_KEY_VERSION - 1) {
    return parseKey(
      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY_PREVIOUS,
      "missing_previous_key",
    );
  }

  throw new TokenCryptoError("unknown_key_version");
}

function readKey(): Buffer {
  return readKeyForVersion(CURRENT_KEY_VERSION);
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
  const key = readKeyForVersion(sealed.keyVersion);

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
