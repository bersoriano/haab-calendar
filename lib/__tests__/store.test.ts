import { describe, it, expect } from "vitest";
import {
  normalizeStore,
  normalizeProvider,
  pruneBookingHolds,
  sortBookings,
  createEmptyStore,
  materializeVerticalServices,
  applyVerticalToStore,
  setAppointmentServiceDurations,
  setServiceBookingLength,
  normalizeServices,
  normalizeVertical,
} from "@/lib/store";
import { VERTICALS } from "@/config/verticals";
import type { BookingHoldRecord, BookingRecord, ModuleStore } from "@/lib/types";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function makeBooking(overrides: Partial<BookingRecord>): BookingRecord {
  return {
    id: "bk_1",
    serviceId: "svc_1",
    serviceName: "Test Service",
    bookingType: "appointment",
    dateKey: "2026-06-10",
    startTime: "09:00",
    endTime: "09:30",
    clientName: "Alice",
    clientEmail: "alice@test.com",
    clientPhone: "555-0000",
    notes: "",
    cost: "",
    status: "confirmed",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    manageToken: "tok_1",
    ...overrides,
  };
}

function makeHold(overrides: Partial<BookingHoldRecord>): BookingHoldRecord {
  return {
    id: "hold_1",
    serviceId: "svc_1",
    bookingType: "appointment",
    dateKey: "2026-06-10",
    startTime: "09:00",
    endTime: "09:30",
    createdAt: "2026-05-01T00:00:00.000Z",
    expiresAt: Date.now() + 60_000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// normalizeStore
// ---------------------------------------------------------------------------

describe("normalizeStore", () => {
  it("produces a complete store from null input", () => {
    const store = normalizeStore(null);
    expect(store).toHaveProperty("provider");
    expect(store).toHaveProperty("services");
    expect(store).toHaveProperty("availability");
    expect(store).toHaveProperty("bookings");
    expect(store).toHaveProperty("bookingHolds");
    expect(store).toHaveProperty("setupComplete");
  });

  it("produces a complete store from empty object", () => {
    const store = normalizeStore({} as ModuleStore);
    expect(Array.isArray(store.services)).toBe(true);
    expect(Array.isArray(store.bookings)).toBe(true);
    expect(Array.isArray(store.bookingHolds)).toBe(true);
    expect(typeof store.setupComplete).toBe("boolean");
  });

  it("availability has all 7 weekday keys", () => {
    const store = normalizeStore(null);
    const keys = Object.keys(store.availability);
    expect(keys).toContain("sunday");
    expect(keys).toContain("monday");
    expect(keys).toContain("tuesday");
    expect(keys).toContain("wednesday");
    expect(keys).toContain("thursday");
    expect(keys).toContain("friday");
    expect(keys).toContain("saturday");
    expect(keys).toHaveLength(7);
  });

  it("each day has enabled/startTime/endTime/blockedWindows", () => {
    const store = normalizeStore(null);
    for (const day of Object.values(store.availability)) {
      expect(day).toHaveProperty("enabled");
      expect(day).toHaveProperty("startTime");
      expect(day).toHaveProperty("endTime");
      expect(day).toHaveProperty("blockedWindows");
      expect(Array.isArray(day.blockedWindows)).toBe(true);
    }
  });

  it("normalizes blocked time windows for existing availability", () => {
    const store = normalizeStore({
      ...createEmptyStore(),
      availability: {
        ...createEmptyStore().availability,
        monday: {
          enabled: true,
          startTime: "09:00",
          endTime: "17:00",
          blockedWindows: [{ startTime: "14:00", endTime: "16:00" }],
        },
      },
    });

    expect(store.availability.monday.blockedWindows).toEqual([
      { startTime: "14:00", endTime: "16:00" },
    ]);
  });

  it("preserves setupComplete=true from input", () => {
    const input = { setupComplete: true } as unknown as ModuleStore;
    expect(normalizeStore(input).setupComplete).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// normalizeProvider
// ---------------------------------------------------------------------------

describe("normalizeProvider", () => {
  it("derives slug from businessName", () => {
    const provider = normalizeProvider({ businessName: "My Business" });
    expect(provider.publicSlug).toBe("my-business");
  });

  it("falls back to fullName for slug when businessName is empty", () => {
    const provider = normalizeProvider({ fullName: "John Doe" });
    expect(provider.publicSlug).toBe("john-doe");
  });

  it("falls back to haab-calendar when both names are empty", () => {
    const provider = normalizeProvider({});
    expect(provider.publicSlug).toBe("haab-calendar");
  });

  it("preserves existing publicSlug if provided", () => {
    const provider = normalizeProvider({
      publicSlug: "custom-slug",
      businessName: "Some Biz",
    });
    expect(provider.publicSlug).toBe("custom-slug");
  });

  it("fills missing fields with empty strings", () => {
    const provider = normalizeProvider(null);
    expect(provider.fullName).toBe("");
    expect(provider.businessName).toBe("");
    expect(provider.email).toBe("");
  });
});

// ---------------------------------------------------------------------------
// normalizeProvider — language field
// ---------------------------------------------------------------------------

describe("normalizeProvider language", () => {
  it("defaults language to 'en' when missing", () => {
    expect(normalizeProvider(undefined).language).toBe("en");
    expect(normalizeProvider({}).language).toBe("en");
  });

  it("preserves a provided language", () => {
    expect(normalizeProvider({ language: "en" }).language).toBe("en");
    expect(normalizeProvider({ language: "es" }).language).toBe("es");
  });
});

// ---------------------------------------------------------------------------
// pruneBookingHolds
// ---------------------------------------------------------------------------

describe("pruneBookingHolds", () => {
  it("drops holds whose expiresAt is in the past", () => {
    const expired = makeHold({ expiresAt: Date.now() - 1000 });
    const now = Date.now();
    expect(pruneBookingHolds([expired], now)).toHaveLength(0);
  });

  it("keeps holds whose expiresAt is in the future", () => {
    const active = makeHold({ expiresAt: Date.now() + 60_000 });
    const now = Date.now();
    expect(pruneBookingHolds([active], now)).toHaveLength(1);
  });

  it("filters mixed list correctly", () => {
    const now = Date.now();
    const expired = makeHold({ id: "h1", expiresAt: now - 1 });
    const active1 = makeHold({ id: "h2", expiresAt: now + 10_000 });
    const active2 = makeHold({ id: "h3", expiresAt: now + 20_000 });
    const result = pruneBookingHolds([expired, active1, active2], now);
    expect(result).toHaveLength(2);
    expect(result.map((h) => h.id)).not.toContain("h1");
  });

  it("returns empty array when all holds are expired", () => {
    const now = Date.now();
    const holds = [
      makeHold({ id: "h1", expiresAt: now - 5000 }),
      makeHold({ id: "h2", expiresAt: now - 1 }),
    ];
    expect(pruneBookingHolds(holds, now)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// sortBookings
// ---------------------------------------------------------------------------

describe("sortBookings", () => {
  it("sorts by dateKey ascending", () => {
    const b1 = makeBooking({ id: "b1", dateKey: "2026-06-15" });
    const b2 = makeBooking({ id: "b2", dateKey: "2026-06-10" });
    const b3 = makeBooking({ id: "b3", dateKey: "2026-06-12" });
    const sorted = sortBookings([b1, b2, b3]);
    expect(sorted.map((b) => b.id)).toEqual(["b2", "b3", "b1"]);
  });

  it("sorts by startTime ascending when dates are equal", () => {
    const b1 = makeBooking({ id: "b1", dateKey: "2026-06-10", startTime: "14:00" });
    const b2 = makeBooking({ id: "b2", dateKey: "2026-06-10", startTime: "09:00" });
    const b3 = makeBooking({ id: "b3", dateKey: "2026-06-10", startTime: "11:30" });
    const sorted = sortBookings([b1, b2, b3]);
    expect(sorted.map((b) => b.id)).toEqual(["b2", "b3", "b1"]);
  });

  it("treats undefined startTime as 00:00 (sorts first)", () => {
    const b1 = makeBooking({ id: "b1", dateKey: "2026-06-10", startTime: "09:00" });
    const b2 = makeBooking({ id: "b2", dateKey: "2026-06-10", startTime: undefined });
    const sorted = sortBookings([b1, b2]);
    expect(sorted[0].id).toBe("b2");
  });

  it("does not mutate the original array", () => {
    const b1 = makeBooking({ id: "b1", dateKey: "2026-06-15" });
    const b2 = makeBooking({ id: "b2", dateKey: "2026-06-10" });
    const original = [b1, b2];
    sortBookings(original);
    expect(original[0].id).toBe("b1");
  });
});

describe("vertical helpers", () => {
  it("normalizeVertical accepts known ids and rejects unknown", () => {
    expect(normalizeVertical("healthcare")).toBe("healthcare");
    expect(normalizeVertical("spaces")).toBe("spaces");
    expect(normalizeVertical("events")).toBe("events");
    expect(normalizeVertical("nope")).toBeUndefined();
    expect(normalizeVertical(undefined)).toBeUndefined();
    expect(normalizeVertical(null)).toBeUndefined();
  });

  it("materializeVerticalServices assigns ids and drops duration for full-day", () => {
    const spaces = VERTICALS.find((v) => v.id === "spaces")!;
    const result = materializeVerticalServices(spaces.services);

    expect(result).toHaveLength(2);
    expect(result.every((s) => typeof s.id === "string" && s.id.length > 0)).toBe(true);

    const appointment = result.find((s) => s.bookingType === "appointment")!;
    const fullDay = result.find((s) => s.bookingType === "full-day")!;
    expect(appointment.durationMinutes).toBe(60);
    expect(fullDay.durationMinutes).toBeUndefined();
  });

  it("healthcare services start with an empty medical specialty", () => {
    const healthcare = VERTICALS.find((v) => v.id === "healthcare")!;

    expect(healthcare.services.every((service) => service.medicalSpecialty === "")).toBe(true);
  });

  it("normalizes medical specialty for appointment services only", () => {
    const result = normalizeServices([
      {
        id: "svc_1",
        name: "Cardiology consult",
        bookingType: "appointment",
        durationMinutes: 30,
        description: "Specialist visit",
        medicalSpecialty: " Cardiology ",
      },
      {
        id: "svc_2",
        name: "Clinic day",
        bookingType: "full-day",
        description: "Full-day clinic reservation",
        medicalSpecialty: "Pediatrics",
      },
    ]);

    expect(result[0].medicalSpecialty).toBe("Cardiology");
    expect(result[1].medicalSpecialty).toBeUndefined();
  });

  it("applyVerticalToStore seeds services + availability + vertical, preserves the rest", () => {
    const base = createEmptyStore();
    base.provider.fullName = "Keep Me";
    base.setupComplete = false;
    const healthcare = VERTICALS.find((v) => v.id === "healthcare")!;

    const next = applyVerticalToStore(base, healthcare);

    expect(next.vertical).toBe("healthcare");
    expect(next.services).toHaveLength(2);
    expect(next.availability.saturday.enabled).toBe(false);
    expect(next.provider.fullName).toBe("Keep Me");
    expect(next.setupComplete).toBe(false);
    expect(next.bookings).toEqual([]);
  });

  it("setAppointmentServiceDurations updates appointment services and preserves full-day services", () => {
    const spaces = VERTICALS.find((v) => v.id === "spaces")!;
    const base = applyVerticalToStore(createEmptyStore(), spaces);

    const next = setAppointmentServiceDurations(base, 180);
    const appointment = next.services.find((s) => s.bookingType === "appointment")!;
    const fullDay = next.services.find((s) => s.bookingType === "full-day")!;

    expect(appointment.durationMinutes).toBe(180);
    expect(fullDay.durationMinutes).toBeUndefined();
  });

  it("setServiceBookingLength can switch seeded services between timed and full-day bookings", () => {
    const spaces = VERTICALS.find((v) => v.id === "spaces")!;
    const base = applyVerticalToStore(createEmptyStore(), spaces);

    const fullDay = setServiceBookingLength(base, "full-day");
    expect(fullDay.services.every((s) => s.bookingType === "full-day")).toBe(true);
    expect(fullDay.services.every((s) => s.durationMinutes === undefined)).toBe(true);
    expect(fullDay.services.every((s) => s.medicalSpecialty === undefined)).toBe(true);

    const timed = setServiceBookingLength(fullDay, 240);
    expect(timed.services.every((s) => s.bookingType === "appointment")).toBe(true);
    expect(timed.services.every((s) => s.durationMinutes === 240)).toBe(true);
  });

  it("normalizeStore round-trips vertical and rejects unknown ids", () => {
    const withVertical = normalizeStore({ ...createEmptyStore(), vertical: "professional" });
    expect(withVertical.vertical).toBe("professional");

    const bad = normalizeStore({ ...createEmptyStore(), vertical: "garbage" } as never);
    expect(bad.vertical).toBeUndefined();

    expect(createEmptyStore().vertical).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// per-location pricing carries through normalization
// ---------------------------------------------------------------------------

describe("normalizeStore — per-location pricing", () => {
  it("keeps service.locationPrices and booking.location", () => {
    const store = {
      provider: { businessName: "Co", address1: "A", address2: "B" },
      services: [
        {
          id: "s1",
          name: "Visit",
          bookingType: "appointment",
          description: "",
          cost: "$100",
          linkedAddress1: true,
          linkedAddress2: true,
          locationPrices: { address2: "$75", address1: "" },
        },
      ],
      bookings: [
        {
          id: "b1",
          serviceId: "s1",
          serviceName: "Visit",
          bookingType: "appointment",
          dateKey: "2026-06-20",
          clientName: "A",
          clientEmail: "a@b.com",
          clientPhone: "1",
          notes: "",
          cost: "$75",
          location: "B",
          status: "confirmed",
          createdAt: "",
          updatedAt: "",
          manageToken: "t",
        },
      ],
      bookingHolds: [],
      setupComplete: true,
    } as unknown as ModuleStore;

    const normalized = normalizeStore(store);
    // empty override dropped, real one kept
    expect(normalized.services[0].locationPrices).toEqual({ address2: "$75" });
    expect(normalized.bookings[0].location).toBe("B");
  });
});
