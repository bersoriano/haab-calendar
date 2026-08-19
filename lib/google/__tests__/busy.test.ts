import { describe, expect, it } from "vitest";

import {
  allDayToInterval,
  BUSY_FRESHNESS,
  classifySnapshotFreshness,
  intervalsOverlap,
  isBlocked,
  mergeBusyIntervals,
  zonedWallTimeToInstant,
} from "@/lib/google/busy";

const MEXICO = "America/Mexico_City";
const NEW_YORK = "America/New_York";

describe("intervalsOverlap", () => {
  it("finds a genuine overlap", () => {
    expect(
      intervalsOverlap(
        { startsAt: "2026-09-01T09:00:00Z", endsAt: "2026-09-01T10:00:00Z" },
        { startsAt: "2026-09-01T09:30:00Z", endsAt: "2026-09-01T10:30:00Z" },
      ),
    ).toBe(true);
  });

  it("treats adjacency as free", () => {
    // A booking ending exactly when busy time starts does not collide. Getting
    // this wrong silently deletes a slot from every back-to-back schedule.
    expect(
      intervalsOverlap(
        { startsAt: "2026-09-01T09:00:00Z", endsAt: "2026-09-01T10:00:00Z" },
        { startsAt: "2026-09-01T10:00:00Z", endsAt: "2026-09-01T11:00:00Z" },
      ),
    ).toBe(false);
  });

  it("treats the reverse adjacency as free too", () => {
    expect(
      intervalsOverlap(
        { startsAt: "2026-09-01T10:00:00Z", endsAt: "2026-09-01T11:00:00Z" },
        { startsAt: "2026-09-01T09:00:00Z", endsAt: "2026-09-01T10:00:00Z" },
      ),
    ).toBe(false);
  });

  it("finds containment in both directions", () => {
    const outer = { startsAt: "2026-09-01T08:00:00Z", endsAt: "2026-09-01T18:00:00Z" };
    const inner = { startsAt: "2026-09-01T09:00:00Z", endsAt: "2026-09-01T10:00:00Z" };

    expect(intervalsOverlap(outer, inner)).toBe(true);
    expect(intervalsOverlap(inner, outer)).toBe(true);
  });

  it("treats an unreadable interval as blocking", () => {
    // Failing open here would offer a slot that is really taken.
    expect(
      intervalsOverlap(
        { startsAt: "not-a-date", endsAt: "2026-09-01T10:00:00Z" },
        { startsAt: "2026-09-01T09:00:00Z", endsAt: "2026-09-01T10:00:00Z" },
      ),
    ).toBe(true);
  });
});

describe("isBlocked", () => {
  const busy = [
    { startsAt: "2026-09-01T15:00:00Z", endsAt: "2026-09-01T16:00:00Z" },
    { startsAt: "2026-09-01T18:00:00Z", endsAt: "2026-09-01T19:00:00Z" },
  ];

  it("blocks a slot inside busy time", () => {
    expect(
      isBlocked({ startsAt: "2026-09-01T15:30:00Z", endsAt: "2026-09-01T15:45:00Z" }, busy),
    ).toBe(true);
  });

  it("leaves a slot between two busy blocks alone", () => {
    expect(
      isBlocked({ startsAt: "2026-09-01T16:00:00Z", endsAt: "2026-09-01T18:00:00Z" }, busy),
    ).toBe(false);
  });

  it("nothing is blocked when there is no busy time", () => {
    expect(
      isBlocked({ startsAt: "2026-09-01T15:30:00Z", endsAt: "2026-09-01T16:00:00Z" }, []),
    ).toBe(false);
  });
});

describe("mergeBusyIntervals", () => {
  it("merges overlapping intervals from different calendars", () => {
    expect(
      mergeBusyIntervals([
        { startsAt: "2026-09-01T09:00:00Z", endsAt: "2026-09-01T10:00:00Z" },
        { startsAt: "2026-09-01T09:30:00Z", endsAt: "2026-09-01T11:00:00Z" },
      ]),
    ).toEqual([
      { startsAt: "2026-09-01T09:00:00.000Z", endsAt: "2026-09-01T11:00:00.000Z" },
    ]);
  });

  it("joins intervals that merely touch", () => {
    expect(
      mergeBusyIntervals([
        { startsAt: "2026-09-01T09:00:00Z", endsAt: "2026-09-01T10:00:00Z" },
        { startsAt: "2026-09-01T10:00:00Z", endsAt: "2026-09-01T11:00:00Z" },
      ]),
    ).toHaveLength(1);
  });

  it("keeps genuinely separate intervals apart", () => {
    expect(
      mergeBusyIntervals([
        { startsAt: "2026-09-01T09:00:00Z", endsAt: "2026-09-01T10:00:00Z" },
        { startsAt: "2026-09-01T11:00:00Z", endsAt: "2026-09-01T12:00:00Z" },
      ]),
    ).toHaveLength(2);
  });

  it("sorts out-of-order input before merging", () => {
    const merged = mergeBusyIntervals([
      { startsAt: "2026-09-01T14:00:00Z", endsAt: "2026-09-01T15:00:00Z" },
      { startsAt: "2026-09-01T09:00:00Z", endsAt: "2026-09-01T10:00:00Z" },
    ]);

    expect(merged[0].startsAt).toBe("2026-09-01T09:00:00.000Z");
  });

  it("drops malformed and zero-length intervals", () => {
    expect(
      mergeBusyIntervals([
        { startsAt: "nonsense", endsAt: "2026-09-01T10:00:00Z" },
        { startsAt: "2026-09-01T10:00:00Z", endsAt: "2026-09-01T10:00:00Z" },
      ]),
    ).toEqual([]);
  });
});

