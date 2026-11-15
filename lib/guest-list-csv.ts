import { csvCell, UTF8_BOM } from "./csv";
import { guestLabel, type Invitation } from "./invitations";
import { forEvent, questionLabel, type RsvpQuestion } from "./rsvp-questions";
import type { Lang } from "./types";

const CSV_HEADERS: Record<Lang, string[]> = {
  en: ["Invitation", "Guest", "Phone", "Email"],
  es: ["Invitación", "Invitado", "Teléfono", "Correo"],
};
const REMOVED: Record<Lang, string> = { en: "removed", es: "eliminada" };

function answerText(question: RsvpQuestion, value: string | undefined, lang: Lang) {
  if (!value) return "";
  if (question.kind !== "choice") return value;
  return question.options.find((option) => option.id === value)?.label ?? `${value} (${REMOVED[lang]})`;
}

/**
 * Everyone attending one event, one row per person, with the answers to the
 * questions asked there: the file a caterer or venue asks for. Formula-safe.
 */
export function toGuestListCsv(input: {
  invitations: Invitation[];
  questions: RsvpQuestion[];
  serviceId: string;
  lang: Lang;
}): string {
  const questions = input.questions.filter((question) => forEvent(question, input.serviceId));
  const header = [...CSV_HEADERS[input.lang], ...questions.map((question) => questionLabel(question, input.lang))];
  const rows: string[] = [];

  for (const invitation of input.invitations) {
    if (!invitation.submittedAt) continue;
    invitation.guests.forEach((guest, index) => {
      if (!guest.attending[input.serviceId]) return;
      const cells = [
        invitation.displayName,
        guestLabel(guest, index, invitation.guests, input.lang),
        invitation.contactPhone,
        invitation.contactEmail,
        ...questions.map((question) =>
          answerText(
            question,
            question.per === "guest" ? guest.answers?.[question.id] : invitation.answers?.[question.id],
            input.lang,
          ),
        ),
      ];
      rows.push(cells.map(csvCell).join(","));
    });
  }

  return `${UTF8_BOM}${[header.map(csvCell).join(","), ...rows].join("\r\n")}\r\n`;
}
