import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAvailableSlots,
  getDayAvailability,
  isDailyBookingLimitReached,
  isDateAvailable,
  normalizeDailyBookingLimit,
} from "@/lib/availability";
import { getPublicSlotStates } from "@/lib/slot-states";
import type { BookingHoldRecord, BookingRecord, Service, WeeklyAvailability } from "@/lib/types";

const TODAY = new Date(2026, 4, 29); // 2026-05-29
const MONDAY = "2026-06-01";
const TUESDAY = "2026-06-02";

const consult: Service = {
  id: "svc_1",
  name: "Consult",
  bookingType: "appointment",
  durationMinutes: 30,
  description: "",
};
const other: Service = { ...consult, id: "svc_2", name: "Other" };
const fullDay: Service = { id: "svc_3", name: "Day", bookingType: "full-day", description: "" };

const week: WeeklyAvailability = {
  sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
};

function booking(id: string, startTime: string, overrides: Partial<BookingRecord> = {}): BookingRecord {
  const [hour, minute] = startTime.split(":").map(Number);
  const end = `${String(hour + (minute === 30 ? 1 : 0)).padStart(2, "0")}:${minute === 30 ? "00" : "30"}`;
  return {
    id,
    serviceId: "svc_1",
    serviceName: "Consult",
    bookingType: "appointment",
    dateKey: MONDAY,
    startTime,
    endTime: end,
    clientName: "A",
    clientEmail: "a@b.com",
    clientPhone: "1",
    notes: "",
    cost: "",
    status: "confirmed",
    createdAt: "",
    updatedAt: "",
    manageToken: "",
    ...overrides,
  };
}

function hold(id: string, startTime: string): BookingHoldRecord {
  return {
    id,
    serviceId: "svc_1",
    bookingType: "appointment",
    dateKey: MONDAY,
    startTime,
    endTime: startTime.replace(":00", ":30"),
    createdAt: "",
    expiresAt: TODAY.getTime() + 600_000,
    extensionCount: 0,
  };
}

const three = [booking("b1", "09:00"), booking("b2", "10:00"), booking("b3", "11:00")];

afterEach(() => vi.useRealTimers());

function today() {
  vi.useFakeTimers();
  vi.setSystemTime(TODAY);
}

describe("normalizeDailyBookingLimit", () => {
  it("accepts positive whole numbers only", () => {
    expect(normalizeDailyBookingLimit(5)).toBe(5);
    for (const value of [0, -1, 2.5, Number.NaN, "5", null, undefined]) {
      expect(normalizeDailyBookingLimit(value)).toBeNull();
    }
  });
});

describe("daily booking limit", () => {
  it("changes nothing while off", () => {
    today();
    expect(getAvailableSlots(MONDAY, consult, week, three).length).toBeGreaterThan(0);
    expect(isDailyBookingLimitReached(MONDAY, three, [], undefined)).toBe(false);
  });

  it("closes a day once it has the maximum, even with open times left", () => {
    today();
    const options = { dailyBookingLimit: 3 };
    expect(getAvailableSlots(MONDAY, consult, week, three, undefined, [], undefined, options)).toEqual([]);
    expect(isDateAvailable(MONDAY, consult, week, three, undefined, [], undefined, options)).toBe(false);
    expect(getDayAvailability(MONDAY, consult, week, three, undefined, [], undefined, options).level).toBe(
      "full",
    );
  });

  it("counts every service, and only that date", () => {
    today();
    const options = { dailyBookingLimit: 3 };
    expect(getAvailableSlots(MONDAY, other, week, three, undefined, [], undefined, options)).toEqual([]);
    expect(isDateAvailable(MONDAY, fullDay, week, three, undefined, [], undefined, options)).toBe(false);
    expect(
      getAvailableSlots(TUESDAY, consult, week, three, undefined, [], undefined, options).length,
    ).toBeGreaterThan(0);
  });

  it("ignores cancelled bookings", () => {
    today();
    const withCancelled = [...three.slice(0, 2), booking("b3", "11:00", { status: "cancelled" })];
    expect(
      getAvailableSlots(MONDAY, consult, week, withCancelled, undefined, [], undefined, {
        dailyBookingLimit: 3,
      }).length,
    ).toBeGreaterThan(0);
  });

  it("counts live holds, but never the visitor's own hold or booking", () => {
    today();
    const two = three.slice(0, 2);
    const holds = [hold("h1", "13:00")];
    const options = { dailyBookingLimit: 3 };

    expect(getAvailableSlots(MONDAY, consult, week, two, undefined, holds, undefined, options)).toEqual([]);
    expect(
      getAvailableSlots(MONDAY, consult, week, two, undefined, holds, "h1", options).length,
    ).toBeGreaterThan(0);
    // Rescheduling one of the three within the same full day is still possible.
    expect(
      getAvailableSlots(MONDAY, consult, week, three, "b3", [], undefined, options).length,
    ).toBeGreaterThan(0);
  });

  it("shows held times as held, so the day reopens when the hold lapses", () => {
    today();
    const states = getPublicSlotStates(
      MONDAY,
      consult,
      week,
      three.slice(0, 2),
      undefined,
      [hold("h1", "13:00")],
      undefined,
      { dailyBookingLimit: 3 },
    );
    expect(states.length).toBeGreaterThan(0);
    expect(states.every((state) => state.status === "held")).toBe(true);
  });
});