describe("zonedWallTimeToInstant", () => {
  it("resolves a Mexico City wall time", () => {
    // Mexico City sits at -06:00 year round since 2022.
    expect(zonedWallTimeToInstant("2026-09-01T09:00:00", MEXICO)).toBe(
      "2026-09-01T15:00:00.000Z",
    );
  });

  it("applies the correct offset either side of a DST change", () => {
    // New York: -05:00 in winter, -04:00 in summer. A fixed offset would be an
    // hour wrong for half the year.
    expect(zonedWallTimeToInstant("2026-01-15T09:00:00", NEW_YORK)).toBe(
      "2026-01-15T14:00:00.000Z",
    );
    expect(zonedWallTimeToInstant("2026-07-15T09:00:00", NEW_YORK)).toBe(
      "2026-07-15T13:00:00.000Z",
    );
  });

  it("handles the day the clocks go forward", () => {
    // 2026-03-08 in New York: 02:00 does not exist locally.
    expect(zonedWallTimeToInstant("2026-03-08T09:00:00", NEW_YORK)).toBe(
      "2026-03-08T13:00:00.000Z",
    );
  });

  it("handles the day the clocks go back", () => {
    expect(zonedWallTimeToInstant("2026-11-01T09:00:00", NEW_YORK)).toBe(
      "2026-11-01T14:00:00.000Z",
    );
  });
});

describe("allDayToInterval", () => {
  it("covers the provider's whole local day", () => {
    expect(
      allDayToInterval({
        startDate: "2026-09-01",
        endDate: "2026-09-02",
        timeZone: MEXICO,
      }),
    ).toEqual({
      startsAt: "2026-09-01T06:00:00.000Z",
      endsAt: "2026-09-02T06:00:00.000Z",
    });
  });

  it("is 25 hours long on the day a zone gains an hour", () => {
    const interval = allDayToInterval({
      startDate: "2026-11-01",
      endDate: "2026-11-02",
      timeZone: NEW_YORK,
    });

    const hours =
      (Date.parse(interval.endsAt) - Date.parse(interval.startsAt)) / 3_600_000;

    // A flat 24 would leave an hour of that day bookable when it is not.
    expect(hours).toBe(25);
  });

  it("is 23 hours long on the day a zone loses one", () => {
    const interval = allDayToInterval({
      startDate: "2026-03-08",
      endDate: "2026-03-09",
      timeZone: NEW_YORK,
    });

    const hours =
      (Date.parse(interval.endsAt) - Date.parse(interval.startsAt)) / 3_600_000;

    expect(hours).toBe(23);
  });

  it("blocks a booking inside an all-day event", () => {
    const allDay = allDayToInterval({
      startDate: "2026-09-01",
      endDate: "2026-09-02",
      timeZone: MEXICO,
    });

    expect(
      isBlocked({ startsAt: "2026-09-01T15:00:00Z", endsAt: "2026-09-01T16:00:00Z" }, [
        allDay,
      ]),
    ).toBe(true);
  });

  it("leaves the following local day free", () => {
    const allDay = allDayToInterval({
      startDate: "2026-09-01",
      endDate: "2026-09-02",
      timeZone: MEXICO,
    });

    // 2026-09-02 09:00 in Mexico City is 15:00Z, after the exclusive end.
    expect(
      isBlocked({ startsAt: "2026-09-02T15:00:00Z", endsAt: "2026-09-02T16:00:00Z" }, [
        allDay,
      ]),
    ).toBe(false);
  });
});

describe("classifySnapshotFreshness", () => {
  const now = new Date("2026-09-01T12:00:00.000Z");

  it("is fresh just after a refresh", () => {
    expect(classifySnapshotFreshness("2026-09-01T11:59:00.000Z", now)).toBe("fresh");
  });

  it("warns once past the stale threshold", () => {
    expect(classifySnapshotFreshness("2026-09-01T11:45:00.000Z", now)).toBe("stale");
  });

  it("stops trusting the cache past the hard threshold", () => {
    expect(classifySnapshotFreshness("2026-09-01T11:00:00.000Z", now)).toBe("hard_stale");
  });

  it("treats an absent snapshot as missing", () => {
    expect(classifySnapshotFreshness(null, now)).toBe("missing");
    expect(classifySnapshotFreshness("not-a-date", now)).toBe("missing");
  });

  it("keeps the warning threshold below the hard one", () => {
    // A hard limit at or below the warning would make the warning unreachable.
    expect(BUSY_FRESHNESS.staleWarningMs).toBeLessThan(BUSY_FRESHNESS.hardStaleMs);
    expect(BUSY_FRESHNESS.refreshTargetMs).toBeLessThan(BUSY_FRESHNESS.staleWarningMs);
    expect(BUSY_FRESHNESS.fallbackRefreshMs).toBeLessThan(BUSY_FRESHNESS.hardStaleMs);
  });
});
