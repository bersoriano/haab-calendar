import type { GoogleEventTime } from "@/lib/google/calendar-client";

/**
 * Turning a Haab booking's date and times into a Google event's time.
 *
 * Booking times are provider-local wall times — "09:00 on the first" means nine
 * in the morning where the provider works. They are *not* instants, and they are
 * not relative to whichever calendar the provider happened to pick: a provider
 * in Mexico City whose calendar is set to UTC still opens at nine local.
 * Sending the calendar's zone was a real defect; the provider's zone is the only
 * correct answer.
 *
 * Google resolves `dateTime` + `timeZone` itself, which also makes DST somebody
 * else's problem: an offset computed here would be wrong twice a year.
 */

export class EventTimeError extends Error {
  constructor(readonly code: string) {
    super(`Invalid booking time: ${code}`);
    this.name = "EventTimeError";
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;

function assertDate(value: string) {
  if (!DATE_PATTERN.test(value)) {
    throw new EventTimeError("invalid_date");
  }
}

/** Exclusive end date for an all-day event, which Google requires. */
export function nextDay(date: string): string {
  assertDate(date);

  // Built in UTC deliberately: this is date arithmetic on a calendar date, not
  // on an instant, so no zone should enter into it.
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + 1);

  return parsed.toISOString().slice(0, 10);
}

export type BookingTimeInput = {
  date: string;
  startTime: string | null;
  endTime: string | null;
  /** The provider's IANA zone. Never the calendar's. */
  providerTimeZone: string;
};

export type EventTimes = { start: GoogleEventTime; end: GoogleEventTime };

export function buildEventTimes(input: BookingTimeInput): EventTimes {
  assertDate(input.date);

  if (!input.providerTimeZone.trim()) {
    throw new EventTimeError("missing_timezone");
  }

  // A booking with no times is a full-day booking.
  if (!input.startTime && !input.endTime) {
    return {
      start: { date: input.date },
      // Exclusive: a single-day event ends on the following date, and emitting
      // the same date twice produces an event Google rejects.
      end: { date: nextDay(input.date) },
    };
  }

  if (!input.startTime || !input.endTime) {
    throw new EventTimeError("incomplete_times");
  }

  if (!TIME_PATTERN.test(input.startTime) || !TIME_PATTERN.test(input.endTime)) {
    throw new EventTimeError("invalid_time");
  }

  const start = input.startTime.length === 5 ? `${input.startTime}:00` : input.startTime;
  const end = input.endTime.length === 5 ? `${input.endTime}:00` : input.endTime;

  // An end at or before the start would be an event Google refuses. It happens
  // when a booking crosses midnight, which this domain does not produce — so it
  // is a contract failure rather than something to silently repair.
  if (end <= start) {
    throw new EventTimeError("end_not_after_start");
  }

  return {
    start: { dateTime: `${input.date}T${start}`, timeZone: input.providerTimeZone },
    end: { dateTime: `${input.date}T${end}`, timeZone: input.providerTimeZone },
  };
}
