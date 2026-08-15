import { describe, expect, it } from "vitest";

import { getServiceSelectCta } from "@/lib/service-select-cta";
import { getVerticalCopy } from "@/lib/vertical-copy";
import type { Service } from "@/lib/types";

function service(overrides: Partial<Service> = {}): Service {
  return {
    id: "svc",
    name: "Service",
    bookingType: "appointment",
    durationMinutes: 30,
    description: "",
    ...overrides,
  };
}

describe("getServiceSelectCta", () => {
  const copy = getVerticalCopy("healthcare");

  it("names a time for an ordinary appointment", () => {
    expect(getServiceSelectCta(service(), copy)).toBe(copy.phrases.selectAppointmentCta);
  });

  it("names the day for a full-day booking", () => {
    expect(getServiceSelectCta(service({ bookingType: "full-day" }), copy)).toBe(
      copy.phrases.selectFullDayCta,
    );
  });

  it("names a place when the service sells a fixed number of them", () => {
    const event = service({ occurrenceMode: "single", maxSpots: 18 });
    const table = service({ capacityScope: "slot", maxSpots: 12 });

    expect(getServiceSelectCta(event, copy)).toBe(copy.phrases.selectCapacityCta);
    expect(getServiceSelectCta(table, copy)).toBe(copy.phrases.selectCapacityCta);
  });

  it("gives every vertical its own wording in both languages", () => {
    for (const vertical of ["healthcare", "spaces", "professional", "events", "restaurant"] as const) {
      for (const lang of ["en", "es"] as const) {
        const verticalCopy = getVerticalCopy(vertical, lang);

        for (const cta of [
          verticalCopy.phrases.selectAppointmentCta,
          verticalCopy.phrases.selectFullDayCta,
          verticalCopy.phrases.selectCapacityCta,
        ]) {
          expect(cta.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("says table rather than spot for a restaurant", () => {
    expect(getVerticalCopy("restaurant").phrases.selectCapacityCta).toBe("Take a table");
    expect(getVerticalCopy("restaurant", "es").phrases.selectCapacityCta).toBe("Tomar una mesa");
  });
});
