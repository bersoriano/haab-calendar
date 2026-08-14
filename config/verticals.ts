import type { Lang, ServiceDraft, VerticalId, WeeklyAvailability } from "../lib/types";

export interface VerticalHints {
  serviceName: string;
  description: string;
  medicalSpecialty?: string;
  capacity: string;
  cost: string;
}

export interface Vertical {
  id: VerticalId;
  label: string;
  tagline: string;
  description: string;
  services: ServiceDraft[];
  availability: WeeklyAvailability;
  hints: VerticalHints;
}

const WEEKDAYS_9_17: WeeklyAvailability = {
  sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
};

const ALL_DAYS_8_22: WeeklyAvailability = {
  sunday: { enabled: true, startTime: "08:00", endTime: "22:00" },
  monday: { enabled: true, startTime: "08:00", endTime: "22:00" },
  tuesday: { enabled: true, startTime: "08:00", endTime: "22:00" },
  wednesday: { enabled: true, startTime: "08:00", endTime: "22:00" },
  thursday: { enabled: true, startTime: "08:00", endTime: "22:00" },
  friday: { enabled: true, startTime: "08:00", endTime: "22:00" },
  saturday: { enabled: true, startTime: "08:00", endTime: "22:00" },
};

const WEEKDAYS_9_18: WeeklyAvailability = {
  sunday: { enabled: false, startTime: "09:00", endTime: "18:00" },
  monday: { enabled: true, startTime: "09:00", endTime: "18:00" },
  tuesday: { enabled: true, startTime: "09:00", endTime: "18:00" },
  wednesday: { enabled: true, startTime: "09:00", endTime: "18:00" },
  thursday: { enabled: true, startTime: "09:00", endTime: "18:00" },
  friday: { enabled: true, startTime: "09:00", endTime: "18:00" },
  saturday: { enabled: false, startTime: "09:00", endTime: "18:00" },
};

/**
 * Restaurant service: lunch and dinner with the afternoon closed between them.
 * The gap is a blocked window rather than two schedules, because a weekday
 * carries one open range.
 */
const RESTAURANT_SERVICE: WeeklyAvailability = {
  sunday: { enabled: true, startTime: "13:00", endTime: "18:00" },
  monday: { enabled: false, startTime: "13:00", endTime: "23:00" },
  tuesday: {
    enabled: true,
    startTime: "13:00",
    endTime: "23:00",
    blockedWindows: [{ startTime: "16:00", endTime: "19:00" }],
  },
  wednesday: {
    enabled: true,
    startTime: "13:00",
    endTime: "23:00",
    blockedWindows: [{ startTime: "16:00", endTime: "19:00" }],
  },
  thursday: {
    enabled: true,
    startTime: "13:00",
    endTime: "23:00",
    blockedWindows: [{ startTime: "16:00", endTime: "19:00" }],
  },
  friday: {
    enabled: true,
    startTime: "13:00",
    endTime: "23:30",
    blockedWindows: [{ startTime: "16:00", endTime: "19:00" }],
  },
  saturday: { enabled: true, startTime: "13:00", endTime: "23:30" },
};

const WED_TO_SUN_10_20: WeeklyAvailability = {
  sunday: { enabled: true, startTime: "10:00", endTime: "20:00" },
  monday: { enabled: false, startTime: "10:00", endTime: "20:00" },
  tuesday: { enabled: false, startTime: "10:00", endTime: "20:00" },
  wednesday: { enabled: true, startTime: "10:00", endTime: "20:00" },
  thursday: { enabled: true, startTime: "10:00", endTime: "20:00" },
  friday: { enabled: true, startTime: "10:00", endTime: "20:00" },
  saturday: { enabled: true, startTime: "10:00", endTime: "20:00" },
};

