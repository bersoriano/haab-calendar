import { getDateTimeKeysInTimeZone } from "./date";
import type { Lang } from "./types";

/**
 * The date a page stops taking answers. A date, not a moment: answers stay
 * open through the end of that day where the event happens.
 */

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar date as YYYY-MM-DD, or undefined. */
export function parseRsvpDeadline(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  const match = DATE_KEY.exec(text);
  if (!match) return undefined;

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? text
    : undefined;
}

/** Whether a household may still answer, judged by today's date in the page's zone. */
export function isRsvpOpen(deadline: string | undefined, timeZone: string | undefined, now = new Date()): boolean {
  if (!deadline) return true;
  const { dateKey } = getDateTimeKeysInTimeZone(now, timeZone || "UTC");
  return dateKey <= deadline;
}

/** "20 de diciembre de 2026": the date as written, never shifted by a zone. */
export function formatRsvpDeadline(deadline: string, lang: Lang): string {
  const [year, month, day] = deadline.split("-").map(Number);
  return new Intl.DateTimeFormat(lang, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}
