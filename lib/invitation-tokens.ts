import { createHash, randomBytes } from "node:crypto";

/**
 * Invitation link tokens. Server-only: the token is 32 random bytes as
 * base64url (43 characters). The owner keeps the token itself so the link can
 * be copied again; strangers are matched by its SHA-256 only.
 */
export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateInvitationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInvitationToken(token) };
}