export const VERTICALS: Vertical[] = [
  {
    id: "healthcare",
    label: "Healthcare",
    tagline: "For doctors and medical specialists",
    description: "Timed consultations and follow-ups on a weekday schedule.",
    availability: WEEKDAYS_9_17,
    services: [
      {
        name: "New patient consultation",
        bookingType: "appointment",
        durationMinutes: 30,
        description: "A focused first consultation for history, goals, and next steps.",
        medicalSpecialty: "",
        capacity: "1 patient",
        occurrenceMode: "periodic",
        occurrenceDate: "",
        weekdays: [],
        startTime: "",
        endTime: "",
        maxSpots: "",
        maxPartySize: "",
        cost: "$120",
        notes: "",
        linkedAddress1: false,
        linkedAddress2: false,
        linkedPhone1: false,
        linkedPhone2: false,
        customAddress: "",
        customPhone: "",
      },
      {
        name: "Follow-up visit",
        bookingType: "appointment",
        durationMinutes: 15,
        description: "A short check-in to review progress and adjust care.",
        medicalSpecialty: "",
        capacity: "1 patient",
        occurrenceMode: "periodic",
        occurrenceDate: "",
        weekdays: [],
        startTime: "",
        endTime: "",
        maxSpots: "",
        maxPartySize: "",
        cost: "$60",
        notes: "",
        linkedAddress1: false,
        linkedAddress2: false,
        linkedPhone1: false,
        linkedPhone2: false,
        customAddress: "",
        customPhone: "",
      },
    ],
    hints: {
      serviceName: "Annual check-up",
      description: "What this visit covers.",
      medicalSpecialty: "Family medicine",
      capacity: "1 patient",
      cost: "$120 / visit",
    },
  },
  {
    id: "spaces",
    label: "Spaces",
    tagline: "For courts, venues, and shared offices",
    description: "Hourly rentals and full-day reservations, open every day.",
    availability: ALL_DAYS_8_22,
    services: [
      {
        name: "Court / space rental",
        bookingType: "appointment",
        durationMinutes: 60,
        description: "Reserve the space by the hour for training, matches, or private use.",
        capacity: "Up to 4 people",
        occurrenceMode: "periodic",
        occurrenceDate: "",
        weekdays: [],
        startTime: "",
        endTime: "",
        maxSpots: "",
        maxPartySize: "",
        cost: "$40 / hour",
        notes: "",
        linkedAddress1: false,
        linkedAddress2: false,
        linkedPhone1: false,
        linkedPhone2: false,
        customAddress: "",
        customPhone: "",
      },
      {
        name: "Full-day venue",
        bookingType: "full-day",
        durationMinutes: 60,
        description: "Exclusive full-day reservation for events and private functions.",
        capacity: "Up to 100 guests",
        occurrenceMode: "periodic",
        occurrenceDate: "",
        weekdays: [],
        startTime: "",
        endTime: "",
        maxSpots: "",
        maxPartySize: "",
        cost: "Full-day package",
        notes: "",
        linkedAddress1: false,
        linkedAddress2: false,
        linkedPhone1: false,
        linkedPhone2: false,
        customAddress: "",
        customPhone: "",
      },
    ],
    hints: {
      serviceName: "Court rental",
      description: "What the booking includes.",
      capacity: "Up to 4 people",
      cost: "$40 / hour",
    },
  },
  {
    id: "professional",
    label: "Professional services",
    tagline: "For advisors, accountants, and consultants",
    description: "Strategy sessions and quick consults on a weekday schedule.",
    availability: WEEKDAYS_9_18,
    services: [
      {
        name: "Strategy session",
        bookingType: "appointment",
        durationMinutes: 60,
        description: "Structured planning covering goals, priorities, and action items.",
        capacity: "1 client",
        occurrenceMode: "periodic",
        occurrenceDate: "",
        weekdays: [],
        startTime: "",
        endTime: "",
        maxSpots: "",
        maxPartySize: "",
        cost: "$200",
        notes: "",
        linkedAddress1: false,
        linkedAddress2: false,
        linkedPhone1: false,
        linkedPhone2: false,
        customAddress: "",
        customPhone: "",
      },
      {
        name: "Quick consult",
        bookingType: "appointment",
        durationMinutes: 30,
        description: "A short session to answer a focused question.",
        capacity: "1 client",
        occurrenceMode: "periodic",
        occurrenceDate: "",
        weekdays: [],
        startTime: "",
        endTime: "",
        maxSpots: "",
        maxPartySize: "",
        cost: "$90",
        notes: "",
        linkedAddress1: false,
        linkedAddress2: false,
        linkedPhone1: false,
        linkedPhone2: false,
        customAddress: "",
        customPhone: "",
      },
    ],
    hints: {
      serviceName: "Strategy session",
      description: "What this session covers.",
      capacity: "1 client",
      cost: "$200 / session",
    },
  },
  {
    id: "events",
    label: "Events",
    tagline: "For races, workshops, classes, and gatherings",
    description: "One-time and recurring registrations with schedules, locations, and real capacity.",
    availability: WED_TO_SUN_10_20,
    services: [
      {
        name: "General admission",
        bookingType: "appointment",
        durationMinutes: 120,
        description: "A single attendee ticket for the session.",
        capacity: "Up to 50 attendees",
        occurrenceMode: "single",
        occurrenceDate: "",
        weekdays: [],
        startTime: "18:00",
        endTime: "20:00",
        maxSpots: "50",
        maxPartySize: "",
        cost: "$25 / ticket",
        notes: "",
        linkedAddress1: false,
        linkedAddress2: false,
        linkedPhone1: false,
        linkedPhone2: false,
        customAddress: "",
        customPhone: "",
      },
      {
        name: "Full-day pass",
        bookingType: "full-day",
        durationMinutes: 120,
        description: "All-day access covering every session and activity.",
        capacity: "Up to 200 attendees",
        occurrenceMode: "single",
        occurrenceDate: "",
        weekdays: [],
        startTime: "10:00",
        endTime: "20:00",
        maxSpots: "200",
        maxPartySize: "",
        cost: "Full-day pass",
        notes: "",
        linkedAddress1: false,
        linkedAddress2: false,
        linkedPhone1: false,
        linkedPhone2: false,
        customAddress: "",
        customPhone: "",
      },
    ],
    hints: {
      serviceName: "City race, workshop, or class",
      description: "What attendees can expect, where to arrive, and what is included.",
      capacity: "Up to 50 attendees",
      cost: "$25 / ticket",
    },
  },
  {
    id: "restaurant",
    label: "Restaurants",
    tagline: "For dining rooms taking table reservations",
    description:
      "A set number of tables at each seating, with lunch and dinner on the same day.",
    availability: RESTAURANT_SERVICE,
    services: [
      {
        name: "Dinner table",
        bookingType: "appointment",
        durationMinutes: 90,
        description: "A table for the evening service, held for 90 minutes.",
        capacity: "",
        occurrenceMode: "periodic",
        occurrenceDate: "",
        weekdays: [],
        startTime: "",
        endTime: "",
        maxSpots: "12",
        maxPartySize: "8",
        capacityScope: "slot",
        cost: "",
        notes: "",
        linkedAddress1: false,
        linkedAddress2: false,
        linkedPhone1: false,
        linkedPhone2: false,
        customAddress: "",
        customPhone: "",
      },
      {
        name: "Lunch table",
        bookingType: "appointment",
        durationMinutes: 60,
        description: "A midday table, held for an hour.",
        capacity: "",
        occurrenceMode: "periodic",
        occurrenceDate: "",
        weekdays: [],
        startTime: "",
        endTime: "",
        maxSpots: "10",
        maxPartySize: "6",
        capacityScope: "slot",
        cost: "",
        notes: "",
        linkedAddress1: false,
        linkedAddress2: false,
        linkedPhone1: false,
        linkedPhone2: false,
        customAddress: "",
        customPhone: "",
      },
    ],
    hints: {
      serviceName: "Dinner table",
      description: "What the seating includes and how long the table is held.",
      capacity: "12 tables per seating",
      cost: "Set menu $45",
    },
  },
];

