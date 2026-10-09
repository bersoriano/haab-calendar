import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { NextStepId } from "@/lib/dashboard-overview";
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
  titles: { overview: string; availability: string; integrations: string; businessType: string };
  descriptions: Record<AdminTab, string>;
  copyLink: string;
  linkCopied: string;
  /** Toast after copying the booking link. */
  linkCopiedToast: string;
  /** Label of a toast's close button. */
  dismiss: string;
  /** Screen-reader note on links that open a new tab. */
  opensInNewTab: string;
  /** Toast after the save bar's save goes through. */
  changesSaved: string;
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
  unsavedChanges: string;
  unsavedChangesHint: string;
  seeAll: string;
  statusFilterLabel: string;
  typeFilterLabel: string;
  bookingViewLabel: string;
  activeBookings: string;
  archivedBookings: string;
  archiveHint: string;
  retentionTitle: string;
  retentionOption: string;
  retentionDefaultOff: string;
  retentionMonth: string;
  retentionYear: string;
  retentionUnknown: string;
  retentionDateHint: string;
  retentionDowngrade: string;
  retentionPending: string;
  retentionManage: string;
  sortBookingsLabel: string;
  closestBookings: string;
  soonerBookings: string;
  latestBookings: string;
  noActiveBookingsTitle: string;
  noActiveBookingsBody: string;
  noArchivedBookingsTitle: string;
  noArchivedBookingsBody: string;
  today: string;
  tomorrow: string;
  clearFilters: string;
  /** "{shown}" and "{total}" are filled in. */
  resultsCount: string;
  noBookingsYetTitle: string;
  noBookingsYetBody: string;
  bookingPageTitle: string;
  bookingLinkTitle: string;
  workspaceLanguageTitle: string;
  dangerZoneTitle: string;
  dangerZoneBody: string;
  nextStepsTitle: string;
  nextSteps: Record<NextStepId, { title: string; body: string; cta?: string }>;
  businessType: BusinessTypeCopy;
  google: Record<GoogleOutcome, string>;
};

export type CountForms = { one: string; other: string };

/** "1 service" or "3 services": `other` has a "{count}" placeholder. */
export function countLabel(forms: CountForms, count: number) {
  return count === 1 ? forms.one : forms.other.replace("{count}", String(count));
}

/**
 * "{type}", "{services}", "{bookings}", "{from}" and "{to}" are filled in by
 * the caller; counts go through countLabel so one reads in the singular.
 */
export type BusinessTypeCopy = {
  servicesCount: CountForms;
  bookingsCount: CountForms;
  cardTitle: string;
  cardBody: string;
  change: string;
  pickTitle: string;
  pickBody: string;
  warningTitle: string;
  replacedTitle: string;
  replacedBody: string;
  staysTitle: string;
  stays: string[];
  linkMoves: string;
  notCarried: string;
  blockedTitle: string;
  blockedBookings: string;
  blockedHolds: string;
  goToBookings: string;
  acknowledge: string;
  continue: string;
  back: string;
  cancel: string;
  draftBanner: string;
  draftBannerChoosing: string;
  cancelChange: string;
  replaceDraftTitle: string;
  replaceDraftBody: string;
  keepDraft: string;
  startNew: string;
  publishLabel: string;
  confirmTitle: string;
  confirmBody: string;
  success: string;
  profileUnsaved: string;
  demoUnavailable: string;
};

