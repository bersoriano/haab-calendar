import { describe, expect, it } from "vitest";
import { createEmptyStore } from "@/lib/store";
import { isStoreDirty } from "@/lib/store-dirty";
import type { BookingRecord, ModuleStore, Service } from "@/lib/types";

function base(): ModuleStore {
  const store = createEmptyStore();
  return { ...store, setupComplete: true, vertical: "healthcare" };
}

describe("isStoreDirty", () => {
  it("is clean for an identical store", () => {
    expect(isStoreDirty(base(), base())).toBe(false);
  });

  it("flags a provider edit", () => {
    const saved = base();
    expect(
      isStoreDirty(saved, { ...saved, provider: { ...saved.provider, businessName: "New" } }),
    ).toBe(true);
  });

  it("flags an availability edit", () => {
    const saved = base();
    expect(
      isStoreDirty(saved, {
        ...saved,
        availability: {
          ...saved.availability,
          monday: { ...saved.availability.monday, enabled: !saved.availability.monday.enabled },
        },
      }),
    ).toBe(true);
  });

  it("flags service and vertical changes", () => {
    const saved = base();
    const service = { id: "s-new", name: "Consultation" } as Service;

    expect(isStoreDirty(saved, { ...saved, vertical: "events" })).toBe(true);
    expect(isStoreDirty(saved, { ...saved, services: [...saved.services, service] })).toBe(true);
  });

  it("ignores bookings and holds, which the server owns", () => {
    const saved = base();
    expect(
      isStoreDirty(saved, {
        ...saved,
        bookings: [{ id: "b1" } as BookingRecord],
        bookingHolds: [],
      }),
    ).toBe(false);
  });
});
