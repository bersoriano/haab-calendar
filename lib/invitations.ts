import { buildProviderPath } from "./public-url";
import { cleanAnswers, type RsvpQuestion } from "./rsvp-questions";
import { clampInvitationSeats, INVITATION_SEAT_LIMIT_MAX } from "./rsvp-mode";
import type { Lang, VerticalId } from "./types";

/**
 * Invitation-only RSVPs: a household's invitation, its guests and their
 * answers, and the rules that hold whichever side (planner or household) is
 * writing. Pure, so the API, the dashboard and the invitation page share them.
 * See docs/superpowers/specs/2026-11-08-wedding-rsvp-design.md.
 */

export type InvitationGuest = {
  id: string;
  name: string;
  position: number;
  /** service id → attending. Missing means not attending. */
  attending: Record<string, boolean>;
  /** question id → option id or text. See lib/rsvp-questions.ts. */
  answers?: Record<string, string>;
  /** service id → table id, for the events this guest is seated at. */
  tables?: Record<string, string>;
  /** service id → when this guest was checked in at the door. */
  checkedIn?: Record<string, string>;
};

export type Invitation = {
  id: string;
  displayName: string;
  contactPhone: string;
  contactEmail: string;
  seatLimit: number;
  token: string;
  notes: string;
  eventIds: string[];
  guests: InvitationGuest[];
  submittedAt: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Answers to per-invitation questions (the shuttle hotel, say). */
  answers?: Record<string, string>;
};

export type ResponseState = "no_answer" | "attending" | "declined";

export const GUEST_NAME_MAX_LENGTH = 120;
export const DISPLAY_NAME_MAX_LENGTH = 120;
export const CONTACT_PHONE_MAX_LENGTH = 40;
export const CONTACT_EMAIL_MAX_LENGTH = 254;
export const INVITATION_NOTES_MAX_LENGTH = 1000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function isWellFormedInvitationToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

export function isValidContactEmail(email: string): boolean {
  return email === "" || (email.length <= CONTACT_EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(email));
}

/** Where a household opens its invitation, under the page it belongs to. */
export function invitationPath(vertical: VerticalId, providerSlug: string, token: string): string {
  return `${buildProviderPath(vertical, providerSlug)}/i/${token}`;
}

/**
 * One invitation's answer for one event. Null when the invitation does not
 * cover the event. Until the household submits, it is "no answer" whatever the
 * planner may have ticked on its behalf.
 */
export function responseState(invitation: Invitation, serviceId: string): ResponseState | null {
  if (!invitation.eventIds.includes(serviceId)) return null;
  if (!invitation.submittedAt) return "no_answer";
  return invitation.guests.some((guest) => guest.attending[serviceId]) ? "attending" : "declined";
}

/** The invitation as a whole: "partial" when it attends some events only. */
export function overallState(invitation: Invitation): ResponseState | "partial" {
  if (!invitation.submittedAt) return "no_answer";

  const states = invitation.eventIds.map((serviceId) => responseState(invitation, serviceId));
  if (states.length === 0 || states.every((state) => state === "declined")) return "declined";
  if (states.every((state) => state === "attending")) return "attending";
  return "partial";
}

export type EventTotals = {
  serviceId: string;
  attendingPeople: number;
  attendingInvitations: number;
  declinedInvitations: number;
  noAnswerInvitations: number;
  invitedInvitations: number;
};

/** Per event, in the order given: who is coming, who said no, who is silent. */
export function totalsByEvent(invitations: Invitation[], serviceIds: string[]): EventTotals[] {
  return serviceIds.map((serviceId) => {
    const totals: EventTotals = {
      serviceId,
      attendingPeople: 0,
      attendingInvitations: 0,
      declinedInvitations: 0,
      noAnswerInvitations: 0,
      invitedInvitations: 0,
    };

    for (const invitation of invitations) {
      const state = responseState(invitation, serviceId);
      if (!state) continue;

      totals.invitedInvitations += 1;
      if (state === "no_answer") totals.noAnswerInvitations += 1;
      if (state === "declined") totals.declinedInvitations += 1;
      if (state === "attending") {
        totals.attendingInvitations += 1;
        totals.attendingPeople += invitation.guests.filter((guest) => guest.attending[serviceId]).length;
      }
    }

    return totals;
  });
}

const GUEST_WORDS: Record<Lang, { of: string; numbered: string }> = {
  en: { of: "Guest of {name}", numbered: "Guest {n}" },
  es: { of: "Acompañante de {name}", numbered: "Invitado {n}" },
};

