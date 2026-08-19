import { describe, expect, it } from "vitest";

import {
  InboundTimeError,
  instantToZonedWallTime,
  parseInboundTimes,
} from "@/lib/google/inbound-time";

const MEXICO = "America/Mexico_City";

describe("instantToZonedWallTime", () => {
  it("reads an instant on the provider's clock, not UTC's", () => {
    // 16:00Z is 10:00 in Mexico City, and the date is the same day there.
    expect(instantToZonedWallTime(new Date("2026-08-20T16:00:00Z"), MEXICO)).toEqual({
      dateKey: "2026-08-20",
      time: "10:00",
    });
  });

  it("moves the date when the zone is on the other side of midnight", () => {
    // 03:00Z on the 21st is still 21:00 on the 20th in Mexico City. A booking
    // filed under the UTC date would be a day late on the provider's schedule.
    expect(instantToZonedWallTime(new Date("2026-08-21T03:00:00Z"), MEXICO)).toEqual({
      dateKey: "2026-08-20",
      time: "21:00",
    });
  });

  it("writes midnight as 00:00 on the correct day", () => {
    expect(instantToZonedWallTime(new Date("2026-08-20T06:00:00Z"), MEXICO)).toEqual({
      dateKey: "2026-08-20",
      time: "00:00",
    });
  });

  it("refuses a zone the runtime does not know", () => {
    expect(() => instantToZonedWallTime(new Date(), "Mars/Olympus_Mons")).toThrow(
      InboundTimeError,
    );
  });

  it("refuses an invalid instant", () => {
    expect(() => instantToZonedWallTime(new Date("nonsense"), MEXICO)).toThrow(
      InboundTimeError,
    );
  });
});

describe("parseInboundTimes", () => {
  it("converts an offset-bearing event to provider-local date and time", () => {
    const times = parseInboundTimes({
      start: { dateTime: "2026-08-20T10:00:00-06:00", timeZone: MEXICO },
      end: { dateTime: "2026-08-20T11:00:00-06:00", timeZone: MEXICO },
      providerTimeZone: MEXICO,
    });

    expect(times).toEqual({
      kind: "timed",
      dateKey: "2026-08-20",
      time: "10:00",
      durationMinutes: 60,
      startsAt: "2026-08-20T16:00:00.000Z",
      endsAt: "2026-08-20T17:00:00.000Z",
    });
  });

  it("uses the provider's zone even when the event names another one", () => {
    // The same instant, stated in Tokyo terms. The provider's schedule is what
    // a booking's date and time mean, so the answer must not change.
    const times = parseInboundTimes({
      start: { dateTime: "2026-08-21T01:00:00+09:00", timeZone: "Asia/Tokyo" },
      end: { dateTime: "2026-08-21T02:00:00+09:00", timeZone: "Asia/Tokyo" },
      providerTimeZone: MEXICO,
    });

    expect(times).toMatchObject({ dateKey: "2026-08-20", time: "10:00" });
  });

  it("reports the duration Google gave, so a resize can be recognised", () => {
    const times = parseInboundTimes({
      start: { dateTime: "2026-08-20T10:00:00-06:00" },
      end: { dateTime: "2026-08-20T10:45:00-06:00" },
      providerTimeZone: MEXICO,
    });

    expect(times).toMatchObject({ durationMinutes: 45 });
  });

  it("keeps Google's exclusive end on an all-day event", () => {
    expect(
      parseInboundTimes({
        start: { date: "2026-08-20" },
        end: { date: "2026-08-21" },
        providerTimeZone: MEXICO,
      }),
    ).toEqual({ kind: "all_day", dateKey: "2026-08-20", endDateKey: "2026-08-21" });
  });

  it("refuses one end as a date and the other as an instant", () => {
    expect(() =>
      parseInboundTimes({
        start: { date: "2026-08-20" },
        end: { dateTime: "2026-08-20T11:00:00-06:00" },
        providerTimeZone: MEXICO,
      }),
    ).toThrowError(expect.objectContaining({ reason: "mixed_time_shapes" }));
  });

  it("refuses an end at or before the start", () => {
    expect(() =>
      parseInboundTimes({
        start: { dateTime: "2026-08-20T11:00:00-06:00" },
        end: { dateTime: "2026-08-20T11:00:00-06:00" },
        providerTimeZone: MEXICO,
      }),
    ).toThrowError(expect.objectContaining({ reason: "end_before_start" }));

    expect(() =>
      parseInboundTimes({
        start: { date: "2026-08-21" },
        end: { date: "2026-08-20" },
        providerTimeZone: MEXICO,
      }),
    ).toThrowError(expect.objectContaining({ reason: "end_before_start" }));
  });

  it("refuses times that are absent altogether", () => {
    expect(() =>
      parseInboundTimes({ start: null, end: null, providerTimeZone: MEXICO }),
    ).toThrowError(expect.objectContaining({ reason: "missing_times" }));

    expect(() =>
      parseInboundTimes({ start: {}, end: {}, providerTimeZone: MEXICO }),
    ).toThrowError(expect.objectContaining({ reason: "missing_times" }));
  });

  it("refuses an unparsable instant rather than guessing", () => {
    expect(() =>
      parseInboundTimes({
        start: { dateTime: "whenever" },
        end: { dateTime: "2026-08-20T11:00:00-06:00" },
        providerTimeZone: MEXICO,
      }),
    ).toThrowError(expect.objectContaining({ reason: "unparsable_time" }));
  });

  it("refuses a provider timezone the runtime cannot use", () => {
    expect(() =>
      parseInboundTimes({
        start: { dateTime: "2026-08-20T10:00:00-06:00" },
        end: { dateTime: "2026-08-20T11:00:00-06:00" },
        providerTimeZone: "Nowhere/Nothing",
      }),
    ).toThrowError(expect.objectContaining({ reason: "invalid_timezone" }));
  });

  it("never puts the event's content in the error", () => {
    try {
      parseInboundTimes({ start: null, end: null, providerTimeZone: MEXICO });
      throw new Error("Expected a failure.");
    } catch (error) {
      expect((error as Error).message).toBe(
        "Google event times could not be read: missing_times.",
      );
    }
  });
});
