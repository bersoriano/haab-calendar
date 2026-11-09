import type { Lang } from "@/lib/types";

/**
 * Copy for the guest list section. Nouns for people and events come from the
 * page's word set ({clients}, {services}), so a gala reads "attendees".
 */
export type GuestsCopy = {
  previewTitle: string;
  previewBody: string;
  modeOff: string;
  loading: string;
  loadFailed: string;
  retry: string;
  offlineBanner: string;
  totalsTitle: string;
  totalsBody: string;
  confirmedPeople: string;
  ofCapacity: string;
  overCapacity: string;
  attendingInvitations: string;
  declinedInvitations: string;
  noAnswerInvitations: string;
  recentTitle: string;
  recentEmpty: string;
  listTitle: string;
  listBody: string;
  emptyTitle: string;
  emptyBody: string;
  noEventsWarning: string;
  addInvitation: string;
  pasteList: string;
  deleteAll: string;
  search: string;
  searchPlaceholder: string;
  filterLabel: string;
  filters: { all: string; no_answer: string; attending: string; partial: string; declined: string; not_contacted: string };
  deadlineOpen: string;
  deadlineClosed: string;
  contactedOn: string;
  whatsappLabel: string;
  emailLabel: string;
  noEmail: string;
  emailSent: string;
  emailFailed: string;
  remindAll: string;
  remindAllTitle: string;
  remindAllBody: string;
  remindAllBodyOne: string;
  remindAllConfirm: string;
  remindersSent: string;
  remindersSentOne: string;
  remindersNone: string;
  remindFailed: string;
  noMatches: string;
  columns: { invitation: string; seats: string; answers: string; actions: string };
  states: { no_answer: string; attending: string; declined: string; partial: string };
  seatsValue: string;
  seatsValueOne: string;
  attendingValue: string;
  copyLink: string;
  linkCopied: string;
  copyFailed: string;
  edit: string;
  editLabel: string;
  deleteLabel: string;
  deleteTitle: string;
  deleteBody: string;
  deleteConfirm: string;
  keep: string;
  deleted: string;
  deleteFailed: string;
  deleteAllTitle: string;
  deleteAllBody: string;
  deleteAllTypeLabel: string;
  deleteAllWord: string;
  deleteAllConfirm: string;
  deletedAll: string;
  editor: {
    newTitle: string;
    editTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    phoneLabel: string;
    emailLabel: string;
    seatsLabel: string;
    seatsHint: string;
    eventsLabel: string;
    notesLabel: string;
    notesHint: string;
    guestsLabel: string;
    guestsHint: string;
    guestPlaceholder: string;
    guestNumber: string;
    addGuest: string;
    removeGuest: string;
    answersLabel: string;
    answersHint: string;
    answered: string;
    answeredHint: string;
    linkLabel: string;
    newLink: string;
    newLinkDone: string;
    save: string;
    cancel: string;
    saved: string;
    created: string;
    saveFailed: string;
    nameRequired: string;
  };
  paste: {
    title: string;
    body: string;
    textLabel: string;
    textPlaceholder: string;
    seatsLabel: string;
    eventsLabel: string;
    previewTitle: string;
    previewTitleOne: string;
    previewEmpty: string;
    errorsTitle: string;
    errorsTitleOne: string;
    reasons: { missing_name: string; bad_seats: string; bad_email: string };
    lineLabel: string;
    importLabel: string;
    importLabelOne: string;
    imported: string;
    importedOne: string;
    importFailed: string;
    cancel: string;
  };
};