const SPANISH_VERTICAL_CONTENT: Record<
  VerticalId,
  Pick<Vertical, "label" | "tagline" | "description" | "hints"> & {
    services: Array<Pick<ServiceDraft, "name" | "description" | "medicalSpecialty" | "capacity" | "cost">>;
  }
> = {
  healthcare: {
    label: "Salud",
    tagline: "Para médicos y especialistas",
    description: "Consultas y seguimientos con horario durante la semana.",
    services: [
      {
        name: "Consulta para pacientes nuevos",
        description: "Una primera consulta enfocada en antecedentes, objetivos y próximos pasos.",
        medicalSpecialty: "",
        capacity: "1 paciente",
        cost: "$120",
      },
      {
        name: "Consulta de seguimiento",
        description: "Una consulta breve para revisar avances y ajustar la atención.",
        medicalSpecialty: "",
        capacity: "1 paciente",
        cost: "$60",
      },
    ],
    hints: {
      serviceName: "Revisión anual",
      description: "Qué incluye esta consulta.",
      medicalSpecialty: "Medicina familiar",
      capacity: "1 paciente",
      cost: "$120 / consulta",
    },
  },
  spaces: {
    label: "Espacios",
    tagline: "Para canchas, recintos y oficinas compartidas",
    description: "Reservas por hora y de día completo, disponibles todos los días.",
    services: [
      {
        name: "Renta de cancha o espacio",
        description: "Reserve por hora para entrenamientos, partidos o uso privado.",
        capacity: "Hasta 4 personas",
        cost: "$40 / hora",
      },
      {
        name: "Recinto de día completo",
        description: "Reserva exclusiva de día completo para eventos y funciones privadas.",
        capacity: "Hasta 100 invitados",
        cost: "Paquete de día completo",
      },
    ],
    hints: {
      serviceName: "Renta de cancha",
      description: "Qué incluye la reserva.",
      capacity: "Hasta 4 personas",
      cost: "$40 / hora",
    },
  },
  professional: {
    label: "Servicios profesionales",
    tagline: "Para asesores, contadores y consultores",
    description: "Sesiones de estrategia y consultas breves durante la semana.",
    services: [
      {
        name: "Sesión de estrategia",
        description: "Planificación estructurada de objetivos, prioridades y acciones.",
        capacity: "1 cliente",
        cost: "$200",
      },
      {
        name: "Consulta breve",
        description: "Una sesión corta para resolver una pregunta específica.",
        capacity: "1 cliente",
        cost: "$90",
      },
    ],
    hints: {
      serviceName: "Sesión de estrategia",
      description: "Qué incluye esta sesión.",
      capacity: "1 cliente",
      cost: "$200 / sesión",
    },
  },
  events: {
    label: "Eventos",
    tagline: "Para carreras, talleres, clases y encuentros",
    description: "Registros únicos y recurrentes con horarios, ubicaciones y cupo real.",
    services: [
      {
        name: "Entrada general",
        description: "Un boleto individual para asistir a la sesión.",
        capacity: "Hasta 50 participantes",
        cost: "$25 / boleto",
      },
      {
        name: "Pase de día completo",
        description: "Acceso durante todo el día a cada sesión y actividad.",
        capacity: "Hasta 200 participantes",
        cost: "Pase de día completo",
      },
    ],
    hints: {
      serviceName: "Carrera, taller o clase",
      description: "Qué pueden esperar los asistentes, dónde llegar y qué está incluido.",
      capacity: "Hasta 50 participantes",
      cost: "$25 / boleto",
    },
  },
  restaurant: {
    label: "Restaurantes",
    tagline: "Para comedores que reservan mesas",
    description:
      "Un número fijo de mesas en cada turno, con comida y cena el mismo día.",
    services: [
      {
        name: "Mesa para cena",
        description: "Una mesa para el servicio de la noche, reservada por 90 minutos.",
        capacity: "",
        cost: "",
      },
      {
        name: "Mesa para comida",
        description: "Una mesa a mediodía, reservada por una hora.",
        capacity: "",
        cost: "",
      },
    ],
    hints: {
      serviceName: "Mesa para cena",
      description: "Qué incluye el turno y cuánto tiempo se reserva la mesa.",
      capacity: "12 mesas por turno",
      cost: "Menú fijo $45",
    },
  },
};

export function getVerticals(lang: Lang = "en"): Vertical[] {
  if (lang !== "es") return VERTICALS;

  return VERTICALS.map((vertical) => {
    const localized = SPANISH_VERTICAL_CONTENT[vertical.id];
    return {
      ...vertical,
      ...localized,
      services: vertical.services.map((service, index) => ({
        ...service,
        ...localized.services[index],
      })),
    };
  });
}

export function getVerticalPreset(id?: VerticalId, lang: Lang = "en") {
  if (!id) return undefined;
  return getVerticals(lang).find((vertical) => vertical.id === id);
}
