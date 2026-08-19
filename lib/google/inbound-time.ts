/**
 * Reading a Google event's times back as a booking's times.
 *
 * The outbound direction has it easy: a booking already knows its provider's
 * timezone, so `buildEventTimes` states a wall time and names the zone. Coming
 * back the other way, Google decides the shape — an offset, a zone name, a bare
 * date — and none of those are the provider's local schedule until they are
 * converted to it.
 *
 * Everything here is pure and total: it either produces times a booking could
 * hold, or names the reason it cannot. Deciding what to *do* about a reason is
 * the applier's job, not this module's.
 */

/** A Google `start` / `end`, narrowed to the two shapes that exist. */
export type GoogleTimePayload = {
  dateTime?: string | null;
  date?: string | null;
  timeZone?: string | null;
};

export type InboundTimeReason =
  | "missing_times"
  | "invalid_timezone"
  | "unparsable_time"
  | "mixed_time_shapes"
  | "end_before_start";

export class InboundTimeError extends Error {
  constructor(readonly reason: InboundTimeReason) {
    // The message is for a developer reading a stack, never for a provider and
    // never for a log: it says nothing about the event or the account.
    super(`Google event times could not be read: ${reason}.`);
    this.name = "InboundTimeError";
  }
}

export type InboundTimes =
  | {
      kind: "timed";
      /** Provider-local, `YYYY-MM-DD`. */
      dateKey: string;
      /** Provider-local, `HH:MM`. */
      time: string;
      durationMinutes: number;
      startsAt: string;
      endsAt: string;
    }
  | {
      kind: "all_day";
      dateKey: string;
      /** Exclusive, exactly as Google means it. */
      endDateKey: string;
    };

function assertUsableZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
  } catch {
    throw new InboundTimeError("invalid_timezone");
  }
}

/**
 * An instant as it reads on a wall clock in a given zone.
 *
 * `en-CA` because it is the locale whose date order is already ISO; formatting
 * with it avoids reassembling parts by hand only to get the order wrong.
 */
export function instantToZonedWallTime(
  instant: Date,
  timeZone: string,
): { dateKey: string; time: string } {
  assertUsableZone(timeZone);

  if (Number.isNaN(instant.getTime())) {
    throw new InboundTimeError("unparsable_time");
  }

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );

  // Hour 24 is midnight the way some ICU builds spell it. Left alone it would
  // put a booking at "24:00" on the day before the one it belongs to.
  const hour = parts.hour === "24" ? "00" : parts.hour;

  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hour}:${parts.minute}`,
  };
}

function parseInstant(value: string): Date {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new InboundTimeError("unparsable_time");
  }

  return parsed;
}

/**
 * A staged Google change, as provider-local booking times.
 *
 * The zone used is the *provider's*, not the event's. An event carried into
 * Haab keeps the instant it names, but a booking's date and time are the ones
 * the provider reads on their own schedule — honouring the event's zone here
 * would put a booking on a different day than the provider sees.
 */
export function parseInboundTimes(input: {
  start: GoogleTimePayload | null | undefined;
  end: GoogleTimePayload | null | undefined;
  providerTimeZone: string;
}): InboundTimes {
  const { start, end, providerTimeZone } = input;

  assertUsableZone(providerTimeZone);

  if (!start || !end) {
    throw new InboundTimeError("missing_times");
  }

  const startIsAllDay = Boolean(start.date) && !start.dateTime;
  const endIsAllDay = Boolean(end.date) && !end.dateTime;

  if (startIsAllDay !== endIsAllDay) {
    // One end a date and the other an instant is not a shape Google produces;
    // guessing which one was meant would move a booking by up to a day.
    throw new InboundTimeError("mixed_time_shapes");
  }

  if (startIsAllDay) {
    const dateKey = start.date as string;
    const endDateKey = end.date as string;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !/^\d{4}-\d{2}-\d{2}$/.test(endDateKey)) {
      throw new InboundTimeError("unparsable_time");
    }

    if (endDateKey <= dateKey) {
      throw new InboundTimeError("end_before_start");
    }

    return { kind: "all_day", dateKey, endDateKey };
  }

  if (!start.dateTime || !end.dateTime) {
    throw new InboundTimeError("missing_times");
  }

  const startsAt = parseInstant(start.dateTime);
  const endsAt = parseInstant(end.dateTime);
  const durationMs = endsAt.getTime() - startsAt.getTime();

  if (durationMs <= 0) {
    throw new InboundTimeError("end_before_start");
  }

  const local = instantToZonedWallTime(startsAt, providerTimeZone);

  return {
    kind: "timed",
    dateKey: local.dateKey,
    time: local.time,
    durationMinutes: Math.round(durationMs / 60_000),
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}
