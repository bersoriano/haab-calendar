import { toMinutes, addMinutes, getWeekdayKey, isPastDate } from "./date";
import type {
  BookingHoldRecord,
  BookingRecord,
  Service,
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
