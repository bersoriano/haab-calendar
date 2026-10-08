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
  dailyTitle: string;
  dailyLegendVisits: string;
  dailyLegendBookings: string;
  funnelTitle: string;
  funnelBody: string;
  funnelSteps: [string, string, string, string];
  campaignsTitle: string;
  campaignsBody: string;
  campaignColumns: [string, string, string, string, string];
  direct: string;
  none: string;
  referrersTitle: string;
  servicesTitle: string;
  selections: string;
  builderTitle: string;
  builderBody: string;
  builderSource: string;
  builderSourcePlaceholder: string;
  builderMedium: string;
  builderMediumPlaceholder: string;
  builderCampaign: string;
  builderCampaignPlaceholder: string;
  copy: string;
  copied: string;
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
    premiumTitle: "Analytics is part of Premium",
    premiumBody:
      "Measure visits, booking conversion and campaign performance for your public booking page. Upgrade to Premium to turn it on.",
    previewTitle: "Analytics needs a published page",
    previewBody: "Publish your booking page with an account to start measuring visits and bookings.",
    emptyTitle: "No visits yet",
    emptyBody:
      "Share your booking link — or a campaign link from the builder below — and visits will show up here within a minute.",
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
    dailyTitle: "Visits and bookings per day",
    dailyLegendVisits: "Visits",
    dailyLegendBookings: "Bookings",
    funnelTitle: "Booking funnel",
    funnelBody: "How many visitors reached each step.",
    funnelSteps: ["Opened the page", "Chose a service", "Chose a time", "Booked"],
    campaignsTitle: "Campaigns",
    campaignsBody: "Grouped by the utm tags on the link a visitor opened.",
    campaignColumns: ["Source", "Medium", "Campaign", "Visits", "Bookings"],
    direct: "Direct / untagged",
    none: "—",
    referrersTitle: "Referring sites",
    servicesTitle: "Services",
    selections: "chose it",
    builderTitle: "Campaign link builder",
    builderBody:
      "Use a different link for each post, ad or message so you can see which one brings bookings.",
    builderSource: "Source",
    builderSourcePlaceholder: "instagram",
    builderMedium: "Medium",
    builderMediumPlaceholder: "social",
    builderCampaign: "Campaign",
    builderCampaignPlaceholder: "fall-promo",
    copy: "Copy link",
    copied: "Copied",
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
    premiumTitle: "La analítica es parte de Premium",
    premiumBody:
      "Mide visitas, conversión a reservas y el rendimiento de tus campañas. Cambia a Premium para activarla.",
    previewTitle: "La analítica necesita una página publicada",
    previewBody: "Publica tu página de reservas con una cuenta para empezar a medir visitas y reservas.",
    emptyTitle: "Aún no hay visitas",
    emptyBody:
      "Comparte tu enlace de reservas — o un enlace de campaña del generador de abajo — y las visitas aparecerán aquí en un minuto.",
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
    dailyTitle: "Visitas y reservas por día",
    dailyLegendVisits: "Visitas",
    dailyLegendBookings: "Reservas",
    funnelTitle: "Embudo de reserva",
    funnelBody: "Cuántos visitantes llegaron a cada paso.",
    funnelSteps: ["Abrieron la página", "Eligieron un servicio", "Eligieron un horario", "Reservaron"],
    campaignsTitle: "Campañas",
    campaignsBody: "Agrupadas por las etiquetas utm del enlace que abrió cada visitante.",
    campaignColumns: ["Fuente", "Medio", "Campaña", "Visitas", "Reservas"],
    direct: "Directo / sin etiqueta",
    none: "—",
    referrersTitle: "Sitios de referencia",
    servicesTitle: "Servicios",
    selections: "lo eligieron",
    builderTitle: "Generador de enlaces de campaña",
    builderBody:
      "Usa un enlace distinto para cada publicación, anuncio o mensaje y descubre cuál genera reservas.",
    builderSource: "Fuente",
    builderSourcePlaceholder: "instagram",
    builderMedium: "Medio",
    builderMediumPlaceholder: "social",
    builderCampaign: "Campaña",
    builderCampaignPlaceholder: "promo-otono",
    copy: "Copiar enlace",
    copied: "Copiado",
    privacyNote:
      "Se mide sin cookies. Los visitantes se cuentan con un identificador anónimo diario y no se guardan datos personales.",
  },
};
