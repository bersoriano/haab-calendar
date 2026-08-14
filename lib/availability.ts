import {
  addMinutes,
  compareDateKeys,
  getDateTimeKeysInTimeZone,
  getWeekdayKey,
  toMinutes,
} from "./date";
import type {
  BookingHoldRecord,
  BookingRecord,
  BookingType,
  Service,
  WeekdayKey,
  WeeklyAvailability,
} from "./types";

export type AvailabilityClock = {
  now?: Date;
  timeZone?: string;
};

function resolveAvailabilityClock(clock?: AvailabilityClock) {
  const now = clock?.now ?? new Date();
  const { dateKey, timeKey } = getDateTimeKeysInTimeZone(now, clock?.timeZone);

  return {
    dateKey,
    timeMinutes: toMinutes(timeKey),
  };
}

function isPastAvailabilityDate(dateKey: string, clock: ReturnType<typeof resolveAvailabilityClock>) {
  return compareDateKeys(dateKey, clock.dateKey) < 0;
}

function hasSlotStarted(
  dateKey: string,
  startTime: string,
  clock: ReturnType<typeof resolveAvailabilityClock>,
) {
  const dateComparison = compareDateKeys(dateKey, clock.dateKey);

  return dateComparison < 0 ||
    (dateComparison === 0 && toMinutes(startTime) <= clock.timeMinutes);
}

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
  bookingHolds: BookingHoldRecord[] = [],
  ignoredHoldId?: string,
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
  const held = bookingHolds.filter(
    (hold) =>
      hold.serviceId === service.id &&
      hold.dateKey === dateKey &&
      hold.id !== ignoredHoldId,
  ).length;

  return service.maxSpots - taken - held;
}

