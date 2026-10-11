import type { Lang } from "@/lib/types";

/** Copy for the Analytics tab, kept beside it rather than in the shared dictionary. */
export type AnalyticsCopy = {
  title: string;
  body: string;
  rangeLabel: (days: number) => string;
  loading: string;
  loadFailed: string;
  retry: string;
  premiumTitle: string;
  premiumBody: string;
  premiumBenefits: string[];
  upgradeCta: string;
  upgradePending: string;
  upgradeUnavailable: string;
  upgradeFailed: string;
  checkoutSucceeded: string;
  checkoutPending: string;
  checkoutRefresh: string;
  checkoutCancelled: string;
  previewTitle: string;
  previewBody: string;
  emptyTitle: string;
  emptyBody: string;
  visits: string;
  visitsDetail: string;
  visitors: string;
  visitorsDetail: string;
  bookings: string;
  bookingsDetail: string;
  bookingsCancelledDetail: (count: number) => string;
  conversion: string;
  conversionDetail: string;
  vsPrevious: (change: number, days: number) => string;
  vsPreviousPoints: (points: number, days: number) => string;
  healthTitle: string;
  healthBody: string;
  healthCreated: string;
  healthCancellation: string;
  healthReschedule: string;
  healthOf: (count: number, total: number) => string;
  timesTitle: string;
  timesBody: string;
  timesEmpty: string;
  weekdaysShort: [string, string, string, string, string, string, string];
  timesCell: (weekday: string, hour: string, count: number) => string;
  dailyTitle: string;
  dailyLegendVisits: string;
  dailyLegendBookings: string;
  funnelTitle: string;
  funnelBody: string;
  funnelSteps: [string, string, string, string];
  none: string;
  servicesTitle: string;
  selections: string;
  privacyNote: string;
};

