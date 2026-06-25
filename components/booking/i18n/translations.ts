import type { Lang } from "@/lib/types";

export type BookingDict = {
  common: {
    back: string;
    next: string;
    confirm: string;
    cancel: string;
    loading: string;
    required: string;
  };
  public: {
    yourName: string;
    email: string;
    phone: string;
    notes: string;
    selectDate: string;
    selectTime: string;
    holdRemaining: string;
    spotsLeftSuffix: string;
    fullyBooked: string;
  };
  manage: {
    title: string;
    lookupPrompt: string;
    notFound: string;
    cancelConfirm: string;
    rescheduleTitle: string;
    cancelled: string;
    rescheduled: string;
  };
};

export const bookingTranslations: Record<Lang, BookingDict> = {
  en: {
    common: {
      back: "Back",
      next: "Next",
      confirm: "Confirm",
      cancel: "Cancel",
      loading: "Loading…",
      required: "Required",
    },
    public: {
      yourName: "Your name",
      email: "Email",
      phone: "Phone",
      notes: "Notes",
      selectDate: "Select a date",
      selectTime: "Select a time",
      holdRemaining: "Time left to confirm",
      spotsLeftSuffix: "left",
      fullyBooked: "Fully booked",
    },
    manage: {
      title: "Manage your booking",
      lookupPrompt: "Enter your booking reference",
      notFound: "We couldn't find that booking.",
      cancelConfirm: "Are you sure you want to cancel?",
      rescheduleTitle: "Reschedule your booking",
      cancelled: "Your booking has been cancelled.",
      rescheduled: "Your booking has been rescheduled.",
    },
  },
  es: {
    common: {
      back: "Atrás",
      next: "Siguiente",
      confirm: "Confirmar",
      cancel: "Cancelar",
      loading: "Cargando…",
      required: "Obligatorio",
    },
    public: {
      yourName: "Su nombre",
      email: "Correo electrónico",
      phone: "Teléfono",
      notes: "Notas",
      selectDate: "Seleccione una fecha",
      selectTime: "Seleccione un horario",
      holdRemaining: "Tiempo restante para confirmar",
      spotsLeftSuffix: "disponibles",
      fullyBooked: "Cupo lleno",
    },
    manage: {
      title: "Gestione su reserva",
      lookupPrompt: "Ingrese su referencia de reserva",
      notFound: "No encontramos esa reserva.",
      cancelConfirm: "¿Está seguro de que desea cancelar?",
      rescheduleTitle: "Reagende su reserva",
      cancelled: "Su reserva ha sido cancelada.",
      rescheduled: "Su reserva ha sido reagendada.",
    },
  },
};

export function bookingT(lang: Lang = "en"): BookingDict {
  return bookingTranslations[lang] ?? bookingTranslations.en;
}
