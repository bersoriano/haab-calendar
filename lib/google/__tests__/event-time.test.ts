import { describe, expect, it } from "vitest";

import { buildEventTimes, EventTimeError, nextDay } from "@/lib/google/event-time";

const MEXICO = "America/Mexico_City";

describe("buildEventTimes — appointments", () => {
  it("sends the provider's zone, not the calendar's", () => {
    // The provider works in Mexico City. Whether their Google calendar is set
    // to UTC, Tokyo, or anything else does not move their opening hours.
    expect(
      buildEventTimes({
        date: "2026-09-01",
        startTime: "09:00",
        endTime: "09:30",
        providerTimeZone: MEXICO,
      }),
    ).toEqual({
      start: { dateTime: "2026-09-01T09:00:00", timeZone: MEXICO },
      end: { dateTime: "2026-09-01T09:30:00", timeZone: MEXICO },
    });
  });

  it("emits a local wall time with no offset, letting Google resolve the zone", () => {
    const times = buildEventTimes({
      date: "2026-09-01",
      startTime: "09:00",
      endTime: "09:30",
      providerTimeZone: MEXICO,
    });

    // An offset computed here would be wrong twice a year; Google applies the
    // zone's rules for the date itself.
    expect("dateTime" in times.start && times.start.dateTime).not.toMatch(/[+-]\d{2}:\d{2}$/);
    expect("dateTime" in times.start && times.start.dateTime).not.toMatch(/Z$/);
  });

  it("produces the same shape either side of a DST boundary", () => {
    // Mexico abolished DST, so use a zone that still observes it. The point is
    // that nothing here changes: the wall time is the wall time.
    const spring = buildEventTimes({
      date: "2026-03-08",
      startTime: "09:00",
      endTime: "09:30",
      providerTimeZone: "America/New_York",
    });
    const autumn = buildEventTimes({
      date: "2026-11-01",
      startTime: "09:00",
      endTime: "09:30",
      providerTimeZone: "America/New_York",
    });

    expect(spring.start).toEqual({
      dateTime: "2026-03-08T09:00:00",
      timeZone: "America/New_York",
    });
    expect(autumn.start).toEqual({
      dateTime: "2026-11-01T09:00:00",
      timeZone: "America/New_York",
    });
  });

  it("accepts times that already carry seconds", () => {
    const times = buildEventTimes({
      date: "2026-09-01",
      startTime: "09:00:00",
      endTime: "09:30:00",
      providerTimeZone: MEXICO,
    });

    expect("dateTime" in times.end && times.end.dateTime).toBe("2026-09-01T09:30:00");
  });

  it("refuses an end at or before the start", () => {
    for (const endTime of ["09:00", "08:30"]) {
      expect(() =>
        buildEventTimes({
          date: "2026-09-01",
          startTime: "09:00",
          endTime,
          providerTimeZone: MEXICO,
        }),
      ).toThrow(EventTimeError);
    }
  });

  it("refuses a half-specified booking", () => {
    expect(() =>
      buildEventTimes({
        date: "2026-09-01",
        startTime: "09:00",
        endTime: null,
        providerTimeZone: MEXICO,
      }),
    ).toThrow(EventTimeError);
  });

  it("refuses a malformed date or time", () => {
    expect(() =>
      buildEventTimes({
        date: "01-09-2026",
        startTime: "09:00",
        endTime: "09:30",
        providerTimeZone: MEXICO,
      }),
    ).toThrow(EventTimeError);

    expect(() =>
      buildEventTimes({
        date: "2026-09-01",
        startTime: "9am",
        endTime: "09:30",
        providerTimeZone: MEXICO,
      }),
    ).toThrow(EventTimeError);
  });

  it("refuses to guess when the provider has no timezone", () => {
    expect(() =>
      buildEventTimes({
        date: "2026-09-01",
        startTime: "09:00",
        endTime: "09:30",
        providerTimeZone: "  ",
      }),
    ).toThrow(EventTimeError);
  });
});

describe("buildEventTimes — full-day bookings", () => {
  it("uses dates, with an exclusive end on the following day", () => {
    expect(
      buildEventTimes({
        date: "2026-09-01",
        startTime: null,
        endTime: null,
        providerTimeZone: MEXICO,
      }),
    ).toEqual({
      start: { date: "2026-09-01" },
      end: { date: "2026-09-02" },
    });
  });

  it("never emits an identical start and end", () => {
    // Google rejects a zero-length all-day event, and an earlier version of
    // this projection would have produced midnight-to-midnight.
    const times = buildEventTimes({
      date: "2026-09-01",
      startTime: null,
      endTime: null,
      providerTimeZone: MEXICO,
    });

    expect(times.start).not.toEqual(times.end);
  });

  it("carries no timezone, because a date has none", () => {
    const times = buildEventTimes({
      date: "2026-09-01",
      startTime: null,
      endTime: null,
      providerTimeZone: MEXICO,
    });

    expect(times.start).not.toHaveProperty("timeZone");
  });
});

describe("nextDay", () => {
  it("crosses a month boundary", () => {
    expect(nextDay("2026-09-30")).toBe("2026-10-01");
  });

  it("crosses a year boundary", () => {
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
  });

  it("handles a leap day", () => {
    expect(nextDay("2028-02-28")).toBe("2028-02-29");
    expect(nextDay("2028-02-29")).toBe("2028-03-01");
  });

  it("is unaffected by the machine's own timezone", () => {
    // Computed as calendar arithmetic in UTC, so a server in Auckland and one
    // in Los Angeles agree.
    expect(nextDay("2026-09-01")).toBe("2026-09-02");
  });

  it("refuses a malformed date", () => {
    expect(() => nextDay("2026-9-1")).toThrow(EventTimeError);
  });
});
