import { randomBytes } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  decryptSecret,
  encryptSecret,
  TokenCryptoError,
} from "@/lib/google/crypto";

const KEY = randomBytes(32).toString("base64");
const OTHER_KEY = randomBytes(32).toString("base64");

afterEach(() => {
  vi.unstubAllEnvs();
});

function withKey(key = KEY) {
  vi.stubEnv("GOOGLE_TOKEN_ENCRYPTION_KEY", key);
}

describe("token encryption", () => {
  it("round-trips a refresh token", () => {
    withKey();
    const secret = "1//0gAbCdEfGhIjKlMnOpQrStUvWxYz-refresh-token";

    const sealed = encryptSecret(secret);

    expect(decryptSecret(sealed)).toBe(secret);
  });

  it("never stores the plaintext", () => {
    withKey();
    const secret = "1//0g-super-secret-refresh";

    const sealed = encryptSecret(secret);

    // A database dump must not yield a working token.
    expect(JSON.stringify(sealed)).not.toContain(secret);
    expect(JSON.stringify(sealed)).not.toContain("super-secret");
  });

  it("produces different ciphertext each time, so equality leaks nothing", () => {
    withKey();

    const first = encryptSecret("same-token");
    const second = encryptSecret("same-token");

    // A fresh IV per encryption: identical tokens must not look identical, or
    // an observer could tell which providers share a value.
    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(first.iv).not.toBe(second.iv);
    expect(decryptSecret(first)).toBe(decryptSecret(second));
  });

  it("records the key version, so a rotation can be rolled through", () => {
    withKey();

    expect(encryptSecret("token").keyVersion).toBe(1);
  });

  it("refuses ciphertext that has been tampered with", () => {
    withKey();
    const sealed = encryptSecret("token");
    const flipped = Buffer.from(sealed.ciphertext, "base64");
    flipped[0] ^= 0xff;

    // GCM authenticates as well as encrypts: a modified payload fails rather
    // than decrypting to something plausible.
    expect(() =>
      decryptSecret({ ...sealed, ciphertext: flipped.toString("base64") }),
    ).toThrow(TokenCryptoError);
  });

  it("refuses a tampered authentication tag", () => {
    withKey();
    const sealed = encryptSecret("token");
    const flipped = Buffer.from(sealed.authTag, "base64");
    flipped[0] ^= 0xff;

    expect(() =>
      decryptSecret({ ...sealed, authTag: flipped.toString("base64") }),
    ).toThrow(TokenCryptoError);
  });

  it("cannot be opened with a different key", () => {
    withKey();
    const sealed = encryptSecret("token");

    withKey(OTHER_KEY);

    expect(() => decryptSecret(sealed)).toThrow(TokenCryptoError);
  });

  it("refuses to encrypt when no key is configured", () => {
    expect(() => encryptSecret("token")).toThrow(TokenCryptoError);
  });

  it("refuses a key that is not 32 bytes", () => {
    withKey(randomBytes(16).toString("base64"));

    expect(() => encryptSecret("token")).toThrow(TokenCryptoError);
  });

  it("refuses to encrypt an empty secret", () => {
    withKey();

    expect(() => encryptSecret("")).toThrow(TokenCryptoError);
  });

  it("keeps the key out of the error it throws", () => {
    withKey(randomBytes(16).toString("base64"));

    try {
      encryptSecret("token");
      throw new Error("Expected a crypto error.");
    } catch (error) {
      expect((error as Error).message).not.toContain("=");
      expect((error as Error).message.length).toBeLessThan(200);
    }
  });
});
