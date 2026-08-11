import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getAvailableSlots,
  getDayAvailability,
  isDateAvailable,
  overlapExists,
  getSpotsLeft,
} from "@/lib/availability";
import type {
  BookingRecord,
  Service,
  WeeklyAvailability,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// All test dates are in the future relative to the mocked "today" (2026-05-29)
//
//  2026-06-01 = Monday
//  2026-06-06 = Saturday  (disabled by default)
//  2026-06-07 = Sunday    (disabled by default)
// ---------------------------------------------------------------------------

const TODAY = new Date(2026, 4, 29); // 2026-05-29

const MONDAY_KEY = "2026-06-01";
const SATURDAY_KEY = "2026-06-06";

const svc30: Service = {
  id: "svc_1",
  name: "Consult",
  bookingType: "appointment",
  durationMinutes: 30,
  description: "",
};

const svcFullDay: Service = {
  id: "svc_2",
  name: "Full Day Session",
  bookingType: "full-day",
  description: "",
};

/** 09:00-17:00, Mon-Fri enabled, Sat-Sun disabled */
const baseAvailability: WeeklyAvailability = {
  sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
};

afterEach(() => {
  vi.useRealTimers();
});

function useToday() {
  vi.useFakeTimers();
  vi.setSystemTime(TODAY);
}

function makeBooking(overrides: Partial<BookingRecord>): BookingRecord {
  return {
    id: "bk_default",
    serviceId: "svc_1",
    serviceName: "Consult",
    bookingType: "appointment",
    dateKey: MONDAY_KEY,
    startTime: "09:00",
    endTime: "09:30",
    clientName: "Alice",
    clientEmail: "a@b.com",
    clientPhone: "555",
    notes: "",
    cost: "",
    status: "confirmed",
    createdAt: "",
    updatedAt: "",
    manageToken: "",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// overlapExists
// ---------------------------------------------------------------------------

describe("overlapExists", () => {
  it("returns true when slots fully overlap", () => {
    expect(overlapExists("09:00", "09:30", "09:00", "09:30")).toBe(true);
  });

  it("returns true when left starts inside right", () => {
    expect(overlapExists("09:15", "09:45", "09:00", "09:30")).toBe(true);
  });

  it("returns true when right starts inside left", () => {
    expect(overlapExists("09:00", "09:45", "09:30", "10:00")).toBe(true);
  });

  it("returns false when left ends exactly at right start (no overlap)", () => {
    expect(overlapExists("09:00", "09:30", "09:30", "10:00")).toBe(false);
  });

  it("returns false when left comes fully before right", () => {
    expect(overlapExists("08:00", "09:00", "10:00", "11:00")).toBe(false);
  });

  it("returns false when left comes fully after right", () => {
    expect(overlapExists("11:00", "12:00", "09:00", "10:00")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getAvailableSlots — enabled day, no bookings
// ---------------------------------------------------------------------------

describe("getAvailableSlots — enabled day, no conflicts", () => {
  it("returns slots filling 09:00-17:00 in 30-min increments", () => {
    useToday();
    const slots = getAvailableSlots(MONDAY_KEY, svc30, baseAvailability, []);
    // 8 hours = 480 minutes / 30 = 16 slots
    expect(slots).toHaveLength(16);
    expect(slots[0]).toBe("09:00");
    expect(slots[slots.length - 1]).toBe("16:30");
  });

  it("each slot is a HH:MM string", () => {
    useToday();
    const slots = getAvailableSlots(MONDAY_KEY, svc30, baseAvailability, []);
    for (const s of slots) {
      expect(s).toMatch(/^\d{2}:\d{2}$/);
    }
  });
});

// ---------------------------------------------------------------------------
// getAvailableSlots — disabled day
// ---------------------------------------------------------------------------

describe("getAvailableSlots — disabled day", () => {
  it("returns [] for Saturday (disabled)", () => {
    useToday();
    const slots = getAvailableSlots(SATURDAY_KEY, svc30, baseAvailability, []);
    expect(slots).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getAvailableSlots — past date
// ---------------------------------------------------------------------------

describe("getAvailableSlots — past date", () => {
  it("returns [] for a date in the past", () => {
    useToday();
    const slots = getAvailableSlots("2026-05-01", svc30, baseAvailability, []);
    expect(slots).toHaveLength(0);
  });
});

describe("getAvailableSlots — same-day slots", () => {
  it("removes slots that have started and keeps the next future slot", () => {
    const slots = getAvailableSlots(
      "2026-05-29",
      svc30,
      baseAvailability,
      [],
      undefined,
      [],
      undefined,
      { now: new Date("2026-05-29T10:15:00Z"), timeZone: "UTC" },
    );

    expect(slots).not.toContain("10:00");
    expect(slots[0]).toBe("10:30");
  });

  it("does not offer a slot whose start minute is the current minute", () => {
    const slots = getAvailableSlots(
      "2026-05-29",
      svc30,
      baseAvailability,
      [],
      undefined,
      [],
      undefined,
      { now: new Date("2026-05-29T10:30:00Z"), timeZone: "UTC" },
    );

    expect(slots).not.toContain("10:30");
    expect(slots[0]).toBe("11:00");
  });

  it("compares against the provider timezone instead of the runtime timezone", () => {
    const slots = getAvailableSlots(
      "2026-05-29",
      svc30,
      baseAvailability,
      [],
      undefined,
      [],
      undefined,
      {
        now: new Date("2026-05-29T03:15:00Z"),
        timeZone: "Asia/Bangkok",
      },
    );

    expect(slots[0]).toBe("10:30");
  });

  it("makes today unavailable once every start time has elapsed", () => {
    expect(
      isDateAvailable(
        "2026-05-29",
        svc30,
        baseAvailability,
        [],
        undefined,
        [],
        undefined,
        { now: new Date("2026-05-29T16:45:00Z"), timeZone: "UTC" },
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getAvailableSlots — full-day service
// ---------------------------------------------------------------------------

describe("getAvailableSlots — full-day service", () => {
  it("returns [] for a full-day service (not appointment)", () => {
    useToday();
    const slots = getAvailableSlots(MONDAY_KEY, svcFullDay, baseAvailability, []);
    expect(slots).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getAvailableSlots — blocked by existing booking
// ---------------------------------------------------------------------------

describe("getAvailableSlots — blocked by booking", () => {
  it("removes slot that overlaps with an existing booking", () => {
    useToday();
    const booking = makeBooking({ startTime: "09:00", endTime: "09:30" });
    const slots = getAvailableSlots(MONDAY_KEY, svc30, baseAvailability, [booking]);
    expect(slots).not.toContain("09:00");
    // adjacent slot should still be available
    expect(slots).toContain("09:30");
  });

  it("returns [] when a full-day booking blocks the entire day", () => {
    useToday();
    const booking = makeBooking({ bookingType: "full-day", startTime: undefined, endTime: undefined });
    const slots = getAvailableSlots(MONDAY_KEY, svc30, baseAvailability, [booking]);
    expect(slots).toHaveLength(0);
  });
});

describe("getAvailableSlots — blocked by provider availability", () => {
  it("removes appointment slots that overlap a blocked time window", () => {
    useToday();
    const availability: WeeklyAvailability = {
      ...baseAvailability,
      monday: {
        ...baseAvailability.monday,
        blockedWindows: [{ startTime: "14:00", endTime: "16:00" }],
      },
    };

    const slots = getAvailableSlots(MONDAY_KEY, svc30, availability, []);

    expect(slots).toContain("13:30");
    expect(slots).not.toContain("14:00");
    expect(slots).not.toContain("14:30");
    expect(slots).not.toContain("15:00");
    expect(slots).not.toContain("15:30");
    expect(slots).toContain("16:00");
  });

  it("returns false for full-day availability when part of the day is blocked", () => {
    useToday();
    const availability: WeeklyAvailability = {
      ...baseAvailability,
      monday: {
        ...baseAvailability.monday,
        blockedWindows: [{ startTime: "14:00", endTime: "16:00" }],
      },
    };

    expect(isDateAvailable(MONDAY_KEY, svcFullDay, availability, [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isDateAvailable
// ---------------------------------------------------------------------------

describe("isDateAvailable", () => {
  it("returns true for an enabled weekday with open slots", () => {
    useToday();
    expect(isDateAvailable(MONDAY_KEY, svc30, baseAvailability, [])).toBe(true);
  });

  it("returns false for a disabled weekday", () => {
    useToday();
    expect(isDateAvailable(SATURDAY_KEY, svc30, baseAvailability, [])).toBe(false);
  });

  it("returns false for a past date", () => {
    useToday();
    expect(isDateAvailable("2026-05-28", svc30, baseAvailability, [])).toBe(false);
  });

  it("returns false when all slots are booked", () => {
    useToday();
    // Fill every 30-min slot from 09:00 to 17:00
    const bookings: BookingRecord[] = [];
    let h = 9;
    let m = 0;
    while (h < 17) {
      const startTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const endM = m + 30;
      const endTime = `${String(endM >= 60 ? h + 1 : h).padStart(2, "0")}:${String(endM % 60).padStart(2, "0")}`;
      bookings.push(makeBooking({ id: `bk_${h}${m}`, startTime, endTime }));
      m += 30;
      if (m >= 60) { h++; m = 0; }
    }
    expect(isDateAvailable(MONDAY_KEY, svc30, baseAvailability, bookings)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Single-occurrence events
// ---------------------------------------------------------------------------

const TUESDAY_KEY = "2026-06-02";
const PAST_KEY = "2026-05-01"; // before mocked TODAY

const svcSingle: Service = {
  id: "svc_single",
  name: "Eiffel Tower Visit",
  bookingType: "appointment",
  durationMinutes: 120,
  description: "",
  occurrenceMode: "single",
  occurrenceDate: MONDAY_KEY,
  startTime: "18:00",
  endTime: "20:00",
  maxSpots: 2,
};

describe("getSpotsLeft", () => {
  it("returns Infinity when the service has no maxSpots cap", () => {
    expect(getSpotsLeft(svc30, MONDAY_KEY, [])).toBe(Infinity);
  });

  it("returns the full cap when there are no bookings", () => {
    expect(getSpotsLeft(svcSingle, MONDAY_KEY, [])).toBe(2);
  });

  it("subtracts active bookings for the service on that date", () => {
    const bookings = [
      makeBooking({ id: "b1", serviceId: "svc_single", dateKey: MONDAY_KEY }),
    ];
    expect(getSpotsLeft(svcSingle, MONDAY_KEY, bookings)).toBe(1);
  });

  it("ignores cancelled bookings and other services/dates", () => {
    const bookings = [
      makeBooking({ id: "b1", serviceId: "svc_single", dateKey: MONDAY_KEY, status: "cancelled" }),
      makeBooking({ id: "b2", serviceId: "other", dateKey: MONDAY_KEY }),
      makeBooking({ id: "b3", serviceId: "svc_single", dateKey: TUESDAY_KEY }),
    ];
    expect(getSpotsLeft(svcSingle, MONDAY_KEY, bookings)).toBe(2);
  });
});

describe("isDateAvailable (single occurrence)", () => {
  it("is available on the event's own date when spots remain", () => {
    useToday();
    expect(isDateAvailable(MONDAY_KEY, svcSingle, baseAvailability, [])).toBe(true);
  });

  it("is unavailable on any other date", () => {
    useToday();
    // Tuesday is an enabled weekday, but a single event ignores weekly availability.
    expect(isDateAvailable(TUESDAY_KEY, svcSingle, baseAvailability, [])).toBe(false);
  });

  it("is unavailable when the event date is in the past", () => {
    useToday();
    expect(
      isDateAvailable(PAST_KEY, { ...svcSingle, occurrenceDate: PAST_KEY }, baseAvailability, []),
    ).toBe(false);
  });

  it("is unavailable once spots are full", () => {
    useToday();
    const bookings = [
      makeBooking({ id: "b1", serviceId: "svc_single", dateKey: MONDAY_KEY }),
      makeBooking({ id: "b2", serviceId: "svc_single", dateKey: MONDAY_KEY }),
    ];
    expect(isDateAvailable(MONDAY_KEY, svcSingle, baseAvailability, bookings)).toBe(false);
  });
});

describe("getAvailableSlots (single occurrence)", () => {
  it("returns the fixed window start on the event date", () => {
    useToday();
    expect(getAvailableSlots(MONDAY_KEY, svcSingle, baseAvailability, [])).toEqual(["18:00"]);
  });

  it("returns nothing on a different date", () => {
    useToday();
    expect(getAvailableSlots(TUESDAY_KEY, svcSingle, baseAvailability, [])).toEqual([]);
  });

  it("returns nothing when the event is full", () => {
    useToday();
    const bookings = [
      makeBooking({ id: "b1", serviceId: "svc_single", dateKey: MONDAY_KEY }),
      makeBooking({ id: "b2", serviceId: "svc_single", dateKey: MONDAY_KEY }),
    ];
    expect(getAvailableSlots(MONDAY_KEY, svcSingle, baseAvailability, bookings)).toEqual([]);
  });

  it("returns nothing after a same-day event has started", () => {
    const sameDayService = {
      ...svcSingle,
      occurrenceDate: "2026-05-29",
      startTime: "10:00",
      endTime: "12:00",
    };
    const clock = { now: new Date("2026-05-29T10:15:00Z"), timeZone: "UTC" };

    expect(
      getAvailableSlots(
        "2026-05-29",
        sameDayService,
        baseAvailability,
        [],
        undefined,
        [],
        undefined,
        clock,
      ),
    ).toEqual([]);
    expect(
      isDateAvailable(
        "2026-05-29",
        sameDayService,
        baseAvailability,
        [],
        undefined,
        [],
        undefined,
        clock,
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Weekly-recurring events (e.g. hot yoga every Tuesday 6:30 PM)
// ---------------------------------------------------------------------------

const svcWeeklyTue: Service = {
  id: "svc_weekly",
  name: "Hot Yoga",
  bookingType: "appointment",
  durationMinutes: 60,
  description: "",
  occurrenceMode: "weekly",
  weekdays: ["tuesday"],
  startTime: "18:30",
  endTime: "19:30",
  maxSpots: 12,
};

describe("isDateAvailable (weekly occurrence)", () => {
  it("is available on a matching weekday", () => {
    useToday();
    // 2026-06-02 is a Tuesday
    expect(isDateAvailable(TUESDAY_KEY, svcWeeklyTue, baseAvailability, [])).toBe(true);
  });

  it("is unavailable on a non-matching weekday", () => {
    useToday();
    // 2026-06-01 is a Monday
    expect(isDateAvailable(MONDAY_KEY, svcWeeklyTue, baseAvailability, [])).toBe(false);
  });

  it("is unavailable in the past even on a matching weekday", () => {
    useToday();
    // 2026-04-28 is a Tuesday, before the mocked today
    expect(isDateAvailable("2026-04-28", svcWeeklyTue, baseAvailability, [])).toBe(false);
  });

  it("is unavailable once that date's spots are full", () => {
    useToday();
    const bookings = Array.from({ length: 12 }, (_, i) =>
      makeBooking({ id: `w${i}`, serviceId: "svc_weekly", dateKey: TUESDAY_KEY }),
    );
    expect(isDateAvailable(TUESDAY_KEY, svcWeeklyTue, baseAvailability, bookings)).toBe(false);
  });
});

describe("getAvailableSlots (weekly occurrence)", () => {
  it("returns the fixed start time on a matching weekday", () => {
    useToday();
    expect(getAvailableSlots(TUESDAY_KEY, svcWeeklyTue, baseAvailability, [])).toEqual(["18:30"]);
  });

  it("returns nothing on a non-matching weekday", () => {
    useToday();
    expect(getAvailableSlots(MONDAY_KEY, svcWeeklyTue, baseAvailability, [])).toEqual([]);
  });

  it("returns nothing after a same-day weekly event has started", () => {
    const sameDayService = {
      ...svcWeeklyTue,
      weekdays: ["friday" as const],
      startTime: "10:00",
      endTime: "11:00",
    };
    const clock = { now: new Date("2026-05-29T10:15:00Z"), timeZone: "UTC" };

    expect(
      getAvailableSlots(
        "2026-05-29",
        sameDayService,
        baseAvailability,
        [],
        undefined,
        [],
        undefined,
        clock,
      ),
    ).toEqual([]);
    expect(
      isDateAvailable(
        "2026-05-29",
        sameDayService,
        baseAvailability,
        [],
        undefined,
        [],
        undefined,
        clock,
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getDayAvailability
// ---------------------------------------------------------------------------

/** 09:00-11:00 Monday only: 4 slots at 30 minutes, so halves are exact. */
const shortMondayAvailability: WeeklyAvailability = {
  ...baseAvailability,
  monday: { enabled: true, startTime: "09:00", endTime: "11:00" },
};

describe("getDayAvailability", () => {
  it("reports a wide-open appointment day as open at full ratio", () => {
    useToday();

    expect(
      getDayAvailability(MONDAY_KEY, svc30, shortMondayAvailability, []),
    ).toEqual({ capacity: 4, free: 4, ratio: 1, level: "open" });
  });

  it("treats exactly half-free as open, not tight", () => {
    useToday();

    const bookings = [
      makeBooking({ id: "bk_1", startTime: "09:00", endTime: "09:30" }),
      makeBooking({ id: "bk_2", startTime: "09:30", endTime: "10:00" }),
    ];

    expect(
      getDayAvailability(MONDAY_KEY, svc30, shortMondayAvailability, bookings),
    ).toMatchObject({ capacity: 4, free: 2, ratio: 0.5, level: "open" });
  });

  it("reports below-half as tight", () => {
    useToday();

    const bookings = [
      makeBooking({ id: "bk_1", startTime: "09:00", endTime: "09:30" }),
      makeBooking({ id: "bk_2", startTime: "09:30", endTime: "10:00" }),
      makeBooking({ id: "bk_3", startTime: "10:00", endTime: "10:30" }),
    ];

    expect(
      getDayAvailability(MONDAY_KEY, svc30, shortMondayAvailability, bookings),
    ).toMatchObject({ capacity: 4, free: 1, ratio: 0.25, level: "tight" });
  });

  it("reports a fully-booked day as full, keeping its capacity", () => {
    useToday();

    const bookings = [
      makeBooking({ id: "bk_1", startTime: "09:00", endTime: "09:30" }),
      makeBooking({ id: "bk_2", startTime: "09:30", endTime: "10:00" }),
      makeBooking({ id: "bk_3", startTime: "10:00", endTime: "10:30" }),
      makeBooking({ id: "bk_4", startTime: "10:30", endTime: "11:00" }),
    ];

    expect(
      getDayAvailability(MONDAY_KEY, svc30, shortMondayAvailability, bookings),
    ).toEqual({ capacity: 4, free: 0, ratio: 0, level: "full" });
  });

  it("counts blocked windows against free slots but not capacity", () => {
    useToday();

    const withBlock: WeeklyAvailability = {
      ...shortMondayAvailability,
      monday: {
        enabled: true,
        startTime: "09:00",
        endTime: "11:00",
        blockedWindows: [{ startTime: "09:00", endTime: "10:00" }],
      },
    };

    expect(getDayAvailability(MONDAY_KEY, svc30, withBlock, [])).toMatchObject({
      capacity: 4,
      free: 2,
      level: "open",
    });
  });

  it("closes a disabled weekday", () => {
    useToday();

    expect(
      getDayAvailability(SATURDAY_KEY, svc30, baseAvailability, []),
    ).toEqual({ capacity: 0, free: 0, ratio: 0, level: "closed" });
  });

  it("closes a past date", () => {
    useToday();

    expect(getDayAvailability("2026-05-01", svc30, baseAvailability, [])).toEqual({
      capacity: 0,
      free: 0,
      ratio: 0,
      level: "closed",
    });
  });

  it("drops elapsed slots from free on today", () => {
    const clock = { now: new Date("2026-05-29T10:15:00Z"), timeZone: "UTC" };
    // 2026-05-29 is a Friday; use the short 09:00-11:00 window on Friday.
    const shortFriday: WeeklyAvailability = {
      ...baseAvailability,
      friday: { enabled: true, startTime: "09:00", endTime: "11:00" },
    };

    // 09:00, 09:30 and 10:00 have all started by 10:15; only 10:30 remains.
    expect(
      getDayAvailability(
        "2026-05-29",
        svc30,
        shortFriday,
        [],
        undefined,
        [],
        undefined,
        clock,
      ),
    ).toMatchObject({ capacity: 4, free: 1, level: "tight" });
  });

  it("treats a full-day service as a single all-or-nothing slot", () => {
    useToday();

    expect(
      getDayAvailability(MONDAY_KEY, svcFullDay, baseAvailability, []),
    ).toEqual({ capacity: 1, free: 1, ratio: 1, level: "open" });

    const taken = [
      makeBooking({
        id: "bk_fd",
        serviceId: svcFullDay.id,
        bookingType: "full-day",
        startTime: undefined,
        endTime: undefined,
      }),
    ];

    expect(
      getDayAvailability(MONDAY_KEY, svcFullDay, baseAvailability, taken),
    ).toEqual({ capacity: 1, free: 0, ratio: 0, level: "full" });
  });

  it("uses maxSpots as the denominator for a capped single-occurrence event", () => {
    useToday();

    const event: Service = {
      id: "svc_evt",
      name: "Workshop",
      bookingType: "appointment",
      description: "",
      occurrenceMode: "single",
      occurrenceDate: MONDAY_KEY,
      startTime: "18:00",
      maxSpots: 4,
    };

    expect(getDayAvailability(MONDAY_KEY, event, baseAvailability, [])).toEqual({
      capacity: 4,
      free: 4,
      ratio: 1,
      level: "open",
    });

    const threeTaken = [1, 2, 3].map((n) =>
      makeBooking({ id: `bk_evt_${n}`, serviceId: event.id, dateKey: MONDAY_KEY }),
    );

    expect(
      getDayAvailability(MONDAY_KEY, event, baseAvailability, threeTaken),
    ).toMatchObject({ capacity: 4, free: 1, ratio: 0.25, level: "tight" });
  });

  it("closes dates the event does not fall on", () => {
    useToday();

    const event: Service = {
      id: "svc_evt",
      name: "Workshop",
      bookingType: "appointment",
      description: "",
      occurrenceMode: "single",
      occurrenceDate: MONDAY_KEY,
      startTime: "18:00",
      maxSpots: 4,
    };

    expect(
      getDayAvailability("2026-06-02", event, baseAvailability, []),
    ).toEqual({ capacity: 0, free: 0, ratio: 0, level: "closed" });
  });
});
