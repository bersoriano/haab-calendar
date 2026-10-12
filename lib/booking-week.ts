import { liveBookingsByDate } from "@/lib/booking-month";
import { addDays, getDateKey, getWeekStart } from "@/lib/date";
import type { BookingRecord } from "@/lib/types";

export type BookingWeekDay<T> = {
  dateKey: string;
  dayOfMonth: number;
  isToday: boolean;
  /** Earliest first; a full-day booking, having no time, leads. */
  bookings: T[];
};

export type BookingWeek<T> = {
  /** Sunday to Saturday. */
  days: BookingWeekDay<T>[];
  total: number;
};

/**
 * The week a day falls in, Sunday first, with each day's live bookings.
 * Cancelled bookings take no time, so they are left out.
 */
export function buildBookingWeek<T extends Pick<BookingRecord, "dateKey" | "startTime" | "status">>(
  bookings: readonly T[],
  anchor: Date,
  todayKey: string,
): BookingWeek<T> {
  const byDate = liveBookingsByDate(bookings);
  const start = getWeekStart(anchor);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const dateKey = getDateKey(date);

    return {
      dateKey,
      dayOfMonth: date.getDate(),
      isToday: dateKey === todayKey,
      bookings: byDate.get(dateKey) ?? [],
    };
  });

  return { days, total: days.reduce((sum, day) => sum + day.bookings.length, 0) };
}
