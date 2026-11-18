import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_PATTERN = /^r\.([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/;

function secret() {
  const value = process.env.REMINDER_LINK_SECRET;
  if (!value || value.length < 32) throw new Error("REMINDER_LINK_SECRET must contain at least 32 characters.");
  return value;
}

export function createReminderManageToken(bookingId: string): string {
  const signature = createHmac("sha256", secret()).update(`booking-reminder:${bookingId}`).digest("base64url");
  return `r.${bookingId}.${signature}`;
}

export function bookingIdFromReminderManageToken(token: string): string | null {
  const match = TOKEN_PATTERN.exec(token);
  if (!match) return null;
  const expected = createReminderManageToken(match[1]);
  const actualBytes = Buffer.from(token);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)
    ? match[1]
    : null;
}
