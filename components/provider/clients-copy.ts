import type { Lang } from "@/lib/types";

/**
 * Copy for the Clients section, kept beside it rather than in the shared
 * dictionary. The section's title comes from the business type ("Patients"), so
 * nothing here names the people on the list.
 */
export type ClientsCopy = {
  previewTitle: string;
  previewBody: string;
  listTitle: string;
  listBody: string;
  download: string;
  downloaded: string;
  downloadFailed: string;
  downloadLocked: string;
  downloadBenefits: string[];
  search: string;
  searchPlaceholder: string;
  loading: string;
  loadFailed: string;
  retry: string;
  emptyTitle: string;
  emptyBody: string;
  noMatches: string;
  columns: { person: string; lastBooking: string; bookings: string; actions: string };
  deleteLabel: (name: string) => string;
  deleteTitle: (name: string) => string;
  deleteBody: string;
  deleteConfirm: string;
  deleteKeep: string;
  deleteFailed: string;
  deleted: string;
};

export const clientsCopy: Record<Lang, ClientsCopy> = {
  en: {
    previewTitle: "Your list needs a published page",
    previewBody: "Publish your booking page with an account, and everyone who books will be listed here.",
    listTitle: "People who have booked",
    listBody:
      "These details stay here after bookings are deleted. Contact people only where the law allows it, and delete someone's record if they ask.",
    download: "Download CSV",
    downloaded: "List downloaded",
    downloadFailed: "Could not download your list. Check your connection and try again.",
    downloadLocked: "Download this list as a CSV file with Premium.",
    downloadBenefits: [
      "Opens in Excel and Google Sheets",
      "Name, email, phone and booking dates",
      "Ready for your email or CRM tool",
    ],
    search: "Search",
    searchPlaceholder: "Name, email or phone",
    loading: "Loading…",
    loadFailed: "Could not load your list.",
    retry: "Try again",
    emptyTitle: "No one here yet",
    emptyBody: "People appear here after they book through your page.",
    noMatches: "No one matches that search.",
    columns: { person: "Name and contact", lastBooking: "Last booking", bookings: "Bookings", actions: "Actions" },
    deleteLabel: (name) => `Delete ${name}`,
    deleteTitle: (name) => `Delete ${name}?`,
    deleteBody:
      "Their contact details leave this list for good. Bookings they already made are not changed, and if they book again they will return to the list.",
    deleteConfirm: "Delete",
    deleteKeep: "Keep",
    deleteFailed: "Could not delete this record. Try again.",
    deleted: "Record deleted",
  },
  es: {
    previewTitle: "Su lista necesita una página publicada",
    previewBody: "Publique su página de reservas con una cuenta y aquí aparecerán todas las personas que reserven.",
    listTitle: "Personas que han reservado",
    listBody:
      "Estos datos permanecen aquí después de eliminarse las reservas. Contacte a las personas solo donde la ley lo permita, y elimine su registro si se lo piden.",
    download: "Descargar CSV",
    downloaded: "Lista descargada",
    downloadFailed: "No se pudo descargar su lista. Revise su conexión e inténtelo de nuevo.",
    downloadLocked: "Descargue esta lista como archivo CSV con Premium.",
    downloadBenefits: [
      "Se abre en Excel y Google Sheets",
      "Nombre, correo, teléfono y fechas de reserva",
      "Lista para su herramienta de correo o CRM",
    ],
    search: "Buscar",
    searchPlaceholder: "Nombre, correo o teléfono",
    loading: "Cargando…",
    loadFailed: "No se pudo cargar su lista.",
    retry: "Reintentar",
    emptyTitle: "Aún no hay nadie",
    emptyBody: "Las personas aparecen aquí después de reservar en su página.",
    noMatches: "Nadie coincide con esa búsqueda.",
    columns: { person: "Nombre y contacto", lastBooking: "Última reserva", bookings: "Reservas", actions: "Acciones" },
    deleteLabel: (name) => `Eliminar a ${name}`,
    deleteTitle: (name) => `¿Eliminar a ${name}?`,
    deleteBody:
      "Sus datos de contacto salen de esta lista de forma definitiva. Las reservas que ya hizo no cambian, y si vuelve a reservar regresará a la lista.",
    deleteConfirm: "Eliminar",
    deleteKeep: "Conservar",
    deleteFailed: "No se pudo eliminar este registro. Inténtelo de nuevo.",
    deleted: "Registro eliminado",
  },
};
