import { describe, it, expect, vi, afterEach } from "vitest";
import {
  toMinutes,
  addMinutes,
  getDateKey,
  parseDateKey,
  addDays,
  compareDateKeys,
  getWeekStart,
  createRollingWeekWindow,
  isPastDate,
  getWeekdayKey,
} from "@/lib/date";

describe("toMinutes", () => {
  it("converts 00:00 to 0", () => {
    expect(toMinutes("00:00")).toBe(0);
  });

  it("converts 09:00 to 540", () => {
    expect(toMinutes("09:00")).toBe(540);
  });

  it("converts 17:30 to 1050", () => {
    expect(toMinutes("17:30")).toBe(1050);
  });

  it("converts 23:59 to 1439", () => {
    expect(toMinutes("23:59")).toBe(1439);
  });
});

describe("addMinutes", () => {
  it("adds 30 minutes to 09:00", () => {
    expect(addMinutes("09:00", 30)).toBe("09:30");
  });

  it("carries over to next hour", () => {
    expect(addMinutes("09:45", 30)).toBe("10:15");
  });

  it("pads minutes correctly", () => {
    expect(addMinutes("09:00", 5)).toBe("09:05");
  });

  it("crosses midnight (hours go past 24)", () => {
    // behavior: hours just keep going
    expect(addMinutes("23:45", 30)).toBe("24:15");
  });
});

describe("getDateKey / parseDateKey round-trip", () => {
  it("round-trips a known date", () => {
    const date = new Date(2026, 4, 2); // May 2 2026
    const key = getDateKey(date);
    expect(key).toBe("2026-05-02");
    const parsed = parseDateKey(key);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(4);
    expect(parsed.getDate()).toBe(2);
  });

  it("pads single-digit month and day", () => {
    const date = new Date(2026, 0, 9); // Jan 9
    expect(getDateKey(date)).toBe("2026-01-09");
  });

  it("parseDateKey returns local midnight", () => {
    const parsed = parseDateKey("2026-05-02");
    expect(parsed.getHours()).toBe(0);
    expect(parsed.getMinutes()).toBe(0);
  });
});

describe("addDays", () => {
  it("adds positive days", () => {
    const base = new Date(2026, 4, 1); // May 1
    const result = addDays(base, 5);
    expect(result.getDate()).toBe(6);
    expect(result.getMonth()).toBe(4);
  });

  it("subtracts days with negative amount", () => {
    const base = new Date(2026, 4, 5);
    const result = addDays(base, -4);
    expect(result.getDate()).toBe(1);
  });

  it("does not mutate the original date", () => {
    const base = new Date(2026, 4, 1);
    addDays(base, 10);
    expect(base.getDate()).toBe(1);
  });

  it("crosses month boundaries", () => {
    const base = new Date(2026, 0, 31); // Jan 31
    const result = addDays(base, 1);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(1);
  });
});

describe("compareDateKeys", () => {
  it("returns 0 for equal keys", () => {
    expect(compareDateKeys("2026-05-02", "2026-05-02")).toBe(0);
  });

  it("returns negative when left < right", () => {
    expect(compareDateKeys("2026-05-01", "2026-05-02")).toBeLessThan(0);
  });

  it("returns positive when left > right", () => {
    expect(compareDateKeys("2026-05-03", "2026-05-02")).toBeGreaterThan(0);
  });

  it("compares across years", () => {
    expect(compareDateKeys("2025-12-31", "2026-01-01")).toBeLessThan(0);
  });
});

describe("getWeekStart", () => {
  it("returns Sunday for a Sunday", () => {
    // 2026-05-03 is a Sunday
    const date = new Date(2026, 4, 3);
    const start = getWeekStart(date);
    expect(start.getDay()).toBe(0);
    expect(getDateKey(start)).toBe("2026-05-03");
  });

  it("returns the prior Sunday for a Wednesday", () => {
    // 2026-05-06 is a Wednesday
    const date = new Date(2026, 4, 6);
    const start = getWeekStart(date);
    expect(start.getDay()).toBe(0);
    expect(getDateKey(start)).toBe("2026-05-03");
  });
});

describe("createRollingWeekWindow", () => {
  it("returns correct shape: weeks array has weeksToShow entries", () => {
    const ref = new Date(2026, 4, 6); // Wednesday
    const result = createRollingWeekWindow(ref, 0, 4);
    expect(result.weeks).toHaveLength(4);
  });

  it("each week has 7 days", () => {
    const ref = new Date(2026, 4, 6);
    const result = createRollingWeekWindow(ref, 0, 4);
    for (const week of result.weeks) {
      expect(week).toHaveLength(7);
    }
  });

  it("exposes start, end, startKey, endKey", () => {
    const ref = new Date(2026, 4, 6);
    const result = createRollingWeekWindow(ref, 0, 2);
    expect(result).toHaveProperty("start");
    expect(result).toHaveProperty("end");
    expect(result).toHaveProperty("startKey");
    expect(result).toHaveProperty("endKey");
    expect(typeof result.startKey).toBe("string");
    expect(typeof result.endKey).toBe("string");
  });

  it("end is (weeksToShow * 7 - 1) days after start", () => {
    const ref = new Date(2026, 4, 6);
    const weeksToShow = 3;
    const result = createRollingWeekWindow(ref, 0, weeksToShow);
    const diffMs = result.end.getTime() - result.start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(weeksToShow * 7 - 1);
  });
});

describe("isPastDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for a date in the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 29)); // today = 2026-05-29
    expect(isPastDate("2026-05-28")).toBe(true);
  });

  it("returns false for today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 29));
    expect(isPastDate("2026-05-29")).toBe(false);
  });

  it("returns false for a future date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 29));
    expect(isPastDate("2026-05-30")).toBe(false);
  });
});

describe("getWeekdayKey", () => {
  it("returns sunday for a Sunday dateKey", () => {
    // 2026-05-03 is a Sunday
    expect(getWeekdayKey("2026-05-03")).toBe("sunday");
  });

  it("returns monday for a Monday dateKey", () => {
    // 2026-05-04 is a Monday
    expect(getWeekdayKey("2026-05-04")).toBe("monday");
  });

  it("returns friday for a Friday dateKey", () => {
    // 2026-05-08 is a Friday
    expect(getWeekdayKey("2026-05-08")).toBe("friday");
  });

  it("returns saturday for a Saturday dateKey", () => {
    // 2026-05-09 is a Saturday
    expect(getWeekdayKey("2026-05-09")).toBe("saturday");
  });
});
