import { toMinutes, addMinutes, getWeekdayKey, isPastDate } from "./date";
import type {
  BookingHoldRecord,
  BookingRecord,
  Service,
  WeekdayKey,
  WeeklyAvailability,
} from "./types";

export function isActiveBooking(booking: BookingRecord) {
  return booking.status !== "cancelled";
}

export function overlapExists(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string,
) {
  return toMinutes(leftStart) < toMinutes(rightEnd) &&
    toMinutes(leftEnd) > toMinutes(rightStart);
}

export function getBookingsForDate(
  bookings: BookingRecord[],
  dateKey: string,
  ignoredBookingId?: string,
) {
  return bookings.filter(
    (booking) =>
      booking.dateKey === dateKey &&
      booking.id !== ignoredBookingId &&
    isActiveBooking(booking),
  );
}

export function isSingleOccurrence(service: Service) {
  return service.occurrenceMode === "single";
}

export function isWeeklyOccurrence(service: Service) {
  return service.occurrenceMode === "weekly";
}

// Whether a weekly-recurring event runs on the given date's weekday.
export function weeklyMatchesDate(service: Service, dateKey: string) {
  const weekday = getWeekdayKey(dateKey) as WeekdayKey;
  return (service.weekdays ?? []).includes(weekday);
}

// Remaining capacity for a service on a given date. Returns Infinity when the
// service has no maxSpots cap (every non-events service today).
export function getSpotsLeft(
  service: Service,
  dateKey: string,
  bookings: BookingRecord[],
  ignoredBookingId?: string,
) {
  if (typeof service.maxSpots !== "number" || !Number.isFinite(service.maxSpots)) {
    return Infinity;
  }

  const taken = bookings.filter(
    (booking) =>
      booking.serviceId === service.id &&
      booking.dateKey === dateKey &&
      booking.id !== ignoredBookingId &&
      isActiveBooking(booking),
  ).length;

  return service.maxSpots - taken;
}

export function getBookingHoldsForDate(
  bookingHolds: BookingHoldRecord[],
  dateKey: string,
  ignoredHoldId?: string,
) {
  return bookingHolds.filter(
    (hold) => hold.dateKey === dateKey && hold.id !== ignoredHoldId,
  );
}

export function getAvailableSlots(
  dateKey: string,
  service: Service,
  availability: WeeklyAvailability,
  bookings: BookingRecord[],
  ignoredBookingId?: string,
  bookingHolds: BookingHoldRecord[] = [],
  ignoredHoldId?: string,
) {
  // Single-occurrence events ignore weekly availability: the only bookable slot
  // is the fixed window on the event's own date, while spots remain.
  if (isSingleOccurrence(service)) {
    if (
      !service.occurrenceDate ||
      service.occurrenceDate !== dateKey ||
      !service.startTime ||
      isPastDate(dateKey) ||
      getSpotsLeft(service, dateKey, bookings, ignoredBookingId) <= 0
    ) {
      return [];
    }
    return [service.startTime];
  }

  // Weekly-recurring events: one fixed slot on each matching weekday, capped by
  // per-date spots. Weekly availability windows do not apply.
  if (isWeeklyOccurrence(service)) {
    if (
      !service.startTime ||
      !weeklyMatchesDate(service, dateKey) ||
      isPastDate(dateKey) ||
      getSpotsLeft(service, dateKey, bookings, ignoredBookingId) <= 0
    ) {
      return [];
    }
    return [service.startTime];
  }

  if (service.bookingType !== "appointment" || !service.durationMinutes) {
    return [];
  }

  if (isPastDate(dateKey)) {
    return [];
  }

  const weekday = getWeekdayKey(dateKey);
  const daySchedule = availability[weekday];

  if (!daySchedule.enabled || toMinutes(daySchedule.endTime) <= toMinutes(daySchedule.startTime)) {
    return [];
  }

  const dateBookings = getBookingsForDate(bookings, dateKey, ignoredBookingId);
  const dateHolds = getBookingHoldsForDate(bookingHolds, dateKey, ignoredHoldId);
  const blockedWindows = daySchedule.blockedWindows ?? [];

  if (
    dateBookings.some((booking) => booking.bookingType === "full-day") ||
    dateHolds.some((hold) => hold.bookingType === "full-day")
  ) {
    return [];
  }

  const slots: string[] = [];
  let cursor = daySchedule.startTime;

  while (toMinutes(cursor) + service.durationMinutes <= toMinutes(daySchedule.endTime)) {
    const slotEnd = addMinutes(cursor, service.durationMinutes);
    const blockedByBooking = dateBookings.some((booking) => {
      if (!booking.startTime || !booking.endTime) {
        return false;
      }

      return overlapExists(cursor, slotEnd, booking.startTime, booking.endTime);
    });
    const blockedByHold = dateHolds.some((hold) => {
      if (!hold.startTime || !hold.endTime) {
        return false;
      }

      return overlapExists(cursor, slotEnd, hold.startTime, hold.endTime);
    });
    const blockedByAvailability = blockedWindows.some((block) => {
      if (toMinutes(block.endTime) <= toMinutes(block.startTime)) {
        return false;
      }

      return overlapExists(cursor, slotEnd, block.startTime, block.endTime);
    });

    if (!blockedByBooking && !blockedByHold && !blockedByAvailability) {
      slots.push(cursor);
    }

    cursor = addMinutes(cursor, service.durationMinutes);
  }

  return slots;
}

export function isDateAvailable(
  dateKey: string,
  service: Service,
  availability: WeeklyAvailability,
  bookings: BookingRecord[],
  ignoredBookingId?: string,
  bookingHolds: BookingHoldRecord[] = [],
  ignoredHoldId?: string,
) {
  if (isPastDate(dateKey)) {
    return false;
  }

  // Single-occurrence events: only the event's own date is bookable, and only
  // while spots remain. Weekly availability does not apply.
  if (isSingleOccurrence(service)) {
    return (
      Boolean(service.occurrenceDate) &&
      service.occurrenceDate === dateKey &&
      getSpotsLeft(service, dateKey, bookings, ignoredBookingId) > 0
    );
  }

  // Weekly-recurring events: only the configured weekdays are bookable, capped
  // by per-date spots. Weekly availability does not apply.
  if (isWeeklyOccurrence(service)) {
    return (
      Boolean(service.startTime) &&
      weeklyMatchesDate(service, dateKey) &&
      getSpotsLeft(service, dateKey, bookings, ignoredBookingId) > 0
    );
  }

  // Periodic events still respect their per-date capacity cap.
  if (getSpotsLeft(service, dateKey, bookings, ignoredBookingId) <= 0) {
    return false;
  }

  const weekday = getWeekdayKey(dateKey);
  const daySchedule = availability[weekday];

  if (!daySchedule.enabled) {
    return false;
  }

  if (service.bookingType === "appointment") {
    return getAvailableSlots(
      dateKey,
      service,
      availability,
      bookings,
      ignoredBookingId,
      bookingHolds,
      ignoredHoldId,
    ).length > 0;
  }

  if (
    (daySchedule.blockedWindows ?? []).some(
      (block) => toMinutes(block.endTime) > toMinutes(block.startTime),
    )
  ) {
    return false;
  }

  return (
    getBookingsForDate(bookings, dateKey, ignoredBookingId).length === 0 &&
    getBookingHoldsForDate(bookingHolds, dateKey, ignoredHoldId).length === 0
  );
}
