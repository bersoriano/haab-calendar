import {
  getMonthFormatter,
  getLongDateFormatter,
  getCompactDateFormatter,
} from "./constants";
import { parseDateKey } from "./date";
import { pad } from "./utils";
import type { BookingStatus, BookingType, Lang, OccurrenceMode, Service } from "./types";

const FULL_DAY: Record<Lang, string> = { en: "Full Day", es: "Día completo" };
const APPOINTMENT: Record<Lang, string> = { en: "Appointment", es: "Cita" };
const OCCURRENCE: Record<Lang, Record<OccurrenceMode, string>> = {
  en: { single: "Single", weekly: "Weekly", periodic: "Periodic" },
  es: { single: "Único", weekly: "Semanal", periodic: "Periódico" },
};

export function formatDateLabel(dateKey: string, lang: Lang = "en") {
  return getLongDateFormatter(lang).format(parseDateKey(dateKey));
}

/** "April 12, 1989": a birthday reads without the weekday. */
export function formatDateOfBirth(dateKey: string, lang: Lang = "en") {
  return new Intl.DateTimeFormat(lang, { year: "numeric", month: "long", day: "numeric" }).format(
    parseDateKey(dateKey),
  );
}

/** "Thursday, October 1" — the year is left off where the page already says when. */
export function formatWeekdayDate(dateKey: string, lang: Lang = "en") {
  return new Intl.DateTimeFormat(lang, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(parseDateKey(dateKey));
}

/** "Thu, October 1, 2026" — the pass's date block, where the long weekday would wrap. */
export function formatPassDate(dateKey: string, lang: Lang = "en") {
  return new Intl.DateTimeFormat(lang, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parseDateKey(dateKey));
}

/** "Thu, Oct 1" — the same date for a phone, where the long form wraps to three lines. */
export function formatPassDateCompact(dateKey: string, lang: Lang = "en") {
  return new Intl.DateTimeFormat(lang, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parseDateKey(dateKey));
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

/**
 * "9:00 – 9:30 AM": one meridiem when both ends share it, two when they do not
 * ("11:30 AM – 12:30 PM"). Spanish is 24h and has no meridiem to merge. Empty
 * when either end is missing, so a caller can fall back to its own wording.
 */
export function formatCompactTimeRange(
  startTime?: string,
  endTime?: string,
  lang: Lang = "en",
) {
  if (!startTime || !endTime) return "";
  const start = formatTimeLabel(startTime, lang);
  const end = formatTimeLabel(endTime, lang);
  if (lang === "es") return `${start} – ${end}`;
  const [startClock, startMeridiem] = start.split(" ");
  const [, endMeridiem] = end.split(" ");
  return startMeridiem === endMeridiem
    ? `${startClock} – ${end}`
    : `${start} – ${end}`;
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

export function getOccurrenceModeLabel(
  mode: OccurrenceMode | undefined,
  lang: Lang = "en",
) {
  return OCCURRENCE[lang][mode ?? "periodic"];
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

/** The app-ui badge palette; components/app-ui reads this type. */
export type StatusTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "admin";

export function bookingStatusBadgeTone(status: BookingStatus): StatusTone {
  if (status === "cancelled") return "danger";
  if (status === "rescheduled") return "warning";
  return "success";
}

export function bookingTypeBadgeTone(type: BookingType): StatusTone {
  return type === "appointment" ? "accent" : "neutral";
}

const STATUS_LABELS: Record<Lang, Record<BookingStatus, string>> = {
  en: { confirmed: "Confirmed", rescheduled: "Rescheduled", cancelled: "Cancelled" },
  es: { confirmed: "Confirmado", rescheduled: "Reagendado", cancelled: "Cancelado" },
};

export function getBookingStatusLabel(status: BookingStatus, lang: Lang = "en"): string {
  return STATUS_LABELS[lang]?.[status] ?? status;
}
