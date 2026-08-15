import { afterEach, describe, expect, it, vi } from "vitest";

import { getPublicSlotStates } from "@/lib/slot-states";
import type {
  BookingHoldRecord,
  BookingRecord,
  Service,
  WeeklyAvailability,
} from "@/lib/types";

const MONDAY = "2026-06-01";

const svc: Service = {
  id: "svc_1",
  name: "Consult",
  bookingType: "appointment",
  durationMinutes: 60,
  description: "",
};

const availability: WeeklyAvailability = {
  sunday: { enabled: false, startTime: "09:00", endTime: "12:00" },
  monday: { enabled: true, startTime: "09:00", endTime: "12:00" },
  tuesday: { enabled: true, startTime: "09:00", endTime: "12:00" },
  wednesday: { enabled: true, startTime: "09:00", endTime: "12:00" },
  thursday: { enabled: true, startTime: "09:00", endTime: "12:00" },
  friday: { enabled: true, startTime: "09:00", endTime: "12:00" },
  saturday: { enabled: false, startTime: "09:00", endTime: "12:00" },
};

function hold(overrides: Partial<BookingHoldRecord> = {}): BookingHoldRecord {
  return {
    id: "hold_1",
    serviceId: "svc_1",
    bookingType: "appointment",
    dateKey: MONDAY,
    startTime: "10:00",
    endTime: "11:00",
    createdAt: "",
    expiresAt: Date.UTC(2026, 5, 1, 9, 42),
    ...overrides,
  };
}

function booking(overrides: Partial<BookingRecord> = {}): BookingRecord {
  return {
    id: "bk_1",
    serviceId: "svc_1",
    serviceName: "Consult",
    bookingType: "appointment",
    dateKey: MONDAY,
    startTime: "09:00",
    endTime: "10:00",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    notes: "",
    cost: "",
    status: "confirmed",
    createdAt: "",
    updatedAt: "",
    manageToken: "",
    ...overrides,
  };
}

afterEach(() => vi.useRealTimers());

function useToday() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 4, 20));
}

describe("getPublicSlotStates", () => {
  it("calls every slot open when nothing is taken", () => {
    useToday();

    expect(getPublicSlotStates(MONDAY, svc, availability, [])).toEqual([
      { time: "09:00", status: "open" },
      { time: "10:00", status: "open" },
      { time: "11:00", status: "open" },
    ]);
  });

  it("marks a slot inside someone else's hold as held, with when it frees", () => {
    useToday();
    const holds = [hold()];

    const states = getPublicSlotStates(MONDAY, svc, availability, [], undefined, holds);

    expect(states).toEqual([
      { time: "09:00", status: "open" },
      { time: "10:00", status: "held", freesAt: holds[0].expiresAt },
      { time: "11:00", status: "open" },
    ]);
  });

  it("hides a slot a confirmed booking took, because that one is not coming back", () => {
    useToday();

    const states = getPublicSlotStates(MONDAY, svc, availability, [booking()]);

    expect(states.map((state) => state.time)).toEqual(["10:00", "11:00"]);
  });

  it("treats the visitor's own hold as their slot, not someone else's", () => {
    useToday();
    const holds = [hold()];

    const states = getPublicSlotStates(
      MONDAY,
      svc,
      availability,
      [],
      undefined,
      holds,
      holds[0].id,
    );

    expect(states).toEqual([
      { time: "09:00", status: "open" },
      { time: "10:00", status: "open" },
      { time: "11:00", status: "open" },
    ]);
  });

  it("names the soonest expiry when two holds cover a slot", () => {
    useToday();
    const soon = Date.UTC(2026, 5, 1, 9, 30);
    const later = Date.UTC(2026, 5, 1, 9, 55);
    const holds = [
      hold({ id: "h_late", expiresAt: later }),
      hold({ id: "h_soon", expiresAt: soon }),
    ];

    const states = getPublicSlotStates(MONDAY, svc, availability, [], undefined, holds);

    expect(states[1]).toEqual({ time: "10:00", status: "held", freesAt: soon });
  });

  it("holds every slot on the date for a full-day hold", () => {
    useToday();
    const holds = [
      hold({ bookingType: "full-day", startTime: undefined, endTime: undefined }),
    ];

    const states = getPublicSlotStates(MONDAY, svc, availability, [], undefined, holds);

    expect(states.every((state) => state.status === "held")).toBe(true);
  });

  it("returns nothing on a closed day", () => {
    useToday();

    expect(getPublicSlotStates("2026-06-07", svc, availability, [])).toEqual([]);
  });
});
