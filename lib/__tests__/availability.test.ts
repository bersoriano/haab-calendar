import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getAvailableSlots,
  isDateAvailable,
  overlapExists,
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
