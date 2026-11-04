import type { Lang, ProviderInfo, Service } from "./types";

type LocalizedServiceContent = Pick<
  Service,
  "name" | "description" | "medicalSpecialty" | "capacity" | "cost" | "notes" | "cancellationPolicy"
>;

type LocalizedExampleContent = {
  provider?: Partial<Pick<ProviderInfo, "heroText" | "address1" | "address2">>;
  services: Record<string, LocalizedServiceContent>;
};

const SPANISH_EXAMPLE_CONTENT: Record<string, LocalizedExampleContent> = {
  "dr-maya-rivera": {
    provider: {
      heroText: "Atención primaria cuidadosa, adaptada a su agenda.",
    },
    services: {
      "new-patient-consultation": {
        name: "Consulta para pacientes nuevos",
        description:
          "Una primera consulta integral para revisar sus antecedentes de salud y prioridades.",
        medicalSpecialty: "Medicina familiar",
        capacity: "1 paciente",
        cost: "$95",
        notes: "Traiga una identificación con foto y su lista actual de medicamentos.",
      },
      "follow-up-visit": {
        name: "Consulta de seguimiento",
        description:
          "Revise avances, resultados y cualquier ajuste necesario en su plan de atención.",
        medicalSpecialty: "Medicina familiar",
        capacity: "1 paciente",
        cost: "$65",
        notes: "Para pacientes existentes.",
      },
    },
  },
  "riverside-padel-club": {
    provider: {
      heroText: "Su cancha está lista cuando usted lo esté.",
    },
    services: {
      "indoor-padel-court": {
        name: "Cancha de pádel cubierta",
        description:
          "Una cancha climatizada con raquetas y pelotas disponibles para el partido.",
        capacity: "Hasta 4 jugadores",
        cost: "$48 / hora",
        notes: "Llegue 10 minutos antes para registrarse.",
      },
      "private-coaching-court": {
        name: "Cancha con entrenamiento privado",
        description:
          "Tiempo de cancha más una sesión individual con un entrenador del club.",
        capacity: "1–2 jugadores",
        cost: "$120 / sesión",
        notes: "El equipo está incluido.",
      },
    },
  },
  "northstar-strategy": {
    provider: {
      heroText: "Convierta su próxima gran decisión en un plan claro.",
      address1: "Consulta remota",
    },
    services: {
      "growth-strategy-session": {
        name: "Sesión de estrategia de crecimiento",
        description:
          "Una sesión de trabajo estructurada sobre posicionamiento, prioridades y ejecución.",
        capacity: "1 cliente",
        cost: "£220",
        notes: "Recibirá un enlace para videollamada después de confirmar.",
      },
      "focused-advisory-call": {
        name: "Consulta de asesoría enfocada",
        description:
          "Traiga una decisión u obstáculo y salga con próximos pasos concretos.",
        capacity: "1 cliente",
        cost: "£110",
        notes: "Ideal para una pregunta específica o una revisión breve.",
      },
    },
  },
  "makers-workshop": {
    provider: {
      heroText: "Clases en grupos pequeños para manos curiosas.",
    },
    services: {
      "saturday-pottery-workshop": {
        name: "Taller de cerámica de los sábados",
        description:
          "Una clase guiada de torno para principiantes, con arcilla y horneado incluidos.",
        capacity: "18 participantes",
        cost: "฿1,400 / participante",
        notes: "Se proporcionan delantales y materiales. Para mayores de 14 años.",
      },
      "evening-figure-drawing": {
        name: "Dibujo de figura por la tarde",
        description:
          "Una clase semanal relajada con ejercicios guiados y modelo en vivo.",
        capacity: "24 participantes",
        cost: "฿650 / participante",
        notes: "Traiga sus materiales de dibujo preferidos; hay caballetes disponibles.",
      },
    },
  },
  "ruta-cenote-tours": {
    provider: {
      heroText: "Tours en grupos pequeños por el México que vale el viaje.",
      address1: "Monumento a la Revolución, Ciudad de México",
    },
    services: {
      "teotihuacan-sunrise-day-tour": {
        name: "Teotihuacán, tour de un día",
        description:
          "Suba a las pirámides con un guía arqueólogo antes de que llegue la multitud. Incluye transporte, entradas y comida.",
        capacity: "14 viajeros",
        cost: "US$95 por persona",
        notes: "Lleve zapatos cómodos, sombrero y agua. La salida es puntual.",
        cancellationPolicy: "Cancelación gratuita hasta 48 horas antes de la salida. Sin reembolso después.",
      },
      "tulum-and-coba-day-tour": {
        name: "Tulum y Cobá, tour de un día",
        description:
          "Ruinas frente al mar por la mañana y nado en un cenote por la tarde. Incluye transporte, entradas y comida.",
        capacity: "16 viajeros",
        cost: "US$120 por persona",
        notes: "Lleve traje de baño y toalla. Use bloqueador biodegradable en el cenote. Sale a las 7:30 a. m., hora de Cancún.",
        cancellationPolicy: "Cancelación gratuita hasta 48 horas antes de la salida. Sin reembolso después.",
      },
      "yucatan-and-maya-ruins-8-days": {
        name: "Yucatán y ruinas mayas · 8 días",
        description:
          "Ida y vuelta desde Cancún por Chichén Itzá, Mérida, Uxmal y Bacalar. Incluye 7 noches de hotel, transporte, guía y desayunos.",
        capacity: "12 viajeros",
        cost: "US$1,890 por persona",
        notes: "La hora indicada es la reunión de bienvenida del día 1, 6:00 p. m., hora de Cancún. Termina el día 8 en Cancún. Precio en habitación doble.",
        cancellationPolicy: "Cancelación gratuita hasta 45 días antes de la salida. Reembolso del 50% de 45 a 15 días antes. Sin reembolso después.",
      },
      "oaxaca-food-and-markets-6-days": {
        name: "Oaxaca, cocina y mercados · 6 días",
        description:
          "Mercados, Monte Albán, un taller de mezcal y una clase de cocina en casa de una familia. Incluye 5 noches de hotel, guía y desayunos.",
        capacity: "10 viajeros",
        cost: "US$1,240 por persona",
        notes: "La hora indicada es la reunión de bienvenida del día 1. Termina el día 6 en Oaxaca. Vuelos no incluidos.",
        cancellationPolicy: "Cancelación gratuita hasta 45 días antes de la salida. Reembolso del 50% de 45 a 15 días antes. Sin reembolso después.",
      },
      "mexico-city-to-cancun-15-days": {
        name: "De Ciudad de México a Cancún · 15 días",
        description:
          "Teotihuacán, Oaxaca, San Cristóbal, Palenque, Mérida y la costa de Quintana Roo. Incluye 14 noches de hotel, transporte, guía y desayunos.",
        capacity: "16 viajeros",
        cost: "US$3,950 por persona",
        notes: "La hora indicada es la reunión de bienvenida del día 1. Termina el día 15 en Cancún. Precio en habitación doble.",
        cancellationPolicy: "Cancelación gratuita hasta 45 días antes de la salida. Reembolso del 50% de 45 a 15 días antes. Sin reembolso después.",
      },
    },
  },
};

export function localizePublicExampleContent(
  provider: ProviderInfo,
  services: Service[],
  lang: Lang,
): { provider: ProviderInfo; services: Service[] } {
  if (lang !== "es") {
    return { provider, services };
  }

  const example = SPANISH_EXAMPLE_CONTENT[provider.publicSlug];
  if (!example) {
    return { provider, services };
  }

  return {
    provider: {
      ...provider,
      ...example.provider,
      language: lang,
    },
    services: services.map((service) => {
      const localized = example.services[service.slug ?? ""];
      return localized ? { ...service, ...localized } : service;
    }),
  };
}
