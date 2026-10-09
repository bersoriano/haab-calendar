import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { GoogleOutcome } from "@/lib/dashboard-routes";
import type { AdminTab, Lang } from "@/lib/types";
import type { VerticalCopy } from "@/lib/vertical-copy";

/**
 * Words the dashboard shell (sidebar, top bar, banners, footer) adds on top of
 * the booking module's own dictionary. Kept apart from
 * components/booking/i18n/translations.ts so the shell can grow without
 * touching the module's contract.
 */
export type DashboardShellCopy = {
  navLabel: string;
  groups: { operate: string; setup: string };
  titles: { overview: string; availability: string; integrations: string };
  descriptions: Record<AdminTab, string>;
  copyLink: string;
  linkCopied: string;
  viewPage: string;
  openMenu: string;
  closeMenu: string;
  skipToContent: string;
  signOut: string;
  superAdmin: string;
  signedInAs: string;
  pageLive: string;
  publishingOff: string;
  editingDemo: string;
  viewLive: string;
  exitDemo: string;
  terms: string;
  privacy: string;
  rights: string;
  google: Record<GoogleOutcome, string>;
};

export const dashboardCopy: Record<Lang, DashboardShellCopy> = {
  en: {
    navLabel: "Dashboard",
    groups: { operate: "Operate", setup: "Set up" },
    titles: { overview: "Overview", availability: "Availability", integrations: "Integrations" },
    descriptions: {
      dashboard: "What's coming up and how your page is doing.",
      bookings: "Search, filter and manage everything that's been booked.",
      calendar: "Your month at a glance. Pick an open day to add a booking.",
      analytics: "Visits, bookings and where they come from.",
      services: "What clients can book, with prices and times.",
      availability: "When you can be booked.",
      appearance: "How your public page looks and which language it speaks.",
      integrations: "Connect the tools you already use.",
      settings: "Business details, booking link and workspace language.",
    },
    copyLink: "Copy link",
    linkCopied: "Copied",
    viewPage: "View page",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    skipToContent: "Skip to content",
    signOut: "Sign out",
    superAdmin: "Super admin",
    signedInAs: "Signed in as",
    pageLive: "Page is live",
    publishingOff: "Publishing is off",
    editingDemo: "Editing demo page",
    viewLive: "View live",
    exitDemo: "Exit demo editing",
    terms: "Terms",
    privacy: "Privacy",
    rights: "Haab Calendar",
    google: {
      connected: "Google Calendar is connected.",
      declined: "Google Calendar wasn't connected because access was declined.",
      missing_scopes:
        "Google Calendar needs every permission it asks for. Connect again and allow all of them.",
      not_entitled: "Google Calendar sync is part of Premium.",
      no_refresh_token: "Google didn't grant lasting access. Connect again to finish.",
      no_provider: "Finish setting up your booking page before connecting Google Calendar.",
      invalid: "That Google sign-in expired. Please connect again.",
      signed_out: "Sign in again to connect Google Calendar.",
      unavailable: "Google Calendar isn't available right now.",
      failed: "Google Calendar couldn't be connected. Please try again.",
    },
  },
  es: {
    navLabel: "Panel",
    groups: { operate: "Operación", setup: "Configuración" },
    titles: { overview: "Resumen", availability: "Disponibilidad", integrations: "Integraciones" },
    descriptions: {
      dashboard: "Lo que viene y cómo va su página.",
      bookings: "Busque, filtre y gestione todo lo que le han reservado.",
      calendar: "Su mes de un vistazo. Elija un día abierto para agregar una reserva.",
      analytics: "Visitas, reservas y de dónde vienen.",
      services: "Lo que sus clientes pueden reservar, con precios y horarios.",
      availability: "Cuándo le pueden reservar.",
      appearance: "Cómo se ve su página pública y en qué idioma habla.",
      integrations: "Conecte las herramientas que ya usa.",
      settings: "Datos del negocio, enlace de reservas e idioma de su espacio.",
    },
    copyLink: "Copiar enlace",
    linkCopied: "Copiado",
    viewPage: "Ver página",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    skipToContent: "Saltar al contenido",
    signOut: "Cerrar sesión",
    superAdmin: "Superadministrador",
    signedInAs: "Sesión iniciada como",
    pageLive: "Página publicada",
    publishingOff: "Publicación desactivada",
    editingDemo: "Editando página de ejemplo",
    viewLive: "Ver publicada",
    exitDemo: "Salir de la edición",
    terms: "Términos",
    privacy: "Privacidad",
    rights: "Haab Calendar",
    google: {
      connected: "Google Calendar está conectado.",
      declined: "Google Calendar no se conectó porque se rechazó el acceso.",
      missing_scopes:
        "Google Calendar necesita todos los permisos que solicita. Conéctelo de nuevo y acéptelos todos.",
      not_entitled: "La sincronización con Google Calendar es parte de Premium.",
      no_refresh_token: "Google no otorgó acceso permanente. Conéctelo de nuevo para terminar.",
      no_provider: "Termine de configurar su página de reservas antes de conectar Google Calendar.",
      invalid: "Ese inicio de sesión con Google venció. Conéctelo de nuevo.",
      signed_out: "Inicie sesión de nuevo para conectar Google Calendar.",
      unavailable: "Google Calendar no está disponible en este momento.",
      failed: "No se pudo conectar Google Calendar. Inténtelo de nuevo.",
    },
  },
};

/** The page title for a section, in the owner's words for what they sell. */
export function sectionTitle(section: AdminTab, lang: Lang, copy: VerticalCopy): string {
  const shell = dashboardCopy[lang];
  const admin = bookingTranslations[lang].admin;

  switch (section) {
    case "dashboard":
      return shell.titles.overview;
    case "bookings":
      return copy.Bookings;
    case "calendar":
      return admin.tabCalendar;
    case "analytics":
      return admin.tabAnalytics;
    case "services":
      return copy.Services;
    case "availability":
      return shell.titles.availability;
    case "appearance":
      return admin.tabAppearance;
    case "integrations":
      return shell.titles.integrations;
    case "settings":
      return admin.tabSettings;
  }
}
