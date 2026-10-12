import { addDays, getDateKey } from "@/lib/date";
import type { BookingRecord } from "@/lib/types";

/** How busy a day is beside the month's busiest: 0 is empty, 4 the fullest. */
export type BookingMonthLevel = 0 | 1 | 2 | 3 | 4;

export type BookingMonthDay<T> = {
  dateKey: string;
  dayOfMonth: number;
  /** False for the days of the neighbouring months that fill out a week. */
  inMonth: boolean;
  isToday: boolean;
  /** Earliest first; a full-day booking, having no time, leads. */
  bookings: T[];
  level: BookingMonthLevel;
};

export type BookingMonth<T> = {
  weeks: BookingMonthDay<T>[][];
  /** Bookings on the month's own days. */
  total: number;
};

/**
 * A day is shaded against the busiest day of its month, but never against
 * fewer than this: in a month with one booking a day, no day is a full one.
 */
const FULLEST_AT_LEAST = 4;

/**
 * The bookings that take time, by day, earliest first; a full-day booking,
 * having no time, leads its day. Cancelled bookings take none, so they are
 * left out.
 */
export function liveBookingsByDate<T extends Pick<BookingRecord, "dateKey" | "startTime" | "status">>(
  bookings: readonly T[],
): Map<string, T[]> {
  const byDate = new Map<string, T[]>();

  for (const booking of bookings) {
    if (booking.status === "cancelled") continue;
    const sameDay = byDate.get(booking.dateKey);
    if (sameDay) sameDay.push(booking);
    else byDate.set(booking.dateKey, [booking]);
  }

  for (const sameDay of byDate.values()) {
    sameDay.sort((left, right) => (left.startTime ?? "").localeCompare(right.startTime ?? ""));
  }

  return byDate;
}

/**
 * One month as whole weeks, Sunday first, with each day's live bookings.
 * Cancelled bookings take no time, so they are left out. Days borrowed from
 * the neighbouring months come empty: the view is of this month.
 */
export function buildBookingMonth<
  T extends Pick<BookingRecord, "dateKey" | "startTime" | "status">,
>(bookings: readonly T[], anchor: Date, todayKey: string): BookingMonth<T> {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay());
  const weekCount = Math.ceil((firstOfMonth.getDay() + daysInMonth) / 7);

  const byDate = liveBookingsByDate(bookings);

  const days = Array.from({ length: weekCount * 7 }, (_, index) => {
    const date = addDays(gridStart, index);
    const dateKey = getDateKey(date);
    const inMonth = date.getMonth() === month;
    const dayBookings = inMonth ? (byDate.get(dateKey) ?? []) : [];

    return { dateKey, dayOfMonth: date.getDate(), inMonth, isToday: dateKey === todayKey, bookings: dayBookings };
  });

  const fullest = Math.max(FULLEST_AT_LEAST, ...days.map((day) => day.bookings.length));

  return {
    weeks: Array.from({ length: weekCount }, (_, week) =>
      days.slice(week * 7, week * 7 + 7).map((day) => ({
        ...day,
        level: Math.ceil((day.bookings.length / fullest) * 4) as BookingMonthLevel,
      })),
    ),
    total: days.reduce((sum, day) => sum + day.bookings.length, 0),
  };
}
