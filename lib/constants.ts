import type { Lang, WeekdayKey } from "./types";

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

const LOCALE: Record<Lang, string> = { en: "en-US", es: "es-MX" };

function memoFormatter(make: (locale: string) => Intl.DateTimeFormat) {
  const cache = new Map<Lang, Intl.DateTimeFormat>();
  return (lang: Lang = "en") => {
    let f = cache.get(lang);
    if (!f) {
      f = make(LOCALE[lang]);
      cache.set(lang, f);
    }
    return f;
  };
}

export const getMonthFormatter = memoFormatter(
  (locale) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
);
export const getLongDateFormatter = memoFormatter(
  (locale) => new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
);
export const getCompactDateFormatter = memoFormatter(
  (locale) => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }),
);
export const getWeekdayShortFormatter = memoFormatter(
  (locale) => new Intl.DateTimeFormat(locale, { weekday: "short" }),
);

// Backward-compatible English singletons (existing importers).
export const monthFormatter = getMonthFormatter("en");
export const longDateFormatter = getLongDateFormatter("en");
export const compactDateFormatter = getCompactDateFormatter("en");
export const weekdayShortFormatter = getWeekdayShortFormatter("en");

export const compactBadgeTextClass = "text-xs font-semibold uppercase tracking-[0.08em]";
export const compactMetaTextClass = "text-xs font-semibold uppercase tracking-[0.1em]";
export const BOOKING_HOLD_DURATION_MS = 10 * 60 * 1000;
export const DEFAULT_STORAGE_KEY = "haab-calendar-dev-clean";
