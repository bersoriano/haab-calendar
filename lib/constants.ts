import type { WeekdayKey } from "./types";

export const WEEKDAY_KEYS: WeekdayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

export const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30;
export const DURATION_OPTIONS = [15, 30, 60, 120, 180, 240];

export const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

export const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export const compactDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export const weekdayShortFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});

export const compactBadgeTextClass = "text-xs font-semibold uppercase tracking-[0.08em]";
export const compactMetaTextClass = "text-xs font-semibold uppercase tracking-[0.1em]";
export const BOOKING_HOLD_DURATION_MS = 10 * 60 * 1000;
export const DEFAULT_STORAGE_KEY = "haab-calendar-dev-clean";
