import { describe, expect, it, vi } from "vitest";

import type { Service } from "@/lib/types";

vi.mock("server-only", () => ({}));

const { toServicePayload } = await import("@/lib/supabase/provider-store");

const service: Service = {
  id: "s",
  name: "Consultation",
  description: "A first visit.",
  bookingType: "appointment",
  durationMinutes: 30,
};

describe("toServicePayload notes", () => {
  it("saves the notes with the line breaks the owner typed", () => {
    const payload = toServicePayload("p", { ...service, notes: "\n Bring a photo ID.\nArrive 10 minutes early. \n" }, 0);

    // Only the ends are trimmed; the break between the lines is the owner's.
    expect(payload.notes).toBe("Bring a photo ID.\nArrive 10 minutes early.");
  });

  it("saves blank notes as none", () => {
    expect(toServicePayload("p", { ...service, notes: " \n " }, 0).notes).toBeNull();
  });
});

describe("toServicePayload optional tour fields", () => {
  it("stores nothing a bare service did not set", () => {
    const payload = toServicePayload("p", service, 0);

    expect(payload.photo_urls).toEqual([]);
    expect(payload.cancellation_policy).toBeNull();
    expect(payload.min_group_size).toBeNull();
    expect(payload.traveler_fields).toEqual([]);
  });

  it("cleans what an owner sets", () => {
    const payload = toServicePayload(
      "p",
      {
        ...service,
        photoUrls: ["https://a.example/1.jpg", "javascript:alert(1)"],
        cancellationPolicy: "  Free up to 7 days before.  ",
        minGroupSize: 6,
        travelerFields: ["diet", "passport"],
      },
      0,
    );

    expect(payload.photo_urls).toEqual(["https://a.example/1.jpg"]);
    expect(payload.cancellation_policy).toBe("Free up to 7 days before.");
    expect(payload.min_group_size).toBe(6);
    expect(payload.traveler_fields).toEqual(["passport", "diet"]);
  });
});
