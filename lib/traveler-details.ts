import { TRAVELER_FIELDS, type TravelerDetails, type TravelerField } from "./types";

/** Long enough for an emergency contact's name and number; not a free essay. */
export const MAX_TRAVELER_DETAIL_LENGTH = 200;

/** Known fields only, without repeats, in the order the form asks for them. */
export function normalizeTravelerFields(source: unknown): TravelerField[] {
  if (!Array.isArray(source)) return [];
  return TRAVELER_FIELDS.filter((field) => source.includes(field));
}

/**
 * What a booking keeps from the form: a trimmed answer for each field the
 * service asks for. Every answer is optional, so an empty one is simply absent
 * and nothing here can refuse a booking. Anything else that arrives is dropped,
 * because the owner did not ask for it and should not end up holding it.
 */
export function parseTravelerDetails(
  raw: unknown,
  allowed: readonly TravelerField[] | undefined,
): TravelerDetails {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !allowed?.length) {
    return {};
  }

  const answers: TravelerDetails = {};

  for (const field of allowed) {
    const value = (raw as Record<string, unknown>)[field];
    const text =
      typeof value === "string" ? value.trim().slice(0, MAX_TRAVELER_DETAIL_LENGTH) : "";
    if (text) answers[field] = text;
  }

  return answers;
}
