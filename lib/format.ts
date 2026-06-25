import {
  getMonthFormatter,
  getLongDateFormatter,
  getCompactDateFormatter,
} from "./constants";
import { parseDateKey } from "./date";
import { pad } from "./utils";
import type { BookingStatus, BookingType, Lang, Service } from "./types";

const FULL_DAY: Record<Lang, string> = { en: "Full Day", es: "Día completo" };
const APPOINTMENT: Record<Lang, string> = { en: "Appointment", es: "Cita" };

export function formatDateLabel(dateKey: string, lang: Lang = "en") {
  return getLongDateFormatter(lang).format(parseDateKey(dateKey));
}

export function formatCompactDate(dateKey: string, lang: Lang = "en") {
  return getCompactDateFormatter(lang).format(parseDateKey(dateKey));
}

export function formatMonthLabel(date: Date, lang: Lang = "en") {
  return getMonthFormatter(lang).format(date);
}

export function formatTimeLabel(time?: string, lang: Lang = "en") {
  if (!time) return FULL_DAY[lang];
  const [hours, minutes] = time.split(":").map(Number);
  if (lang === "es") return `${hours === 0 ? "00" : hours}:${pad(minutes)}`;
  const meridiem = hours >= 12 ? "PM" : "AM";
  const safeHours = hours % 12 || 12;
  return `${safeHours}:${pad(minutes)} ${meridiem}`;
}

export function formatTimeRange(startTime?: string, endTime?: string, lang: Lang = "en") {
  if (!startTime || !endTime) return FULL_DAY[lang];
  return `${formatTimeLabel(startTime, lang)} - ${formatTimeLabel(endTime, lang)}`;
}

export function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${pad(seconds)}`;
}

export function formatDuration(service: Service, lang: Lang = "en") {
  if (service.bookingType === "full-day") return FULL_DAY[lang];
  if (!service.durationMinutes) return APPOINTMENT[lang];
  if (service.durationMinutes >= 60 && service.durationMinutes % 60 === 0) {
    const hours = service.durationMinutes / 60;
    if (lang === "es") return `${hours} h`;
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }
  return `${service.durationMinutes} min`;
}

export function formatCapacityLabel(service: Service, lang: Lang = "en") {
  // Events carry a numeric spots cap — the single source of truth for capacity.
  if (typeof service.maxSpots === "number" && Number.isFinite(service.maxSpots)) {
    if (lang === "es") return `Hasta ${service.maxSpots} ${service.maxSpots === 1 ? "lugar" : "lugares"}`;
    return `Up to ${service.maxSpots} ${service.maxSpots === 1 ? "spot" : "spots"}`;
  }
  if (service.capacity) return service.capacity;
  if (lang === "es") return service.bookingType === "appointment" ? "1 cliente" : "No definido";
  return service.bookingType === "appointment" ? "1 client" : "Not set";
}

export function getBookingTypeLabel(type: BookingType, lang: Lang = "en") {
  if (lang === "es") return type === "appointment" ? "Cita" : "Día completo";
  return type === "appointment" ? "Appointment" : "Full Day";
}

export function statusTone(status: BookingStatus) {
  if (status === "cancelled") {
    return "danger";
  }

  if (status === "rescheduled") {
    return "secondary";
  }

  return "primary";
}

export function bookingTypeTone(type: BookingType) {
  return type === "appointment" ? "primary" : "secondary";
}