// An event runs on the same provider as every other service, so anything else
// scheduled across its window takes it off the calendar: a full-day booking on
// that date, or an overlapping booking or hold from another service.
//
// Bookings of the event's own service are its attendees — dozens of them share
// the one window by design — so they are governed by `getSpotsLeft` instead and
// never block here.
function isEventWindowTaken(
  service: Service,
  dateKey: string,
  bookings: BookingRecord[],
  ignoredBookingId?: string,
  bookingHolds: BookingHoldRecord[] = [],
  ignoredHoldId?: string,
) {
  const startTime = service.startTime;
  const endTime =
    service.endTime ??
    (startTime && service.durationMinutes
      ? addMinutes(startTime, service.durationMinutes)
      : undefined);

  if (!startTime || !endTime) {
    return false;
  }

  const takesEventWindow = (occupant: {
    serviceId: string;
    bookingType: BookingType;
    startTime?: string;
    endTime?: string;
  }) => {
    if (occupant.serviceId === service.id) {
      return false;
    }

    if (occupant.bookingType === "full-day") {
      return true;
    }

    const occupantStart = occupant.startTime;
    const occupantEnd = occupant.endTime;

    if (!occupantStart || !occupantEnd) {
      return false;
    }

    return overlapExists(startTime, endTime, occupantStart, occupantEnd);
  };

  return (
    getBookingsForDate(bookings, dateKey, ignoredBookingId).some(takesEventWindow) ||
    getBookingHoldsForDate(bookingHolds, dateKey, ignoredHoldId).some(takesEventWindow)
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
  clockOptions?: AvailabilityClock,
) {
  const effectiveClockOptions = {
    ...clockOptions,
    now: clockOptions?.now ?? new Date(),
  };
  const clock = resolveAvailabilityClock(effectiveClockOptions);

  // Single-occurrence events ignore weekly availability: the only bookable slot
  // is the fixed window on the event's own date, while spots remain.
  if (isSingleOccurrence(service)) {
    if (
      !service.occurrenceDate ||
      service.occurrenceDate !== dateKey ||
      !service.startTime ||
      isPastAvailabilityDate(dateKey, clock) ||
      hasSlotStarted(dateKey, service.startTime, clock) ||
      isEventWindowTaken(
        service,
        dateKey,
        bookings,
        ignoredBookingId,
        bookingHolds,
        ignoredHoldId,
      ) ||
      getSpotsLeft(
        service,
        dateKey,
        bookings,
        ignoredBookingId,
        bookingHolds,
        ignoredHoldId,
      ) <= 0
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
      isPastAvailabilityDate(dateKey, clock) ||
      hasSlotStarted(dateKey, service.startTime, clock) ||
      isEventWindowTaken(
        service,
        dateKey,
        bookings,
        ignoredBookingId,
        bookingHolds,
        ignoredHoldId,
      ) ||
      getSpotsLeft(
        service,
        dateKey,
        bookings,
        ignoredBookingId,
        bookingHolds,
        ignoredHoldId,
      ) <= 0
    ) {
      return [];
    }
    return [service.startTime];
  }

  if (service.bookingType !== "appointment" || !service.durationMinutes) {
    return [];
  }

  if (isPastAvailabilityDate(dateKey, clock)) {
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

    if (
      !hasSlotStarted(dateKey, cursor, clock) &&
      !blockedByBooking &&
      !blockedByHold &&
      !blockedByAvailability
    ) {
      slots.push(cursor);
    }

    cursor = addMinutes(cursor, service.durationMinutes);
  }

  return slots;
}

// How full a single day is, for the calendar's colour coding.
//
// `capacity` is what the day could ever offer, ignoring bookings, holds,
// blocked windows and elapsed time; `free` is what is bookable right now. A
// day with no capacity was never a candidate (past date, disabled weekday, a
// date the event does not fall on), which is what separates "closed" from a
// day that filled up.
export type DayAvailabilityLevel = "open" | "tight" | "full" | "closed";

export type DayAvailability = {
  capacity: number;
  free: number;
  ratio: number;
  level: DayAvailabilityLevel;
};

const CLOSED_DAY: DayAvailability = {
  capacity: 0,
  free: 0,
  ratio: 0,
  level: "closed",
};

function toDayAvailability(capacity: number, free: number): DayAvailability {
  if (capacity <= 0) {
    return CLOSED_DAY;
  }

  const boundedFree = Math.max(0, Math.min(free, capacity));
  const ratio = boundedFree / capacity;

  return {
    capacity,
    free: boundedFree,
    ratio,
    level: boundedFree === 0 ? "full" : ratio >= 0.5 ? "open" : "tight",
  };
}

// Slots the weekly schedule yields for this weekday at the service's duration,
// before anything is taken off it.
function getScheduleCapacity(service: Service, daySchedule: WeeklyAvailability[WeekdayKey]) {
  if (!service.durationMinutes) {
    return 0;
  }

  const start = toMinutes(daySchedule.startTime);
  const end = toMinutes(daySchedule.endTime);

  if (end <= start) {
    return 0;
  }

  return Math.floor((end - start) / service.durationMinutes);
}

export function getDayAvailability(
  dateKey: string,
  service: Service,
  availability: WeeklyAvailability,
  bookings: BookingRecord[],
  ignoredBookingId?: string,
  bookingHolds: BookingHoldRecord[] = [],
  ignoredHoldId?: string,
  clockOptions?: AvailabilityClock,
): DayAvailability {
  const effectiveClockOptions = {
    ...clockOptions,
    now: clockOptions?.now ?? new Date(),
  };
  const clock = resolveAvailabilityClock(effectiveClockOptions);

  if (isPastAvailabilityDate(dateKey, clock)) {
    return CLOSED_DAY;
  }

  // Events carry their own capacity: the date either hosts the occurrence or it
  // is not a candidate at all, and spots are the denominator when capped.
  if (isSingleOccurrence(service) || isWeeklyOccurrence(service)) {
    const hostsOccurrence = isSingleOccurrence(service)
      ? Boolean(service.occurrenceDate) && service.occurrenceDate === dateKey
      : weeklyMatchesDate(service, dateKey);

    if (!hostsOccurrence || !service.startTime) {
      return CLOSED_DAY;
    }

    const capacity =
      typeof service.maxSpots === "number" && Number.isFinite(service.maxSpots)
        ? Math.max(0, service.maxSpots)
        : 1;

    if (
      hasSlotStarted(dateKey, service.startTime, clock) ||
      isEventWindowTaken(
        service,
        dateKey,
        bookings,
        ignoredBookingId,
        bookingHolds,
        ignoredHoldId,
      )
    ) {
      return toDayAvailability(capacity, 0);
    }

    const spotsLeft = getSpotsLeft(
      service,
      dateKey,
      bookings,
      ignoredBookingId,
      bookingHolds,
      ignoredHoldId,
    );

    return toDayAvailability(
      capacity,
      Number.isFinite(spotsLeft) ? Math.max(0, spotsLeft) : capacity,
    );
  }

  const daySchedule = availability[getWeekdayKey(dateKey)];

  if (!daySchedule.enabled) {
    return CLOSED_DAY;
  }

  // Appointments spread over the day's schedule, so the slot grid is the
  // denominator and blocked or elapsed slots simply shrink `free`.
  if (service.bookingType === "appointment") {
    const capacity = getScheduleCapacity(service, daySchedule);

    if (capacity <= 0) {
      return CLOSED_DAY;
    }

    const free = getAvailableSlots(
      dateKey,
      service,
      availability,
      bookings,
      ignoredBookingId,
      bookingHolds,
      ignoredHoldId,
      effectiveClockOptions,
    ).length;

    return toDayAvailability(capacity, free);
  }

  // Full-day and anything else is all-or-nothing: one notional slot per day.
  return toDayAvailability(
    1,
    isDateAvailable(
      dateKey,
      service,
      availability,
      bookings,
      ignoredBookingId,
      bookingHolds,
      ignoredHoldId,
      effectiveClockOptions,
    )
      ? 1
      : 0,
  );
}

export function isDateAvailable(
  dateKey: string,
  service: Service,
  availability: WeeklyAvailability,
  bookings: BookingRecord[],
  ignoredBookingId?: string,
  bookingHolds: BookingHoldRecord[] = [],
  ignoredHoldId?: string,
  clockOptions?: AvailabilityClock,
) {
  const effectiveClockOptions = {
    ...clockOptions,
    now: clockOptions?.now ?? new Date(),
  };
  const clock = resolveAvailabilityClock(effectiveClockOptions);

  if (isPastAvailabilityDate(dateKey, clock)) {
    return false;
  }

  // Single-occurrence events: only the event's own date is bookable, and only
  // while spots remain. Weekly availability does not apply.
  if (isSingleOccurrence(service)) {
    return (
      Boolean(service.occurrenceDate) &&
      service.occurrenceDate === dateKey &&
      Boolean(service.startTime) &&
      !hasSlotStarted(dateKey, service.startTime ?? "", clock) &&
      !isEventWindowTaken(
        service,
        dateKey,
        bookings,
        ignoredBookingId,
        bookingHolds,
        ignoredHoldId,
      ) &&
      getSpotsLeft(
        service,
        dateKey,
        bookings,
        ignoredBookingId,
        bookingHolds,
        ignoredHoldId,
      ) > 0
    );
  }

  // Weekly-recurring events: only the configured weekdays are bookable, capped
  // by per-date spots. Weekly availability does not apply.
  if (isWeeklyOccurrence(service)) {
    return (
      Boolean(service.startTime) &&
      weeklyMatchesDate(service, dateKey) &&
      !hasSlotStarted(dateKey, service.startTime ?? "", clock) &&
      !isEventWindowTaken(
        service,
        dateKey,
        bookings,
        ignoredBookingId,
        bookingHolds,
        ignoredHoldId,
      ) &&
      getSpotsLeft(
        service,
        dateKey,
        bookings,
        ignoredBookingId,
        bookingHolds,
        ignoredHoldId,
      ) > 0
    );
  }

  // Periodic events still respect their per-date capacity cap.
  if (
    getSpotsLeft(
      service,
      dateKey,
      bookings,
      ignoredBookingId,
      bookingHolds,
      ignoredHoldId,
    ) <= 0
  ) {
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
      effectiveClockOptions,
    ).length > 0;
  }

  // A full-day booking takes the whole open day, so any block that eats into
  // opening hours rules the date out. A block sitting entirely outside those
  // hours takes nothing off the day and is ignored.
  if (
    (daySchedule.blockedWindows ?? []).some(
      (block) =>
        toMinutes(block.endTime) > toMinutes(block.startTime) &&
        overlapExists(
          daySchedule.startTime,
          daySchedule.endTime,
          block.startTime,
          block.endTime,
        ),
    )
  ) {
    return false;
  }

  return (
    getBookingsForDate(bookings, dateKey, ignoredBookingId).length === 0 &&
    getBookingHoldsForDate(bookingHolds, dateKey, ignoredHoldId).length === 0
  );
}
