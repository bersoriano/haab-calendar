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
