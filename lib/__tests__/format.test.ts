import { describe, it, expect } from "vitest";
import {
  formatTimeLabel,
  formatTimeRange,
  formatCountdown,
  formatDuration,
} from "@/lib/format";
import type { Service } from "@/lib/types";

// ---------------------------------------------------------------------------
// formatTimeLabel
// ---------------------------------------------------------------------------

describe("formatTimeLabel", () => {
  it("formats midnight as 12:00 AM", () => {
    expect(formatTimeLabel("00:00")).toBe("12:00 AM");
  });

  it("formats noon as 12:00 PM", () => {
    expect(formatTimeLabel("12:00")).toBe("12:00 PM");
  });

  it("formats a morning hour in AM", () => {
    expect(formatTimeLabel("09:00")).toBe("9:00 AM");
  });

  it("formats 09:30 as 9:30 AM", () => {
    expect(formatTimeLabel("09:30")).toBe("9:30 AM");
  });

  it("formats an afternoon hour in PM", () => {
    expect(formatTimeLabel("14:00")).toBe("2:00 PM");
  });

  it("formats 16:45 as 4:45 PM", () => {
    expect(formatTimeLabel("16:45")).toBe("4:45 PM");
  });

  it("pads single-digit minutes", () => {
    expect(formatTimeLabel("09:05")).toBe("9:05 AM");
  });

  it("returns 'Full Day' when time is undefined", () => {
    expect(formatTimeLabel(undefined)).toBe("Full Day");
  });

  it("returns 'Full Day' when time is empty string (falsy)", () => {
    // empty string is falsy — current behavior
    expect(formatTimeLabel("" as string)).toBe("Full Day");
  });
});

// ---------------------------------------------------------------------------
// formatTimeRange
// ---------------------------------------------------------------------------

describe("formatTimeRange", () => {
  it("formats a morning appointment range", () => {
    expect(formatTimeRange("09:00", "09:30")).toBe("9:00 AM - 9:30 AM");
  });

  it("formats a range crossing noon", () => {
    expect(formatTimeRange("11:30", "12:00")).toBe("11:30 AM - 12:00 PM");
  });

  it("returns 'Full Day' when startTime is undefined", () => {
    expect(formatTimeRange(undefined, "17:00")).toBe("Full Day");
  });

  it("returns 'Full Day' when endTime is undefined", () => {
    expect(formatTimeRange("09:00", undefined)).toBe("Full Day");
  });

  it("returns 'Full Day' when both are undefined", () => {
    expect(formatTimeRange(undefined, undefined)).toBe("Full Day");
  });
});

// ---------------------------------------------------------------------------
// formatCountdown
// ---------------------------------------------------------------------------

describe("formatCountdown", () => {
  it("formats 0 ms as 0:00", () => {
    expect(formatCountdown(0)).toBe("0:00");
  });

  it("formats negative ms as 0:00 (clamps to 0)", () => {
    expect(formatCountdown(-5000)).toBe("0:00");
  });

  it("formats 60000 ms as 1:00", () => {
    expect(formatCountdown(60_000)).toBe("1:00");
  });

  it("formats 90000 ms as 1:30", () => {
    expect(formatCountdown(90_000)).toBe("1:30");
  });

  it("formats 65000 ms as 1:05 (rounds up with Math.ceil)", () => {
    // 65000 ms → ceil(65) = 65 s → 1 min 5 sec
    expect(formatCountdown(65_000)).toBe("1:05");
  });

  it("formats 599000 ms as 9:59", () => {
    // 599000 ms → ceil(599) = 599 s → 9 min 59 sec
    expect(formatCountdown(599_000)).toBe("9:59");
  });

  it("pads single-digit seconds", () => {
    expect(formatCountdown(61_000)).toBe("1:01");
  });
});

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

function makeSvc(overrides: Partial<Service>): Service {
  return {
    id: "svc_1",
    name: "Test",
    bookingType: "appointment",
    description: "",
    ...overrides,
  };
}

describe("formatDuration", () => {
  it("returns 'Full Day' for full-day booking type", () => {
    expect(formatDuration(makeSvc({ bookingType: "full-day" }))).toBe("Full Day");
  });

  it("returns 'Appointment' when durationMinutes is not set", () => {
    expect(formatDuration(makeSvc({ durationMinutes: undefined }))).toBe("Appointment");
  });

  it("formats minutes less than 60", () => {
    expect(formatDuration(makeSvc({ durationMinutes: 30 }))).toBe("30 min");
  });

  it("formats 45 min", () => {
    expect(formatDuration(makeSvc({ durationMinutes: 45 }))).toBe("45 min");
  });

  it("formats exactly 60 min as '1 hr' (singular)", () => {
    expect(formatDuration(makeSvc({ durationMinutes: 60 }))).toBe("1 hr");
  });

  it("formats 120 min as '2 hrs' (plural)", () => {
    expect(formatDuration(makeSvc({ durationMinutes: 120 }))).toBe("2 hrs");
  });

  it("formats 90 min as minutes (not evenly divisible hours)", () => {
    // 90 % 60 = 30 ≠ 0, so stays in minutes
    expect(formatDuration(makeSvc({ durationMinutes: 90 }))).toBe("90 min");
  });

  it("formats 240 min as '4 hrs'", () => {
    expect(formatDuration(makeSvc({ durationMinutes: 240 }))).toBe("4 hrs");
  });
});