export const guestsCopy: Record<Lang, GuestsCopy> = {
  en: {
    previewTitle: "Your guest list needs a published page",
    previewBody: "Publish your page with an account to invite households and collect their answers here.",
    modeOff: "Turn on invitation-only RSVPs in Settings to keep a guest list here.",
    loading: "Loading your guest list…",
    loadFailed: "Your guest list didn't load.",
    retry: "Try again",
    offlineBanner: "Offline: showing the list saved on {date}. Changes come back when you're connected.",
    totalsTitle: "Answers per {service}",
    totalsBody: "Confirmed people, and households that said no or haven't answered.",
    confirmedPeople: "confirmed",
    ofCapacity: "of {max}",
    overCapacity: "More people confirmed than the {max} seats this {service} has.",
    attendingInvitations: "{count} attending",
    declinedInvitations: "{count} declined",
    noAnswerInvitations: "{count} no answer",
    recentTitle: "Latest answers",
    recentEmpty: "No answers yet. They show up here as households reply.",
    listTitle: "Invitations",
    listBody: "One per household. Each has its own link and a limit of seats.",
    emptyTitle: "No invitations yet",
    emptyBody: "Add households one by one, or paste your list from a spreadsheet.",
    noEventsWarning: "Invitations need at least one {service} to answer. Add one first.",
    addInvitation: "Add invitation",
    pasteList: "Paste a list",
    deleteAll: "Delete all",
    search: "Search",
    searchPlaceholder: "Name, phone or email",
    filterLabel: "Show",
    filters: {
      all: "All",
      no_answer: "No answer",
      attending: "Attending",
      partial: "Some events",
      declined: "Declined",
      not_contacted: "Not sent",
    },
    deadlineOpen: "Answers close on {date}. {count} households haven't answered yet.",
    deadlineClosed: "Answers closed on {date}. You can still edit any invitation.",
    contactedOn: "Link sent {date}",
    whatsappLabel: "Send {name} the link by WhatsApp",
    emailLabel: "Email {name} the link",
    noEmail: "{name} has no email address",
    emailSent: "Email sent to {name}",
    emailFailed: "Couldn't send that email. Try again.",
    remindAll: "Remind by email ({count})",
    remindAllTitle: "Email a reminder to every household that hasn't answered?",
    remindAllBody: "{count} households with an email address will get their link again. Reminders can go out once a day.",
    remindAllBodyOne: "1 household with an email address will get its link again. Reminders can go out once a day.",
    remindAllConfirm: "Send reminders",
    remindersSent: "Reminders sent to {count} households",
    remindersSentOne: "Reminder sent to 1 household",
    remindersNone: "Everyone with an email address has answered.",
    remindFailed: "Couldn't send the reminders. Try again.",
    noMatches: "No invitations match.",
    columns: { invitation: "Invitation", seats: "Seats", answers: "Answers", actions: "Actions" },
    states: { no_answer: "No answer", attending: "Attending", declined: "Declined", partial: "Some events" },
    seatsValue: "{count} seats",
    seatsValueOne: "1 seat",
    attendingValue: "{count} of {seats} coming",
    copyLink: "Copy link",
    linkCopied: "Invitation link copied",
    copyFailed: "Couldn't copy. Open the invitation and copy the link from there.",
    edit: "Edit",
    editLabel: "Edit {name}",
    deleteLabel: "Delete {name}",
    deleteTitle: "Delete {name}?",
    deleteBody: "Their link stops working and their answers are removed.",
    deleteConfirm: "Delete invitation",
    keep: "Keep it",
    deleted: "Invitation deleted",
    deleteFailed: "Couldn't delete that invitation. Try again.",
    deleteAllTitle: "Delete the whole guest list?",
    deleteAllBody: "Every link stops working and every answer is removed. This can't be undone.",
    deleteAllTypeLabel: "Type {word} to confirm",
    deleteAllWord: "DELETE",
    deleteAllConfirm: "Delete everything",
    deletedAll: "Guest list deleted",
    editor: {
      newTitle: "New invitation",
      editTitle: "Edit invitation",
      nameLabel: "Name on the invitation",
      namePlaceholder: "The Ortiz family",
      phoneLabel: "Phone or WhatsApp",
      emailLabel: "Email",
      seatsLabel: "Seats",
      seatsHint: "The most people this household can bring, themselves included.",
      eventsLabel: "Invited to",
      notesLabel: "Notes",
      notesHint: "Only you see these.",
      guestsLabel: "Guests",
      guestsHint: "Optional. The household can fill in or correct names when they answer.",
      guestPlaceholder: "Full name",
      guestNumber: "Guest {n}",
      addGuest: "+ Add guest",
      removeGuest: "Remove {name}",
      answersLabel: "Who's coming",
      answersHint: "For an answer given by phone or in person.",
      answered: "They answered",
      answeredHint: "Counts their ticks as an answer, even if they never opened the link.",
      linkLabel: "Invitation link",
      newLink: "Make a new link",
      newLinkDone: "New link made. The old one no longer works.",
      save: "Save",
      cancel: "Cancel",
      saved: "Invitation saved",
      created: "Invitation added",
      saveFailed: "Couldn't save the invitation. Try again.",
      nameRequired: "Give the invitation a name.",
    },
    paste: {
      title: "Paste a guest list",
      body: "One household per line: name, phone, email, seats. Copy the columns straight from a spreadsheet; a header row in English or Spanish sets their order.",
      textLabel: "Your list",
      textPlaceholder: "Name\tWhatsApp\tEmail\tSeats\nThe Ortiz family\t+52 777 555 0101\tana@example.com\t4",
      seatsLabel: "Seats when a line doesn't say",
      eventsLabel: "Invite them to",
      previewTitle: "{count} invitations ready",
      previewTitleOne: "1 invitation ready",
      previewEmpty: "Nothing to add yet.",
      errorsTitle: "{count} lines need a fix",
      errorsTitleOne: "1 line needs a fix",
      reasons: {
        missing_name: "no name",
        bad_seats: "seats must be a whole number from 1 to 20",
        bad_email: "the email doesn't look right",
      },
      lineLabel: "Line {line}",
      importLabel: "Add {count} invitations",
      importLabelOne: "Add 1 invitation",
      imported: "{count} invitations added",
      importedOne: "1 invitation added",
      importFailed: "Couldn't add those invitations. Nothing was saved; try again.",
      cancel: "Cancel",
    },
  },
  es: {
    previewTitle: "Su lista de invitados necesita una página publicada",
    previewBody: "Publique su página con una cuenta para invitar familias y recibir aquí sus respuestas.",
    modeOff: "Active las confirmaciones solo por invitación en Configuración para tener aquí una lista de invitados.",
    loading: "Cargando su lista de invitados…",
    loadFailed: "No se cargó su lista de invitados.",
    retry: "Intentar de nuevo",
    offlineBanner: "Sin conexión: mostrando la lista guardada el {date}. Los cambios vuelven al recuperar la conexión.",
    totalsTitle: "Respuestas por {service}",
    totalsBody: "Personas confirmadas, y familias que dijeron que no o que no han respondido.",
    confirmedPeople: "confirmados",
    ofCapacity: "de {max}",
    overCapacity: "Hay más personas confirmadas que los {max} lugares de este {service}.",
    attendingInvitations: "{count} asistirán",
    declinedInvitations: "{count} no asistirán",
    noAnswerInvitations: "{count} sin respuesta",
    recentTitle: "Últimas respuestas",
    recentEmpty: "Aún no hay respuestas. Aparecen aquí conforme las familias responden.",
    listTitle: "Invitaciones",
    listBody: "Una por familia. Cada una tiene su propio enlace y un límite de lugares.",
    emptyTitle: "Aún no hay invitaciones",
    emptyBody: "Agregue familias una por una, o pegue su lista desde una hoja de cálculo.",
    noEventsWarning: "Las invitaciones necesitan al menos un {service} que responder. Agregue uno primero.",
    addInvitation: "Agregar invitación",
    pasteList: "Pegar una lista",
    deleteAll: "Borrar todo",
    search: "Buscar",
    searchPlaceholder: "Nombre, teléfono o correo",
    filterLabel: "Mostrar",
    filters: {
      all: "Todas",
      no_answer: "Sin respuesta",
      attending: "Asistirán",
      partial: "Algunos eventos",
      declined: "No asistirán",
      not_contacted: "Sin enviar",
    },
    deadlineOpen: "Las respuestas cierran el {date}. {count} familias aún no han respondido.",
    deadlineClosed: "Las respuestas cerraron el {date}. Aún puede editar cualquier invitación.",
    contactedOn: "Enlace enviado el {date}",
    whatsappLabel: "Enviar el enlace a {name} por WhatsApp",
    emailLabel: "Enviar el enlace a {name} por correo",
    noEmail: "{name} no tiene correo electrónico",
    emailSent: "Correo enviado a {name}",
    emailFailed: "No se pudo enviar el correo. Intente de nuevo.",
    remindAll: "Recordar por correo ({count})",
    remindAllTitle: "¿Enviar un recordatorio a todas las familias que no han respondido?",
    remindAllBody: "{count} familias con correo recibirán su enlace de nuevo. Los recordatorios pueden enviarse una vez al día.",
    remindAllBodyOne: "1 familia con correo recibirá su enlace de nuevo. Los recordatorios pueden enviarse una vez al día.",
    remindAllConfirm: "Enviar recordatorios",
    remindersSent: "Recordatorios enviados a {count} familias",
    remindersSentOne: "Recordatorio enviado a 1 familia",
    remindersNone: "Todas las familias con correo ya respondieron.",
    remindFailed: "No se pudieron enviar los recordatorios. Intente de nuevo.",
    noMatches: "Ninguna invitación coincide.",
    columns: { invitation: "Invitación", seats: "Lugares", answers: "Respuestas", actions: "Acciones" },
    states: { no_answer: "Sin respuesta", attending: "Asistirán", declined: "No asistirán", partial: "Algunos eventos" },
    seatsValue: "{count} lugares",
    seatsValueOne: "1 lugar",
    attendingValue: "{count} de {seats} vienen",
    copyLink: "Copiar enlace",
    linkCopied: "Enlace de invitación copiado",
    copyFailed: "No se pudo copiar. Abra la invitación y copie el enlace desde ahí.",
    edit: "Editar",
    editLabel: "Editar {name}",
    deleteLabel: "Borrar {name}",
    deleteTitle: "¿Borrar {name}?",
    deleteBody: "Su enlace deja de funcionar y se borran sus respuestas.",
    deleteConfirm: "Borrar invitación",
    keep: "Conservarla",
    deleted: "Invitación borrada",
    deleteFailed: "No se pudo borrar la invitación. Intente de nuevo.",
    deleteAllTitle: "¿Borrar toda la lista de invitados?",
    deleteAllBody: "Todos los enlaces dejan de funcionar y se borran todas las respuestas. No se puede deshacer.",
    deleteAllTypeLabel: "Escriba {word} para confirmar",
    deleteAllWord: "BORRAR",
    deleteAllConfirm: "Borrar todo",
    deletedAll: "Lista de invitados borrada",
    editor: {
      newTitle: "Nueva invitación",
      editTitle: "Editar invitación",
      nameLabel: "Nombre en la invitación",
      namePlaceholder: "Familia Ortiz",
      phoneLabel: "Teléfono o WhatsApp",
      emailLabel: "Correo electrónico",
      seatsLabel: "Lugares",
      seatsHint: "Las personas que esta familia puede traer, incluidas ellas mismas.",
      eventsLabel: "Invitados a",
      notesLabel: "Notas",
      notesHint: "Solo usted las ve.",
      guestsLabel: "Invitados",
      guestsHint: "Opcional. La familia puede completar o corregir los nombres al responder.",
      guestPlaceholder: "Nombre completo",
      guestNumber: "Invitado {n}",
      addGuest: "+ Agregar invitado",
      removeGuest: "Quitar a {name}",
      answersLabel: "Quién viene",
      answersHint: "Para una respuesta que le dieron por teléfono o en persona.",
      answered: "Ya respondieron",
      answeredHint: "Cuenta lo marcado como su respuesta, aunque nunca hayan abierto el enlace.",
      linkLabel: "Enlace de la invitación",
      newLink: "Crear un enlace nuevo",
      newLinkDone: "Enlace nuevo creado. El anterior ya no funciona.",
      save: "Guardar",
      cancel: "Cancelar",
      saved: "Invitación guardada",
      created: "Invitación agregada",
      saveFailed: "No se pudo guardar la invitación. Intente de nuevo.",
      nameRequired: "Póngale un nombre a la invitación.",
    },
    paste: {
      title: "Pegar una lista de invitados",
      body: "Una familia por línea: nombre, teléfono, correo, lugares. Copie las columnas directo de una hoja de cálculo; una fila de encabezados en español o inglés define su orden.",
      textLabel: "Su lista",
      textPlaceholder: "Nombre\tWhatsApp\tCorreo\tLugares\nFamilia Ortiz\t+52 777 555 0101\tana@ejemplo.com\t4",
      seatsLabel: "Lugares cuando una línea no lo dice",
      eventsLabel: "Invitarlos a",
      previewTitle: "{count} invitaciones listas",
      previewTitleOne: "1 invitación lista",
      previewEmpty: "Aún no hay nada que agregar.",
      errorsTitle: "{count} líneas necesitan corrección",
      errorsTitleOne: "1 línea necesita corrección",
      reasons: {
        missing_name: "sin nombre",
        bad_seats: "los lugares deben ser un número entero del 1 al 20",
        bad_email: "el correo no parece válido",
      },
      lineLabel: "Línea {line}",
      importLabel: "Agregar {count} invitaciones",
      importLabelOne: "Agregar 1 invitación",
      imported: "{count} invitaciones agregadas",
      importedOne: "1 invitación agregada",
      importFailed: "No se pudieron agregar las invitaciones. No se guardó nada; intente de nuevo.",
      cancel: "Cancelar",
    },
  },
};

/** "1 seat" or "{count} seats": the singular is its own string in each language. */
export function countCopy(count: number, one: string, many: string): string {
  return count === 1 ? one : many.replace("{count}", String(count));
}