/**
 * How to call a guest: their name, or, for a companion nobody has named yet,
 * "Guest of Ana" after the first named guest, or "Guest 2" when no one is named.
 */
export function guestLabel(
  guest: { name: string },
  index: number,
  guests: { name: string }[],
  lang: Lang,
): string {
  const name = guest.name.trim();
  if (name) return name;

  const named = guests.find((other) => other.name.trim());
  const words = GUEST_WORDS[lang];
  return named
    ? words.of.replace("{name}", named.name.trim())
    : words.numbered.replace("{n}", String(index + 1));
}

// ---------------------------------------------------------------------------
// Pasting a guest list from a spreadsheet

export type PastedRow = {
  displayName: string;
  contactPhone: string;
  contactEmail: string;
  seatLimit: number;
};

export type PasteError = { line: number; reason: "missing_name" | "bad_seats" | "bad_email" };
export type PasteResult = { rows: PastedRow[]; errors: PasteError[] };

type Column = "name" | "phone" | "email" | "seats";

// Whole-cell matches only, so a guest called "Familia Ortiz" is never a header.
const HEADER_WORDS: Array<[Column, RegExp]> = [
  ["email", /^(correo( electronico)?|e-?mail|mail)$/],
  ["phone", /^(tel|telefono|phone|phone number|whatsapp|celular|movil|cel)$/],
  ["seats", /^(lugares|seats|personas|pases|asientos|guests|cupo|no\.? de personas|numero de personas)$/],
  ["name", /^(nombre|nombres|name|names|nombre completo|full name|invitacion|invitation|familia|family)$/],
];

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function splitCells(line: string): string[] {
  const separator = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
  return line.split(separator).map((cell) => cell.trim());
}

/**
 * A header names columns and holds no data: every filled cell is a column word,
 * none has a digit or an @, and one of them is the name. "Familia Ortiz, +52…"
 * is a guest, not a header.
 */
function headerColumns(cells: string[]): Column[] | null {
  const folded = cells.map(fold);
  const filled = folded.filter(Boolean);
  const columns = folded.map((cell) => HEADER_WORDS.find(([, pattern]) => pattern.test(cell))?.[0]);

  const isHeader =
    filled.length > 0 &&
    filled.every((cell) => !/[\d@]/.test(cell) && cell.split(/\s+/).length <= 3) &&
    folded.every((cell, index) => !cell || columns[index]) &&
    columns.includes("name");

  return isHeader ? columns.map((column) => column ?? ("ignore" as Column)) : null;
}

const POSITIONAL: Column[] = ["name", "phone", "email", "seats"];

/**
 * Rows pasted from a spreadsheet or typed one per line. A first row naming its
 * columns ("Nombre, WhatsApp, Lugares") sets their order; without one the order
 * is name, phone, email, seats, and a cell with an @ is the email wherever it
 * sits. Blank lines are skipped. Each bad line is reported once, by its number.
 */
export function parseGuestPaste(text: string, defaultSeats: number): PasteResult {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const result: PasteResult = { rows: [], errors: [] };
  let columns: Column[] | null = null;
  let sawFirst = false;

  lines.forEach((raw, index) => {
    const lineNumber = index + 1;
    if (!raw.trim()) return;

    const cells = splitCells(raw);
    if (!sawFirst) {
      sawFirst = true;
      columns = headerColumns(cells);
      if (columns) return;
    }

    const values: Record<Column, string> = { name: "", phone: "", email: "", seats: "" };
    const order = columns ?? POSITIONAL;
    cells.forEach((cell, position) => {
      const column = order[position];
      if (column && column in values && !values[column]) values[column] = cell;
    });

    if (!columns) {
      const emailCell = cells.find((cell) => cell.includes("@"));
      if (emailCell && values.email !== emailCell) {
        for (const column of ["name", "phone", "seats"] as const) {
          if (values[column] === emailCell) values[column] = "";
        }
        values.email = emailCell;
      }
    }

    const displayName = values.name.slice(0, DISPLAY_NAME_MAX_LENGTH);
    if (!displayName) {
      result.errors.push({ line: lineNumber, reason: "missing_name" });
      return;
    }

    let seatLimit = clampInvitationSeats(defaultSeats);
    if (values.seats) {
      const seats = Number(values.seats);
      if (!/^\d+$/.test(values.seats) || seats < 1 || seats > INVITATION_SEAT_LIMIT_MAX) {
        result.errors.push({ line: lineNumber, reason: "bad_seats" });
        return;
      }
      seatLimit = seats;
    }

    if (!isValidContactEmail(values.email)) {
      result.errors.push({ line: lineNumber, reason: "bad_email" });
      return;
    }

    result.rows.push({
      displayName,
      contactPhone: values.phone.slice(0, CONTACT_PHONE_MAX_LENGTH),
      contactEmail: values.email,
      seatLimit,
    });
  });

  return result;
}

