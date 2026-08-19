/**
 * Turning Google's busy time into an answer about a provider's availability.
 *
 * Pure: no client, no clock of its own, no database. Every rule here — what
 * overlaps, what an all-day event means in a provider's zone, when a cached
 * snapshot has gone too stale to trust — is a decision that has to be exactly
 * right and is cheap to test only while it stays free of I/O.
 */

/** An instant range. Half-open: [start, end). */
export type BusyInterval = { startsAt: string; endsAt: string };

/**
 * How fresh a snapshot has to be before it may answer a question.
 *
 * Two thresholds, not one. Between them a provider's page still renders from
 * cache — availability is a hint, and refusing to draw a calendar because a
 * refresh is four seconds late would be worse than a slightly stale one. Past
 * the hard limit the cache stops being evidence of anything and the answer has
 * to come from Google or not at all.
 */
export const BUSY_FRESHNESS = {
  /** Target cadence after a change notification. */
  refreshTargetMs: 2 * 60_000,
  /** Cron fallback for when a notification never arrives. */
  fallbackRefreshMs: 12 * 60_000,
  /** Past this the UI says availability may be out of date. */
  staleWarningMs: 10 * 60_000,
  /** Past this the cache is not evidence and must not be relied on. */
  hardStaleMs: 30 * 60_000,
} as const;

export type SnapshotFreshness = "fresh" | "stale" | "hard_stale" | "missing";

export function classifySnapshotFreshness(
  refreshedAt: string | null | undefined,
  now: Date,
): SnapshotFreshness {
  if (!refreshedAt) {
    return "missing";
  }

  const age = now.getTime() - new Date(refreshedAt).getTime();

  if (Number.isNaN(age)) {
    return "missing";
  }

  if (age >= BUSY_FRESHNESS.hardStaleMs) return "hard_stale";
  if (age >= BUSY_FRESHNESS.staleWarningMs) return "stale";
  return "fresh";
}

/**
 * Half-open overlap: `start < otherEnd && end > otherStart`.
 *
 * Adjacency is not overlap. A booking ending at 10:00 and busy time starting at
 * 10:00 do not collide, and treating them as colliding would silently delete a
 * usable slot from every back-to-back schedule.
 */
export function intervalsOverlap(
  a: { startsAt: string; endsAt: string },
  b: { startsAt: string; endsAt: string },
): boolean {
  const aStart = Date.parse(a.startsAt);
  const aEnd = Date.parse(a.endsAt);
  const bStart = Date.parse(b.startsAt);
  const bEnd = Date.parse(b.endsAt);

  if ([aStart, aEnd, bStart, bEnd].some(Number.isNaN)) {
    // An uninterpretable interval is not proof of freedom. Treated as a
    // collision so a malformed row can never open a slot that is really taken.
    return true;
  }

  return aStart < bEnd && aEnd > bStart;
}

export function isBlocked(
  proposed: { startsAt: string; endsAt: string },
  busy: readonly BusyInterval[],
): boolean {
  return busy.some((interval) => intervalsOverlap(proposed, interval));
}

/**
 * Merges overlapping and touching intervals.
 *
 * Several calendars routinely describe the same meeting. Merging keeps the
 * blocked-time answer stable regardless of how many sources reported it, and
 * keeps the row count down.
 */
export function mergeBusyIntervals(intervals: readonly BusyInterval[]): BusyInterval[] {
  const parsed = intervals
    .map((interval) => ({
      start: Date.parse(interval.startsAt),
      end: Date.parse(interval.endsAt),
    }))
    .filter((interval) => !Number.isNaN(interval.start) && !Number.isNaN(interval.end))
    .filter((interval) => interval.end > interval.start)
    .sort((left, right) => left.start - right.start);

  const merged: Array<{ start: number; end: number }> = [];

  for (const interval of parsed) {
    const last = merged[merged.length - 1];

    // `>=` rather than `>`: two intervals that merely touch describe one
    // continuous block of busy time.
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
      continue;
    }

    merged.push({ ...interval });
  }

  return merged.map((interval) => ({
    startsAt: new Date(interval.start).toISOString(),
    endsAt: new Date(interval.end).toISOString(),
  }));
}

/** The UTC offset a zone was using at a given instant, in minutes. */
function zoneOffsetMinutes(date: Date, timeZone: string): number {
  // Intl is the only thing that knows a zone's rules for a given date, which is
  // what makes this correct across a DST boundary rather than near one.
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return (asUtc - date.getTime()) / 60_000;
}

/** The instant a local wall time occurs at in a given zone. */
export function zonedWallTimeToInstant(
  wallTime: string,
  timeZone: string,
): string {
  const naive = Date.parse(`${wallTime}Z`);

  if (Number.isNaN(naive)) {
    throw new Error("Invalid wall time.");
  }

  // Two passes: the offset depends on the instant, and the instant depends on
  // the offset. The second pass settles it, including on the days a zone
  // changes offset.
  const firstGuess = new Date(naive - zoneOffsetMinutes(new Date(naive), timeZone) * 60_000);
  const settled = new Date(
    naive - zoneOffsetMinutes(firstGuess, timeZone) * 60_000,
  );

  return settled.toISOString();
}

/**
 * An all-day Google event, as the instants it occupies for this provider.
 *
 * Google gives all-day events as dates with an exclusive end. "Busy all day"
 * means the provider's whole local day — which is 23 or 25 hours on the days a
 * zone changes offset, and computing it as a flat 24 would leak or steal an
 * hour exactly when a schedule is most confusing.
 */
export function allDayToInterval(
  input: { startDate: string; endDate: string; timeZone: string },
): BusyInterval {
  return {
    startsAt: zonedWallTimeToInstant(`${input.startDate}T00:00:00`, input.timeZone),
    endsAt: zonedWallTimeToInstant(`${input.endDate}T00:00:00`, input.timeZone),
  };
}
