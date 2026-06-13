import type { ServiceDraft, VerticalId, WeeklyAvailability } from "../lib/types";

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
    tagline: "For workshops, classes, and gatherings",
    description: "Ticketed admissions and full-day passes, open later and on weekends.",
    availability: WED_TO_SUN_10_20,
    services: [
      {
        name: "General admission",
        bookingType: "appointment",
        durationMinutes: 120,
        description: "A single attendee ticket for the session.",
        capacity: "Up to 50 attendees",
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
      serviceName: "Workshop session",
      description: "What attendees can expect.",
      capacity: "Up to 50 attendees",
      cost: "$25 / ticket",
    },
  },
];
