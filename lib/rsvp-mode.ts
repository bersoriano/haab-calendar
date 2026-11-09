import {
  VOCABULARIES,
  type ProviderInfo,
  type RsvpMode,
  type VerticalId,
  type Vocabulary,
} from "./types";

/** The most people one invitation may hold. Mirrors the database check. */
export const INVITATION_SEAT_LIMIT_MAX = 20;
export const DEFAULT_INVITATION_SEATS = 2;

/** Anything that is not a known mode is the page as it always was. */
export function parseRsvpMode(value: unknown): RsvpMode {
  return value === "invitations" ? "invitations" : "open";
}

/** A word set the app knows, or undefined for the vertical's own words. */
export function parseVocabulary(value: unknown): Vocabulary | undefined {
  return (VOCABULARIES as readonly unknown[]).includes(value) ? (value as Vocabulary) : undefined;
}

/**
 * A seat count from a form or a row: a whole number from 1 to 20. Above the
 * maximum is clamped; nothing, zero, a fraction or junk takes the fallback.
 */
export function clampInvitationSeats(value: unknown, fallback = DEFAULT_INVITATION_SEATS): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;

  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, INVITATION_SEAT_LIMIT_MAX);
}

/** The mode only exists on the events vertical; anywhere else it is off. */
export function isInvitationMode(
  provider: Pick<ProviderInfo, "rsvpMode">,
  vertical: VerticalId | undefined,
): boolean {
  return vertical === "events" && provider.rsvpMode === "invitations";
}
