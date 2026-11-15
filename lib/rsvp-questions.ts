import type { Invitation } from "./invitations";
import type { Lang } from "./types";

/**
 * Questions an invitation-only page asks with the RSVP: a menu choice, a
 * diet note, the hotel for the shuttle. Defined by the planner on the
 * provider; answered per guest or once per invitation. Pure, shared by the
 * form, the server, the dashboard and the export.
 */

export type RsvpQuestionOption = { id: string; label: string };

export type RsvpQuestion = {
  id: string;
  kind: "choice" | "text";
  /** Empty on a built-in means its own translated label. */
  label: string;
  options: RsvpQuestionOption[];
  per: "guest" | "invitation";
  /** Events it is asked for. Empty means every event. */
  eventIds: string[];
};

export const MAX_RSVP_QUESTIONS = 10;
export const MAX_QUESTION_OPTIONS = 12;
export const QUESTION_LABEL_MAX_LENGTH = 80;
export const TEXT_ANSWER_MAX_LENGTH = 200;

/** Questions every page can switch on, with a fixed shape and their own label. */
export const BUILT_IN_QUESTION_IDS = ["diet", "shuttle"] as const;
const BUILT_IN_SHAPE: Record<(typeof BUILT_IN_QUESTION_IDS)[number], Pick<RsvpQuestion, "kind" | "per">> = {
  diet: { kind: "text", per: "guest" },
  shuttle: { kind: "text", per: "invitation" },
};
const BUILT_IN_LABELS: Record<(typeof BUILT_IN_QUESTION_IDS)[number], Record<Lang, string>> = {
  diet: { en: "Allergies or dietary needs", es: "Alergias o restricciones alimentarias" },
  shuttle: { en: "Hotel for the shuttle", es: "Hotel para el transporte" },
};

const ID_PATTERN = /^[a-z0-9_-]{1,40}$/;

function isBuiltIn(id: string): id is (typeof BUILT_IN_QUESTION_IDS)[number] {
  return (BUILT_IN_QUESTION_IDS as readonly string[]).includes(id);
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** The page's questions as stored, cleaned: malformed entries are dropped, not guessed. */
export function parseRsvpQuestions(value: unknown): RsvpQuestion[] {
  if (!Array.isArray(value)) return [];
  const questions: RsvpQuestion[] = [];
  const seen = new Set<string>();

  for (const raw of value) {
    const source = record(raw);
    if (!source || typeof source.id !== "string" || !ID_PATTERN.test(source.id) || seen.has(source.id)) continue;
    const id = source.id;
    const builtIn = isBuiltIn(id) ? BUILT_IN_SHAPE[id] : null;
    const kind = builtIn?.kind ?? (source.kind === "choice" || source.kind === "text" ? source.kind : null);
    if (!kind) continue;

    const options: RsvpQuestionOption[] = [];
    if (kind === "choice" && Array.isArray(source.options)) {
      const optionIds = new Set<string>();
      for (const rawOption of source.options) {
        const option = record(rawOption);
        const optionId = typeof option?.id === "string" ? option.id : "";
        const label = text(option?.label, QUESTION_LABEL_MAX_LENGTH);
        if (!ID_PATTERN.test(optionId) || !label || optionIds.has(optionId)) continue;
        optionIds.add(optionId);
        options.push({ id: optionId, label });
        if (options.length === MAX_QUESTION_OPTIONS) break;
      }
    }
    if (kind === "choice" && options.length === 0) continue;

    const label = text(source.label, QUESTION_LABEL_MAX_LENGTH);
    if (!label && !builtIn) continue;

    seen.add(id);
    questions.push({
      id,
      kind,
      label,
      options,
      per: builtIn?.per ?? (source.per === "invitation" ? "invitation" : "guest"),
      eventIds: Array.isArray(source.eventIds)
        ? [...new Set(source.eventIds.filter((eventId): eventId is string => typeof eventId === "string"))]
        : [],
    });
    if (questions.length === MAX_RSVP_QUESTIONS) break;
  }

  return questions;
}

export function questionLabel(question: RsvpQuestion, lang: Lang): string {
  if (question.label) return question.label;
  return isBuiltIn(question.id) ? BUILT_IN_LABELS[question.id][lang] : question.id;
}

/** A question is for whoever attends at least one of its events. */
export function appliesTo(question: RsvpQuestion, attendingEventIds: string[]): boolean {
  if (attendingEventIds.length === 0) return false;
  return question.eventIds.length === 0 || question.eventIds.some((id) => attendingEventIds.includes(id));
}

/**
 * The answers worth keeping: to questions of the right kind (per guest or per
 * invitation) that apply to these events, with an existing option or some text.
 */
export function cleanAnswers(
  raw: unknown,
  questions: RsvpQuestion[],
  per: "guest" | "invitation",
  attendingEventIds: string[],
): Record<string, string> {
  const source = record(raw);
  if (!source) return {};
  const answers: Record<string, string> = {};

  for (const question of questions) {
    if (question.per !== per || !appliesTo(question, attendingEventIds)) continue;
    const value = text(source[question.id], TEXT_ANSWER_MAX_LENGTH);
    if (!value) continue;
    if (question.kind === "choice" && !question.options.some((option) => option.id === value)) continue;
    answers[question.id] = value;
  }

  return answers;
}

/** The events a guest is marked as attending. */
export function eventsAttended(guest: Pick<Invitation["guests"][number], "attending">): string[] {
  return Object.entries(guest.attending)
    .filter(([, attending]) => attending)
    .map(([serviceId]) => serviceId);
}

/** Whether a question is asked at this event. */
export function forEvent(question: RsvpQuestion, serviceId: string): boolean {
  return question.eventIds.length === 0 || question.eventIds.includes(serviceId);
}

/**
 * For each choice question asked at this event, how many attending people
 * (or invitations, for a per-invitation question) picked each option. Only
 * answered invitations count; options that no longer exist are not counted.
 */
export function choiceCounts(
  invitations: Invitation[],
  questions: RsvpQuestion[],
  serviceId: string,
): Record<string, Record<string, number>> {
  const counts: Record<string, Record<string, number>> = {};

  for (const question of questions) {
    if (question.kind !== "choice" || !forEvent(question, serviceId)) continue;
    const tally = Object.fromEntries(question.options.map((option) => [option.id, 0]));

    for (const invitation of invitations) {
      if (!invitation.submittedAt) continue;
      const attending = invitation.guests.filter((guest) => guest.attending[serviceId]);
      const picks =
        question.per === "guest"
          ? attending.map((guest) => guest.answers?.[question.id])
          : attending.length > 0
            ? [invitation.answers?.[question.id]]
            : [];
      for (const pick of picks) {
        if (pick && pick in tally) tally[pick] += 1;
      }
    }

    counts[question.id] = tally;
  }

  return counts;
}
