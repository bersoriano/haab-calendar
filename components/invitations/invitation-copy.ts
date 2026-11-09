import type { Lang } from "@/lib/types";

/**
 * Words on the invitation page and on an invitation-only page. Kept beside
 * the components; the page's nouns (event, guest) still come from the word set.
 */
export type InvitationCopy = {
  greetingMany: string;
  greetingOne: string;
  scheduleTitle: string;
  openYourLink: string;
  guestsTitle: string;
  guestsHint: string;
  guestNameLabel: string;
  guestNamePlaceholder: string;
  addGuest: string;
  removeGuest: string;
  seatLimit: string;
  whoIsComing: string;
  cannotAttend: string;
  contactTitle: string;
  contactHint: string;
  phoneLabel: string;
  emailLabel: string;
  submit: string;
  answerEveryEvent: string;
  submitting: string;
  saved: string;
  savedBody: string;
  attendingCount: string;
  attendingCountOne: string;
  notAttending: string;
  changeAnswer: string;
  offline: string;
  failed: string;
  invalidTitle: string;
  invalidBody: string;
  where: string;
  answerBy: string;
  closed: string;
  closedContactPhone: string;
  closedContact: string;
  rsvpBy: string;
  questionsTitle: string;
  questionsHint: string;
  choose: string;
  forHousehold: string;
  goodToKnow: string;
};

export const invitationCopy: Record<Lang, InvitationCopy> = {
  en: {
    greetingMany: "{name}, we saved {seats} seats for you.",
    greetingOne: "{name}, we saved a seat for you.",
    scheduleTitle: "The celebration",
    openYourLink: "To RSVP, open the personal link you were sent.",
    guestsTitle: "Who's on your invitation",
    guestsHint: "Correct a name or add the people coming with you.",
    guestNameLabel: "Guest {n}",
    guestNamePlaceholder: "Full name",
    addGuest: "+ Add a guest",
    removeGuest: "Remove {name}",
    seatLimit: "Your invitation is for {seats}.",
    whoIsComing: "Who's coming?",
    cannotAttend: "We can't make it",
    contactTitle: "How can we reach you?",
    contactHint: "Optional. Only the organizers see it.",
    phoneLabel: "Phone or WhatsApp",
    emailLabel: "Email",
    submit: "Send my RSVP",
    answerEveryEvent: "Tick who is coming to each event, or that you can't make it.",
    submitting: "Sending…",
    saved: "Thank you! We got your RSVP.",
    savedBody: "You can change it from this same link.",
    attendingCount: "{count} attending",
    attendingCountOne: "1 attending",
    notAttending: "Not attending",
    changeAnswer: "Change my answer",
    offline: "You're offline. Your answer is still here; try again when you're connected.",
    failed: "We couldn't save your RSVP. Please try again.",
    invalidTitle: "This invitation link is not valid",
    invalidBody: "Ask the person who invited you for yours.",
    where: "Where",
    answerBy: "Please answer by {date}.",
    closed: "Answers closed on {date}.",
    closedContactPhone: "To change your answer, contact the organizers at {phone}.",
    closedContact: "To change your answer, contact the organizers.",
    rsvpBy: "Please RSVP by {date}.",
    questionsTitle: "A few details",
    questionsHint: "For the people coming.",
    choose: "Choose…",
    forHousehold: "For your household",
    goodToKnow: "Good to know",
  },
  es: {
    greetingMany: "{name}, guardamos {seats} lugares para ustedes.",
    greetingOne: "{name}, guardamos un lugar para usted.",
    scheduleTitle: "La celebración",
    openYourLink: "Para confirmar, abra el enlace personal que le enviaron.",
    guestsTitle: "Quiénes vienen en su invitación",
    guestsHint: "Corrija un nombre o agregue a quienes le acompañan.",
    guestNameLabel: "Invitado {n}",
    guestNamePlaceholder: "Nombre completo",
    addGuest: "+ Agregar invitado",
    removeGuest: "Quitar a {name}",
    seatLimit: "Su invitación es para {seats}.",
    whoIsComing: "¿Quién viene?",
    cannotAttend: "No podremos asistir",
    contactTitle: "¿Cómo le contactamos?",
    contactHint: "Opcional. Solo lo ven los organizadores.",
    phoneLabel: "Teléfono o WhatsApp",
    emailLabel: "Correo electrónico",
    submit: "Enviar confirmación",
    answerEveryEvent: "Marque quién viene a cada evento, o que no podrán asistir.",
    submitting: "Enviando…",
    saved: "¡Gracias! Recibimos su confirmación.",
    savedBody: "Puede cambiarla desde este mismo enlace.",
    attendingCount: "{count} asistirán",
    attendingCountOne: "1 asistirá",
    notAttending: "No asistirán",
    changeAnswer: "Cambiar mi respuesta",
    offline: "Sin conexión. Su respuesta sigue aquí; intente de nuevo cuando tenga conexión.",
    failed: "No pudimos guardar su confirmación. Intente de nuevo.",
    invalidTitle: "Este enlace de invitación no es válido",
    invalidBody: "Pídale el suyo a quien le invitó.",
    where: "Dónde",
    answerBy: "Por favor responda a más tardar el {date}.",
    closed: "Las respuestas cerraron el {date}.",
    closedContactPhone: "Para cambiar su respuesta, contacte a los organizadores al {phone}.",
    closedContact: "Para cambiar su respuesta, contacte a los organizadores.",
    rsvpBy: "Por favor confirme a más tardar el {date}.",
    questionsTitle: "Unos detalles",
    questionsHint: "Para quienes vienen.",
    choose: "Elija…",
    forHousehold: "Para su familia",
    goodToKnow: "Para tener en cuenta",
  },
};

export function fillCopy(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
