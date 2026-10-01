import type { VerticalId } from "@/lib/types";

/**
 * Date of birth, an optional field on the details step. Stored as the
 * date input gives it ("YYYY-MM-DD") in the booking's `details` payload.
 */
export const EARLIEST_DATE_OF_BIRTH = "1900-01-01";

/** Only a clinic has a reason to ask; nowhere else is it asked or kept. */
export function collectsDateOfBirth(vertical: VerticalId | null | undefined) {
  return vertical === "healthcare";
}

export type DateOfBirthResult = { ok: true; value: string | undefined } | { ok: false };

/**
 * Empty is fine (the field is optional). Anything else must be a real
 * calendar date between 1900 and `latestDateKey` (today, give or take the
 * caller's time zone).
 */
export function parseDateOfBirth(raw: unknown, latestDateKey: string): DateOfBirthResult {
  if (raw === undefined || raw === null) return { ok: true, value: undefined };
  if (typeof raw !== "string") return { ok: false };

  const value = raw.trim();
  if (!value) return { ok: true, value: undefined };

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { ok: false };

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;

  if (!isRealDate || value < EARLIEST_DATE_OF_BIRTH || value > latestDateKey) {
    return { ok: false };
  }

  return { ok: true, value };
}
