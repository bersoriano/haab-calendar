import type { ServiceDraft } from "../lib/types";

export const QUICK_START_TEMPLATES: Array<{
  label: string;
  service: ServiceDraft;
}> = [
  {
    label: "Doctor",
    service: {
      name: "New Patient Consultation",
      bookingType: "appointment",
      durationMinutes: 30,
      description: "A focused first consultation for history, goals, and next steps.",
      capacity: "1 client",
      cost: "$120 consult",
      notes: "",
    },
  },
  {
    label: "Padel",
    service: {
      name: "Court Rental",
      bookingType: "appointment",
      durationMinutes: 60,
      description: "Reserve a court for training, matches, or private play.",
      capacity: "Max 4 players",
      cost: "$40 per hour",
      notes: "",
    },
  },
  {
    label: "Advisor",
    service: {
      name: "Strategy Session",
      bookingType: "appointment",
      durationMinutes: 60,
      description: "Structured planning session covering goals, priorities, and action items.",
      capacity: "1 household",
      cost: "Premium advisory session",
      notes: "",
    },
  },
  {
    label: "Banquet Hall",
    service: {
      name: "Banquet Hall Exclusive",
      bookingType: "full-day",
      durationMinutes: 60,
      description: "Full-day venue reservation for events, receptions, and private functions.",
      capacity: "Fits up to 100 guests",
      cost: "Full-day venue package",
      notes: "",
    },
  },
  {
    label: "Coworking",
    service: {
      name: "Private Office",
      bookingType: "full-day",
      durationMinutes: 60,
      description: "Quiet dedicated office booking for an entire workday.",
      capacity: "Seats up to 3 people",
      cost: "Day pass bundle",
      notes: "",
    },
  },
];
