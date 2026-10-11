import type { Lang } from "@/lib/types";

type CampaignField = { label: string; placeholder: string; hint: string };

/** Copy for the Campaigns section, kept beside it rather than in the shared dictionary. */
export type CampaignsCopy = {
  previewTitle: string;
  previewBody: string;
  builderTitle: string;
  builderBody: string;
  stepsTitle: string;
  steps: Array<{ title: string; body: string }>;
  source: CampaignField;
  medium: CampaignField;
  campaign: CampaignField;
  linkLabel: string;
  /** Shown until Source is filled in: the link carries no label yet. */
  linkNeedsSource: string;
  /** Shown once the link carries a label. */
  linkTip: string;
  copy: string;
  copied: string;
  resultsTitle: string;
  resultsBody: string;
  rangeLabel: (days: number) => string;
  loading: string;
  loadFailed: string;
  retry: string;
  resultsEmptyTitle: string;
  resultsEmptyBody: string;
  columns: [string, string, string, string, string];
  direct: string;
  directNote: string;
  none: string;
  referrersTitle: string;
  lockedBody: string;
};

export const campaignsCopy: Record<Lang, CampaignsCopy> = {
  en: {
    previewTitle: "Campaigns need a published page",
    previewBody: "Publish your booking page with an account to make campaign links and see what they bring.",
    builderTitle: "Create a campaign link",
    builderBody:
      "A campaign link is your booking link with a label on it. Your clients see the same page; the label only tells you where each visit and booking came from.",
    stepsTitle: "How to use it",
    steps: [
      {
        title: "Label the place you will share it.",
        body: "Fill in Source with where the link is going: instagram, whatsapp, newsletter. Medium and Campaign are optional.",
      },
      {
        title: "Copy the link and use it only there.",
        body: "Paste it into that post, bio, ad or message, or turn it into a QR code for a flyer.",
      },
      {
        title: "Make a new link for every other place.",
        body: "One link per place is what lets you compare them.",
      },
      {
        title: "Come back to see what worked.",
        body: "Results, below, lists each link with the visits and bookings it brought.",
      },
    ],
    source: {
      label: "Source",
      placeholder: "instagram",
      hint: "Where the link will be shared.",
    },
    medium: {
      label: "Medium",
      placeholder: "social",
      hint: "Optional. The kind of channel: social, email, ad, qr.",
    },
    campaign: {
      label: "Campaign",
      placeholder: "fall-promo",
      hint: "Optional. The promotion or post it belongs to.",
    },
    linkLabel: "Your link",
    linkNeedsSource:
      "This is your plain booking link. Fill in Source to label it; visits from an unlabelled link count as Direct / untagged.",
    linkTip:
      "Use the same words each time: “instagram” and “ig” would show up as two separate rows. Capitals and spaces are tidied for you.",
    copy: "Copy link",
    copied: "Copied",
    resultsTitle: "Results",
    resultsBody: "Visits and bookings for each campaign link, grouped by its labels.",
    rangeLabel: (days) => `${days} days`,
    loading: "Loading results…",
    loadFailed: "Could not load campaign results.",
    retry: "Try again",
    resultsEmptyTitle: "No visits yet",
    resultsEmptyBody: "Share a campaign link and its visits will show up here within a minute.",
    columns: ["Source", "Medium", "Campaign", "Visits", "Bookings"],
    direct: "Direct / untagged",
    directNote: "Direct / untagged counts everyone who opened a link with no label, such as your plain booking link.",
    none: "—",
    referrersTitle: "Referring sites",
    lockedBody: "You can make and share campaign links on any plan. Premium shows the visits and bookings each one brings.",
  },
  es: {
    previewTitle: "Las campañas necesitan una página publicada",
    previewBody: "Publica tu página de reservas con una cuenta para crear enlaces de campaña y ver qué generan.",
    builderTitle: "Crea un enlace de campaña",
    builderBody:
      "Un enlace de campaña es tu enlace de reservas con una etiqueta. Tus clientes ven la misma página; la etiqueta solo te dice de dónde vino cada visita y cada reserva.",
    stepsTitle: "Cómo usarlo",
    steps: [
      {
        title: "Etiqueta el lugar donde lo vas a compartir.",
        body: "Escribe en Fuente a dónde va el enlace: instagram, whatsapp, boletin. Medio y Campaña son opcionales.",
      },
      {
        title: "Copia el enlace y úsalo solo ahí.",
        body: "Pégalo en esa publicación, biografía, anuncio o mensaje, o conviértelo en un código QR para un volante.",
      },
      {
        title: "Crea un enlace nuevo para cada otro lugar.",
        body: "Un enlace por lugar es lo que te permite compararlos.",
      },
      {
        title: "Vuelve para ver qué funcionó.",
        body: "Resultados, abajo, muestra cada enlace con las visitas y reservas que generó.",
      },
    ],
    source: {
      label: "Fuente",
      placeholder: "instagram",
      hint: "Dónde se va a compartir el enlace.",
    },
    medium: {
      label: "Medio",
      placeholder: "social",
      hint: "Opcional. El tipo de canal: social, email, anuncio, qr.",
    },
    campaign: {
      label: "Campaña",
      placeholder: "promo-otono",
      hint: "Opcional. La promoción o publicación a la que pertenece.",
    },
    linkLabel: "Tu enlace",
    linkNeedsSource:
      "Este es tu enlace de reservas sin etiqueta. Escribe una Fuente para etiquetarlo; las visitas de un enlace sin etiqueta cuentan como Directo / sin etiqueta.",
    linkTip:
      "Usa las mismas palabras cada vez: “instagram” e “ig” aparecerían como dos filas distintas. Las mayúsculas y los espacios se ajustan solos.",
    copy: "Copiar enlace",
    copied: "Copiado",
    resultsTitle: "Resultados",
    resultsBody: "Visitas y reservas de cada enlace de campaña, agrupadas por sus etiquetas.",
    rangeLabel: (days) => `${days} días`,
    loading: "Cargando resultados…",
    loadFailed: "No se pudieron cargar los resultados de campañas.",
    retry: "Reintentar",
    resultsEmptyTitle: "Aún no hay visitas",
    resultsEmptyBody: "Comparte un enlace de campaña y sus visitas aparecerán aquí en un minuto.",
    columns: ["Fuente", "Medio", "Campaña", "Visitas", "Reservas"],
    direct: "Directo / sin etiqueta",
    directNote:
      "Directo / sin etiqueta cuenta a quienes abrieron un enlace sin etiqueta, como tu enlace de reservas normal.",
    none: "—",
    referrersTitle: "Sitios de referencia",
    lockedBody:
      "Puedes crear y compartir enlaces de campaña en cualquier plan. Premium muestra las visitas y reservas que genera cada uno.",
  },
};
