import { describe, expect, it } from "vitest";

import { getVerticalPreset } from "@/config/verticals";
import {
  businessTypeDraftKey,
  findBlockingBookings,
  parseVerticalId,
  resolveDraftAction,
  seedBusinessTypeDraft,
  summarizeReplacement,
} from "@/lib/business-type-switch";
import { createEmptyStore } from "@/lib/store";
import type { BookingHoldRecord, BookingRecord, ModuleStore } from "@/lib/types";

function booking(overrides: Partial<BookingRecord>): BookingRecord {
  return {
    id: "b",
    serviceId: "s",
    serviceName: "Consultation",
    bookingType: "appointment",
    dateKey: "2026-10-09",
    startTime: "10:00",
    endTime: "10:30",
    clientName: "Ana",
    clientEmail: "ana@example.com",
    clientPhone: "",
    notes: "",
    cost: "",
    status: "confirmed",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    manageToken: "t",
    ...overrides,
  };
}

function hold(expiresAt: number): BookingHoldRecord {
  return {
    id: `h${expiresAt}`,
    serviceId: "s",
    bookingType: "appointment",
    dateKey: "2026-10-20",
    createdAt: "2026-10-09T00:00:00.000Z",
    expiresAt,
  };
}

const NOW = Date.UTC(2026, 9, 9, 15, 0, 0);

describe("findBlockingBookings", () => {
  it("blocks on bookings dated today or later that are not cancelled", () => {
    const result = findBlockingBookings(
      [
        booking({ id: "today", dateKey: "2026-10-09" }),
        booking({ id: "later", dateKey: "2026-11-01", status: "rescheduled" }),
        booking({ id: "past", dateKey: "2026-10-08" }),
        booking({ id: "cancelled", dateKey: "2026-10-20", status: "cancelled" }),
      ],
      [],
      "2026-10-09",
      NOW,
    );

    expect(result.bookings.map((item) => item.id)).toEqual(["today", "later"]);
    expect(result.activeHolds).toBe(0);
  });

  it("counts only holds that have not expired", () => {
    const result = findBlockingBookings([], [hold(NOW + 60_000), hold(NOW - 1), hold(NOW)], "2026-10-09", NOW);

    expect(result.activeHolds).toBe(1);
  });
});

describe("seedBusinessTypeDraft", () => {
  const live: ModuleStore = {
    ...createEmptyStore(),
    setupComplete: true,
    vertical: "professional",
    provider: {
      ...createEmptyStore().provider,
      fullName: "Ana Ruiz",
      businessName: "Acme Advisors",
      email: "ana@acme.test",
      phoneNumber1: "+1 555 0100",
      timezone: "America/Mexico_City",
      language: "es",
      dashboardLanguage: "en",
      logoImageUrl: "https://example.invalid/logo.png",
      headerImageUrl: "https://example.invalid/header.png",
      heroText: "Hello",
      publicTheme: "dark",
      publicSlug: "acme-advisors",
      maxBookingsPerDay: 4,
    },
    services: [{ id: "old", name: "Old service" } as ModuleStore["services"][number]],
    bookings: [booking({ id: "past", dateKey: "2026-01-01" })],
  };
  const preset = getVerticalPreset("healthcare", "en")!;
  const draft = seedBusinessTypeDraft(live, preset);

  it("keeps the profile, languages, branding and link", () => {
    const { maxBookingsPerDay: _dropped, ...kept } = live.provider;
    void _dropped;
    expect(draft.provider).toMatchObject(kept);
  });

  it("replaces services and availability with the new type's starter setup", () => {
    expect(draft.vertical).toBe("healthcare");
    expect(draft.services.map((service) => service.name)).not.toContain("Old service");
    expect(draft.services.length).toBe(preset.services.length);
  });

  it("starts unpublished, with no bookings, holds or daily limit", () => {
    expect(draft.setupComplete).toBe(false);
    expect(draft.bookings).toEqual([]);
    expect(draft.bookingHolds).toEqual([]);
    expect(draft.provider.maxBookingsPerDay).toBeUndefined();
  });
});

describe("summarizeReplacement", () => {
  it("counts what the switch replaces", () => {
    const store = createEmptyStore();
    store.availability.monday.enabled = true;
    store.availability.tuesday.enabled = false;
    store.provider.maxBookingsPerDay = 5;
    store.services = [{ id: "a" }, { id: "b" }] as ModuleStore["services"];

    expect(summarizeReplacement(store)).toEqual({
      services: 2,
      openDays: Object.values(store.availability).filter((day) => day.enabled).length,
      hasDailyLimit: true,
    });
  });
});

describe("businessTypeDraftKey", () => {
  it("scopes the draft to one provider", () => {
    expect(businessTypeDraftKey("acme")).toBe("haab-business-type-draft:acme");
  });
});

describe("resolveDraftAction", () => {
  const draftFor = (vertical: ModuleStore["vertical"]) => ({ ...createEmptyStore(), vertical });

  it("seeds a new draft when there is none", () => {
    expect(resolveDraftAction(null, "healthcare")).toBe("seed");
  });

  it("resumes a draft for the same type, or when no type is asked for", () => {
    expect(resolveDraftAction(draftFor("healthcare"), "healthcare")).toBe("resume");
    expect(resolveDraftAction(draftFor("healthcare"), undefined)).toBe("resume");
  });

  it("asks before replacing a draft for another type", () => {
    expect(resolveDraftAction(draftFor("spaces"), "healthcare")).toBe("ask");
  });

  it("has nothing to set up without a draft or a type", () => {
    expect(resolveDraftAction(null, undefined)).toBe("missing");
  });
});

describe("parseVerticalId", () => {
  it("accepts only known business types", () => {
    expect(parseVerticalId("restaurant")).toBe("restaurant");
    expect(parseVerticalId("bakery")).toBeUndefined();
    expect(parseVerticalId(null)).toBeUndefined();
  });
});