export const analyticsCopy: Record<Lang, AnalyticsCopy> = {
  en: {
    title: "Booking page analytics",
    body: "See how many people open your booking page, how far they get, and which links bring bookings.",
    rangeLabel: (days) => `${days} days`,
    loading: "Loading analytics…",
    loadFailed: "Could not load analytics.",
    retry: "Try again",
    premiumTitle: "See which links bring bookings",
    premiumBody: "Your visits are counted above. Premium shows what happens next.",
    premiumBenefits: [
      "Bookings and conversion rate",
      "Bookings per campaign link",
      "Where visitors drop off",
      "Your most booked services",
    ],
    upgradeCta: "Upgrade to Premium",
    upgradePending: "Opening checkout…",
    upgradeUnavailable: "Upgrades are not open yet. We'll let you know when they are.",
    upgradeFailed: "Could not open checkout. Please try again.",
    checkoutSucceeded: "Welcome to Premium. Your full analytics are below.",
    checkoutPending: "Payment received. Premium turns on in a few seconds.",
    checkoutRefresh: "Refresh",
    checkoutCancelled: "Checkout cancelled. You have not been charged.",
    previewTitle: "Analytics needs a published page",
    previewBody: "Publish your booking page with an account to start measuring visits and bookings.",
    emptyTitle: "No visits yet",
    emptyBody:
      "Share your booking link — or a campaign link from Campaigns — and visits will show up here within a minute.",
    visits: "Visits",
    visitsDetail: "Times your page was opened",
    visitors: "Visitors",
    visitorsDetail: "Unique visitors per day",
    bookings: "Bookings",
    bookingsDetail: "Confirmed from your page",
    bookingsCancelledDetail: (count) =>
      `Confirmed from your page · ${count} cancelled ${count === 1 ? "is" : "are"} not counted`,
    conversion: "Conversion",
    conversionDetail: "Visitors who booked",
    vsPrevious: (change, days) => `${change > 0 ? "+" : ""}${change}% vs previous ${days} days`,
    vsPreviousPoints: (points, days) =>
      `${points > 0 ? "+" : ""}${points} pts vs previous ${days} days`,
    healthTitle: "Booking health",
    healthBody: "Every booking made in this period, from your page or your dashboard.",
    healthCreated: "Bookings made",
    healthCancellation: "Cancellation rate",
    healthReschedule: "Reschedule rate",
    healthOf: (count, total) => `${count} of ${total}`,
    timesTitle: "Popular booking times",
    timesBody: "When the appointments booked in this period take place. Cancelled ones are left out.",
    timesEmpty: "No timed appointments booked in this period yet.",
    weekdaysShort: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    timesCell: (weekday, hour, count) =>
      `${weekday} ${hour}: ${count} ${count === 1 ? "booking" : "bookings"}`,
    dailyTitle: "Visits and bookings per day",
    dailyLegendVisits: "Visits",
    dailyLegendBookings: "Bookings",
    funnelTitle: "Booking funnel",
    funnelBody: "How many visitors reached each step.",
    funnelSteps: ["Opened the page", "Chose a service", "Chose a time", "Booked"],
    none: "—",
    servicesTitle: "Services",
    selections: "chose it",
    privacyNote:
      "Measured without cookies. Visitors are counted with a daily anonymous identifier and no personal data is stored.",
  },
  es: {
    title: "Analítica de tu página de reservas",
    body: "Mira cuántas personas abren tu página de reservas, hasta dónde llegan y qué enlaces generan reservas.",
    rangeLabel: (days) => `${days} días`,
    loading: "Cargando analítica…",
    loadFailed: "No se pudo cargar la analítica.",
    retry: "Reintentar",
    premiumTitle: "Descubre qué enlaces generan reservas",
    premiumBody: "Arriba están tus visitas. Premium te muestra lo que pasa después.",
    premiumBenefits: [
      "Reservas y tasa de conversión",
      "Reservas por enlace de campaña",
      "En qué paso se van los visitantes",
      "Tus servicios más reservados",
    ],
    upgradeCta: "Cambiar a Premium",
    upgradePending: "Abriendo el pago…",
    upgradeUnavailable: "Las mejoras aún no están abiertas. Te avisaremos cuando lo estén.",
    upgradeFailed: "No se pudo abrir el pago. Inténtalo de nuevo.",
    checkoutSucceeded: "Bienvenido a Premium. Tu analítica completa está abajo.",
    checkoutPending: "Pago recibido. Premium se activa en unos segundos.",
    checkoutRefresh: "Actualizar",
    checkoutCancelled: "Pago cancelado. No se te cobró nada.",
    previewTitle: "La analítica necesita una página publicada",
    previewBody: "Publica tu página de reservas con una cuenta para empezar a medir visitas y reservas.",
    emptyTitle: "Aún no hay visitas",
    emptyBody:
      "Comparte tu enlace de reservas — o un enlace de campaña desde Campañas — y las visitas aparecerán aquí en un minuto.",
    visits: "Visitas",
    visitsDetail: "Veces que se abrió tu página",
    visitors: "Visitantes",
    visitorsDetail: "Visitantes únicos por día",
    bookings: "Reservas",
    bookingsDetail: "Confirmadas desde tu página",
    bookingsCancelledDetail: (count) =>
      `Confirmadas desde tu página · ${count} ${count === 1 ? "cancelada no cuenta" : "canceladas no cuentan"}`,
    conversion: "Conversión",
    conversionDetail: "Visitantes que reservaron",
    vsPrevious: (change, days) =>
      `${change > 0 ? "+" : ""}${change}% vs. los ${days} días anteriores`,
    vsPreviousPoints: (points, days) =>
      `${points > 0 ? "+" : ""}${points} pts vs. los ${days} días anteriores`,
    healthTitle: "Salud de las reservas",
    healthBody: "Todas las reservas hechas en este periodo, desde tu página o tu panel.",
    healthCreated: "Reservas hechas",
    healthCancellation: "Tasa de cancelación",
    healthReschedule: "Tasa de reprogramación",
    healthOf: (count, total) => `${count} de ${total}`,
    timesTitle: "Horarios más reservados",
    timesBody: "Cuándo ocurren las citas reservadas en este periodo. Las canceladas no cuentan.",
    timesEmpty: "Aún no hay citas con horario reservadas en este periodo.",
    weekdaysShort: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    timesCell: (weekday, hour, count) =>
      `${weekday} ${hour}: ${count} ${count === 1 ? "reserva" : "reservas"}`,
    dailyTitle: "Visitas y reservas por día",
    dailyLegendVisits: "Visitas",
    dailyLegendBookings: "Reservas",
    funnelTitle: "Embudo de reserva",
    funnelBody: "Cuántos visitantes llegaron a cada paso.",
    funnelSteps: ["Abrieron la página", "Eligieron un servicio", "Eligieron un horario", "Reservaron"],
    none: "—",
    servicesTitle: "Servicios",
    selections: "lo eligieron",
    privacyNote:
      "Se mide sin cookies. Los visitantes se cuentan con un identificador anónimo diario y no se guardan datos personales.",
  },
};