export const dashboardCopy: Record<Lang, DashboardShellCopy> = {
  en: {
    navLabel: "Dashboard",
    groups: { operate: "Operate", setup: "Set up" },
    titles: {
      overview: "Overview",
      availability: "Availability",
      integrations: "Integrations",
      businessType: "Change business type",
    },
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
      "business-type": "Set up your page for a different kind of business.",
    },
    copyLink: "Copy link",
    linkCopied: "Copied",
    linkCopiedToast: "Booking link copied",
    dismiss: "Dismiss notification",
    opensInNewTab: "(opens in a new tab)",
    changesSaved: "Changes saved",
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
    unsavedChanges: "Unsaved changes",
    unsavedChangesHint: "Your edits stay here while you move between sections.",
    seeAll: "See all",
    statusFilterLabel: "Filter by status",
    typeFilterLabel: "Filter by type",
    bookingViewLabel: "Booking view",
    activeBookings: "Active",
    archivedBookings: "Archive",
    archiveHint: "Bookings more than 7 days past are kept in Archive.",
    retentionTitle: "Booking history",
    retentionOption: "Keep booking history for one year",
    retentionDefaultOff: "Premium feature · Off by default. Enable and save to keep one year of history.",
    retentionMonth: "Current policy: bookings more than one month past are permanently deleted during daily cleanup.",
    retentionYear: "Current policy: bookings more than one year past are permanently deleted during daily cleanup.",
    retentionUnknown: "History retention could not be verified. Refresh before changing this setting.",
    retentionDateHint: "Age is based on the scheduled date in your business timezone. Exact month or year boundaries are kept; cleanup may run later.",
    retentionDowngrade: "Turning this off or losing Premium access restores one-month retention at the next cleanup. Deleted bookings cannot be recovered.",
    retentionPending: "Save changes to apply this setting. The current policy stays in effect until saved.",
    retentionManage: "Manage history in Settings",
    sortBookingsLabel: "Sort bookings",
    closestBookings: "Closest to today",
    soonerBookings: "Sooner first",
    latestBookings: "Latest first",
    noActiveBookingsTitle: "All caught up",
    noActiveBookingsBody: "New bookings will appear here. Older bookings are available in Archive.",
    noArchivedBookingsTitle: "No archived bookings",
    noArchivedBookingsBody: "Bookings move here once their scheduled date is more than 7 days past.",
    today: "Today",
    tomorrow: "Tomorrow",
    clearFilters: "Clear filters",
    resultsCount: "{shown} of {total}",
    noBookingsYetTitle: "Nothing booked yet",
    noBookingsYetBody: "When clients book from your page, it shows up here.",
    bookingPageTitle: "Your booking page",
    bookingLinkTitle: "Booking link",
    workspaceLanguageTitle: "Workspace language",
    dangerZoneTitle: "Start over",
    dangerZoneBody: "Clears this browser's draft page, services and availability. It cannot be undone.",
    nextStepsTitle: "Finish setting up",
    nextSteps: {
      "add-service": {
        title: "Add what clients can book",
        body: "Your page needs at least one service before anyone can book.",
        cta: "Add a service",
      },
      "set-availability": {
        title: "Open your calendar",
        body: "No day of the week is open, so there are no times to book.",
        cta: "Set availability",
      },
      "publishing-off": {
        title: "Your page isn't taking bookings",
        body: "Publishing is turned off for this account. The message above explains why.",
      },
    },
    businessType: {
      servicesCount: { one: "1 service", other: "{count} services" },
      bookingsCount: { one: "1 upcoming booking", other: "{count} upcoming bookings" },
      cardTitle: "Business type",
      cardBody: "Decides your page's services, wording and booking rules.",
      change: "Change business type",
      pickTitle: "Choose your new business type",
      pickBody: "You'll set it up before anything on your live page changes.",
      warningTitle: "Before you switch to {type}",
      replacedTitle: "Will be replaced",
      replacedBody:
        "Your {services}, weekly hours and daily booking limit, by the {type} starter setup. You review it before it goes live.",
      staysTitle: "Stays",
      stays: [
        "Your account and plan",
        "Profile and contact details",
        "Languages, logo, header image and theme",
        "Past bookings",
        "Google Calendar connection",
      ],
      linkMoves: "Your booking link moves from {from} to {to}. The old link redirects.",
      notCarried: "Links to individual services on your current page will stop working.",
      blockedTitle: "Handle upcoming bookings first",
      blockedBookings:
        "You have {bookings}. Cancel them, or wait until they're done, before changing your business type.",
      blockedHolds: "Someone is booking on your page right now. Try again in a few minutes.",
      goToBookings: "Go to bookings",
      acknowledge: "I understand my current services and hours will be replaced.",
      continue: "Continue",
      back: "Back",
      cancel: "Cancel",
      draftBanner:
        "Setting up your {type} page. Your live page doesn't change until you publish, and this draft stays in this browser if you leave.",
      draftBannerChoosing:
        "Choose your new business type below. Your live page doesn't change until you publish.",
      cancelChange: "Cancel change",
      replaceDraftTitle: "You have a {from} draft",
      replaceDraftBody: "Keep working on it, or start over as {to}?",
      keepDraft: "Keep my draft",
      startNew: "Start over",
      publishLabel: "Replace and publish",
      confirmTitle: "Replace your live page?",
      confirmBody:
        "This replaces your {services}, weekly hours and daily limit on your live page with this setup.",
      success: "Your page is now a {type} page. Your old link redirects here.",
      profileUnsaved:
        "Some profile changes from your draft were not saved. Review them in Settings.",
      demoUnavailable: "Demo pages keep their business type.",
    },
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
    titles: {
      overview: "Resumen",
      availability: "Disponibilidad",
      integrations: "Integraciones",
      businessType: "Cambiar tipo de negocio",
    },
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
      "business-type": "Configure su página para otro tipo de negocio.",
    },
    copyLink: "Copiar enlace",
    linkCopied: "Copiado",
    linkCopiedToast: "Enlace de reservas copiado",
    dismiss: "Cerrar aviso",
    opensInNewTab: "(se abre en una pestaña nueva)",
    changesSaved: "Cambios guardados",
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
    unsavedChanges: "Cambios sin guardar",
    unsavedChangesHint: "Sus cambios se conservan mientras pasa de una sección a otra.",
    seeAll: "Ver todo",
    statusFilterLabel: "Filtrar por estado",
    typeFilterLabel: "Filtrar por tipo",
    bookingViewLabel: "Vista de reservas",
    activeBookings: "Activas",
    archivedBookings: "Archivo",
    archiveHint: "Las reservas de hace más de 7 días se conservan en Archivo.",
    retentionTitle: "Historial de reservas",
    retentionOption: "Conservar el historial de reservas por un año",
    retentionDefaultOff: "Función Premium · Desactivada por defecto. Actívela y guarde para conservar un año de historial.",
    retentionMonth: "Política actual: las reservas de hace más de un mes se eliminan permanentemente durante la limpieza diaria.",
    retentionYear: "Política actual: las reservas de hace más de un año se eliminan permanentemente durante la limpieza diaria.",
    retentionUnknown: "No se pudo verificar la conservación del historial. Actualice la página antes de cambiar esta opción.",
    retentionDateHint: "La antigüedad se calcula desde la fecha de la reserva, en la zona horaria de su negocio. Las fechas justo en el límite del mes o año se conservan; la limpieza puede retrasarse.",
    retentionDowngrade: "Desactivar esta opción o perder el acceso Premium restablece la conservación de un mes en la próxima limpieza. Las reservas eliminadas no se pueden recuperar.",
    retentionPending: "Guarde los cambios para aplicar esta opción. La política actual sigue vigente hasta guardarlos.",
    retentionManage: "Gestionar el historial en Ajustes",
    sortBookingsLabel: "Ordenar reservas",
    closestBookings: "Más cercanas a hoy",
    soonerBookings: "Más próximas primero",
    latestBookings: "Más lejanas primero",
    noActiveBookingsTitle: "Todo está al día",
    noActiveBookingsBody: "Las nuevas reservas aparecerán aquí. Las anteriores están disponibles en Archivo.",
    noArchivedBookingsTitle: "No hay reservas archivadas",
    noArchivedBookingsBody: "Las reservas pasan aquí cuando su fecha es de hace más de 7 días.",
    today: "Hoy",
    tomorrow: "Mañana",
    clearFilters: "Quitar filtros",
    resultsCount: "{shown} de {total}",
    noBookingsYetTitle: "Todavía no hay nada reservado",
    noBookingsYetBody: "Cuando sus clientes reserven desde su página, aparecerá aquí.",
    bookingPageTitle: "Su página de reservas",
    bookingLinkTitle: "Enlace de reservas",
    workspaceLanguageTitle: "Idioma de su espacio",
    dangerZoneTitle: "Empezar de nuevo",
    dangerZoneBody: "Borra la página, los servicios y la disponibilidad guardados en este navegador. No se puede deshacer.",
    nextStepsTitle: "Termine de configurar",
    nextSteps: {
      "add-service": {
        title: "Agregue lo que pueden reservar",
        body: "Su página necesita al menos un servicio para recibir reservas.",
        cta: "Agregar servicio",
      },
      "set-availability": {
        title: "Abra su calendario",
        body: "Ningún día de la semana está abierto, así que no hay horarios para reservar.",
        cta: "Definir disponibilidad",
      },
      "publishing-off": {
        title: "Su página no está recibiendo reservas",
        body: "La publicación está desactivada para esta cuenta. El mensaje de arriba explica por qué.",
      },
    },
    businessType: {
      servicesCount: { one: "1 servicio", other: "{count} servicios" },
      bookingsCount: { one: "1 reserva próxima", other: "{count} reservas próximas" },
      cardTitle: "Tipo de negocio",
      cardBody: "Define los servicios, el vocabulario y las reglas de reserva de su página.",
      change: "Cambiar tipo de negocio",
      pickTitle: "Elija su nuevo tipo de negocio",
      pickBody: "Lo configurará antes de que cambie algo en su página publicada.",
      warningTitle: "Antes de cambiar a {type}",
      replacedTitle: "Se reemplazará",
      replacedBody:
        "Sus servicios ({services}), su horario semanal y su límite diario de reservas, por la configuración inicial de {type}. La revisa antes de publicarla.",
      staysTitle: "Se conserva",
      stays: [
        "Su cuenta y su plan",
        "Perfil y datos de contacto",
        "Idiomas, logotipo, imagen de encabezado y tema",
        "Reservas pasadas",
        "Conexión con Google Calendar",
      ],
      linkMoves: "Su enlace de reservas pasa de {from} a {to}. El enlace anterior redirige.",
      notCarried: "Los enlaces a servicios individuales de su página actual dejarán de funcionar.",
      blockedTitle: "Primero atienda las reservas próximas",
      blockedBookings:
        "Tiene {bookings}. Cancélelas, o espere a que terminen, antes de cambiar su tipo de negocio.",
      blockedHolds: "Alguien está reservando en su página en este momento. Inténtelo de nuevo en unos minutos.",
      goToBookings: "Ir a reservas",
      acknowledge: "Entiendo que mis servicios y horarios actuales se reemplazarán.",
      continue: "Continuar",
      back: "Atrás",
      cancel: "Cancelar",
      draftBanner:
        "Está configurando su página de {type}. Su página publicada no cambia hasta que publique, y este borrador se guarda en este navegador si sale.",
      draftBannerChoosing:
        "Elija abajo su nuevo tipo de negocio. Su página publicada no cambia hasta que publique.",
      cancelChange: "Cancelar el cambio",
      replaceDraftTitle: "Tiene un borrador de {from}",
      replaceDraftBody: "¿Seguir con él o empezar de nuevo como {to}?",
      keepDraft: "Seguir con mi borrador",
      startNew: "Empezar de nuevo",
      publishLabel: "Reemplazar y publicar",
      confirmTitle: "¿Reemplazar su página publicada?",
      confirmBody:
        "Esto reemplaza sus servicios ({services}), su horario semanal y su límite diario en su página publicada por esta configuración.",
      success: "Su página ahora es de {type}. Su enlace anterior redirige aquí.",
      profileUnsaved:
        "Algunos cambios de perfil de su borrador no se guardaron. Revíselos en Ajustes.",
      demoUnavailable: "Las páginas de ejemplo conservan su tipo de negocio.",
    },
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
    case "business-type":
      return shell.titles.businessType;
  }
}