// ---------------------------------------------------------------------------
// A household's answer

export type RsvpSubmission = {
  guests: { id?: string; name: string }[];
  /** service id → whether guests[i] attends. One entry per invited event. */
  attendance: Record<string, boolean[]>;
  contactPhone?: string;
  contactEmail?: string;
  /** Answers to per-guest questions, aligned with `guests`. Absent leaves them as they are. */
  guestAnswers?: Record<string, string>[];
  /** Answers to per-invitation questions. Absent leaves them as they are. */
  answers?: Record<string, string>;
};

export type RsvpRejection =
  | "too_many_guests"
  | "unknown_event"
  | "unknown_guest"
  | "bad_attendance"
  | "name_too_long"
  | "bad_contact";

export type RsvpValidation = { ok: true; value: RsvpSubmission } | { ok: false; reason: RsvpRejection };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Checks an answer against the invitation it is for. The guests replace the
 * invitation's list in order; a guest with an id must already be on it. Events
 * left out of `attendance` count as not attending. Nobody attending anything is
 * a valid answer.
 */
export function validateRsvpSubmission(
  input: unknown,
  invitation: { seatLimit: number; eventIds: string[]; guests: { id: string }[] },
  questions: RsvpQuestion[] = [],
): RsvpValidation {
  if (!isRecord(input) || !Array.isArray(input.guests) || (input.attendance !== undefined && !isRecord(input.attendance))) {
    return { ok: false, reason: "bad_attendance" };
  }

  if (input.guests.length > invitation.seatLimit) return { ok: false, reason: "too_many_guests" };

  const knownGuestIds = new Set(invitation.guests.map((guest) => guest.id));
  const guests: RsvpSubmission["guests"] = [];

  for (const raw of input.guests) {
    if (!isRecord(raw) || typeof raw.name !== "string") return { ok: false, reason: "bad_attendance" };
    const name = raw.name.trim();
    if (name.length > GUEST_NAME_MAX_LENGTH) return { ok: false, reason: "name_too_long" };

    if (raw.id !== undefined) {
      if (typeof raw.id !== "string" || !knownGuestIds.has(raw.id)) return { ok: false, reason: "unknown_guest" };
      guests.push({ id: raw.id, name });
    } else {
      guests.push({ name });
    }
  }

  const rawAttendance = (input.attendance ?? {}) as Record<string, unknown>;
  for (const serviceId of Object.keys(rawAttendance)) {
    if (!invitation.eventIds.includes(serviceId)) return { ok: false, reason: "unknown_event" };
  }

  const attendance: Record<string, boolean[]> = {};
  for (const serviceId of invitation.eventIds) {
    const answers = rawAttendance[serviceId];
    if (answers === undefined) {
      attendance[serviceId] = guests.map(() => false);
      continue;
    }
    if (
      !Array.isArray(answers) ||
      answers.length !== guests.length ||
      answers.some((answer) => typeof answer !== "boolean")
    ) {
      return { ok: false, reason: "bad_attendance" };
    }
    attendance[serviceId] = answers as boolean[];
  }

  const contactPhone = typeof input.contactPhone === "string" ? input.contactPhone.trim() : undefined;
  const contactEmail = typeof input.contactEmail === "string" ? input.contactEmail.trim() : undefined;
  if (
    (contactPhone !== undefined && contactPhone.length > CONTACT_PHONE_MAX_LENGTH) ||
    (contactEmail !== undefined && !isValidContactEmail(contactEmail))
  ) {
    return { ok: false, reason: "bad_contact" };
  }

  const value: RsvpSubmission = { guests, attendance, contactPhone, contactEmail };

  // Answers are kept only for questions that apply to what each person attends.
  const attendedBy = guests.map((_, index) =>
    invitation.eventIds.filter((serviceId) => attendance[serviceId][index]),
  );
  if (input.guestAnswers !== undefined) {
    if (!Array.isArray(input.guestAnswers) || input.guestAnswers.length !== guests.length) {
      return { ok: false, reason: "bad_attendance" };
    }
    value.guestAnswers = input.guestAnswers.map((raw, index) =>
      cleanAnswers(raw, questions, "guest", attendedBy[index]),
    );
  }
  if (input.answers !== undefined) {
    value.answers = cleanAnswers(input.answers, questions, "invitation", [...new Set(attendedBy.flat())]);
  }

  return { ok: true, value };
}
