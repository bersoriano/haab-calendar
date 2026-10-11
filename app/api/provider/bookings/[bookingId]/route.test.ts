import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  setProviderBookingReviewed: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));

vi.mock("@/lib/supabase/demo-edit", () => ({
  resolveDemoEditTarget: async () => null,
}));

vi.mock("@/lib/supabase/bookings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/bookings")>();
  return { ...actual, setProviderBookingReviewed: mocks.setProviderBookingReviewed };
});

import { PATCH } from "@/app/api/provider/bookings/[bookingId]/route";
import { PublicBookingWriteError } from "@/lib/supabase/bookings";

function patch(body: unknown) {
  const request = new Request("https://haab.example/api/provider/bookings/booking-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;

  return PATCH(request, { params: Promise.resolve({ bookingId: "booking-1" }) });
}

describe("PATCH /api/provider/bookings/[bookingId] — review", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.setProviderBookingReviewed.mockReset();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null });
    mocks.setProviderBookingReviewed.mockResolvedValue({ booking: { id: "booking-1" } });
  });

  it("requires a signed-in provider", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    expect((await patch({ action: "review", reviewed: true })).status).toBe(401);
    expect(mocks.setProviderBookingReviewed).not.toHaveBeenCalled();
  });

  it("marks a booking as seen, and as new again", async () => {
    const seen = await patch({ action: "review", reviewed: true });
    expect(seen.status).toBe(200);
    expect(await seen.json()).toEqual({ booking: { id: "booking-1" } });
    expect(mocks.setProviderBookingReviewed).toHaveBeenLastCalledWith(expect.anything(), "booking-1", true);

    await patch({ action: "review", reviewed: false });
    expect(mocks.setProviderBookingReviewed).toHaveBeenLastCalledWith(expect.anything(), "booking-1", false);
  });

  it("refuses a request that does not say which way to flip it", async () => {
    for (const reviewed of [undefined, "true", 1, null]) {
      expect((await patch({ action: "review", reviewed })).status).toBe(400);
    }
    expect(mocks.setProviderBookingReviewed).not.toHaveBeenCalled();
  });

  it("reports a booking that is not the provider's as not found", async () => {
    mocks.setProviderBookingReviewed.mockRejectedValue(
      new PublicBookingWriteError("That booking was not found.", 404),
    );

    const response = await patch({ action: "review", reviewed: true });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ userMessage: "That booking was not found." });
  });
});
