import { formatRsvpDeadline } from "./rsvp-deadline";
import type { Lang } from "./types";

/**
 * The words a planner sends with a household's link, by WhatsApp or email.
 * Plain text, in the page's language; no wedding words, so a gala can use it.
 */

export type InvitationMessageInput = {
  lang: Lang;
  kind: "invite" | "reminder";
  displayName: string;
  pageName: string;
  link: string;
  deadline?: string;
};

const WORDS: Record<
  Lang,
  { greeting: string; invite: string; reminder: string; by: string; open: string; subjectInvite: string; subjectReminder: string }
> = {
  en: {
    greeting: "Hello, {name}:",
    invite: "You're invited to {page}. Please tell us who is coming",
    reminder: "We haven't heard from you yet about {page}. Please tell us who is coming",
    by: " by {date}",
    open: "Your personal invitation:",
    subjectInvite: "Your invitation: {page}",
    subjectReminder: "Reminder: please RSVP to {page}",
  },
  es: {
    greeting: "Hola, {name}:",
    invite: "Les invitamos a {page}. Por favor confírmennos quiénes vienen",
    reminder: "Aún no recibimos su respuesta para {page}. Por favor confírmennos quiénes vienen",
    by: " a más tardar el {date}",
    open: "Su invitación personal:",
    subjectInvite: "Su invitación: {page}",
    subjectReminder: "Recordatorio: confirme su asistencia a {page}",
  },
};

export function buildInvitationMessage(input: InvitationMessageInput): string {
  const words = WORDS[input.lang] ?? WORDS.en;
  const ask = (input.kind === "invite" ? words.invite : words.reminder).replace("{page}", input.pageName);
  const by = input.deadline ? words.by.replace("{date}", formatRsvpDeadline(input.deadline, input.lang)) : "";

  return [
    words.greeting.replace("{name}", input.displayName),
    "",
    `${ask}${by}.`,
    "",
    words.open,
    input.link,
  ].join("\n");
}

export function buildInvitationEmail(input: InvitationMessageInput): { subject: string; text: string } {
  const words = WORDS[input.lang] ?? WORDS.en;
  const subject = (input.kind === "invite" ? words.subjectInvite : words.subjectReminder).replace(
    "{page}",
    input.pageName,
  );
  return { subject, text: buildInvitationMessage(input) };
}

/**
 * A WhatsApp link that opens a chat with the household and the message ready.
 * Without a phone, WhatsApp asks the planner which contact to send it to.
 */
export function whatsappUrl(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
