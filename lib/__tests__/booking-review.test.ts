import { describe, expect, it } from "vitest";

import {
  canMarkBookingAsNew,
  countNewBookings,
  isNewBooking,
  matchesReviewFilter,
  tracksBookingReview,
} from "@/lib/booking-review";

const fresh = { reviewedAt: undefined };
const seen = { reviewedAt: "2026-10-11T12:00:00.000Z" };

describe("booking review", () => {
  it("is tracked for professional services only", () => {
    expect(tracksBookingReview("professional")).toBe(true);
    for (const vertical of ["healthcare", "events", "spaces", "restaurant"] as const) {
      expect(tracksBookingReview(vertical)).toBe(false);
    }
    expect(tracksBookingReview(undefined)).toBe(false);
  });

  it("calls a booking new until it has been marked as seen", () => {
    expect(isNewBooking(fresh)).toBe(true);
    expect(isNewBooking(seen)).toBe(false);
    expect(countNewBookings([fresh, seen, fresh])).toBe(2);
    expect(countNewBookings([])).toBe(0);
  });

  it("lets only a live booking, today or later, go back to new", () => {
    const today = "2026-10-11";
    const on = (dateKey: string, status: "confirmed" | "rescheduled" | "cancelled" = "confirmed") => ({
      dateKey,
      status,
    });

    expect(canMarkBookingAsNew(on("2026-10-11"), today)).toBe(true);
    expect(canMarkBookingAsNew(on("2026-10-12", "rescheduled"), today)).toBe(true);
    // Its day has passed, or it was called off: nothing left to look at again.
    expect(canMarkBookingAsNew(on("2026-10-10"), today)).toBe(false);
    expect(canMarkBookingAsNew(on("2026-10-12", "cancelled"), today)).toBe(false);
    expect(canMarkBookingAsNew(on("2026-10-10", "cancelled"), today)).toBe(false);
  });

  it("filters by new, by seen, or not at all", () => {
    expect(matchesReviewFilter(fresh, "new")).toBe(true);
    expect(matchesReviewFilter(seen, "new")).toBe(false);
    expect(matchesReviewFilter(fresh, "seen")).toBe(false);
    expect(matchesReviewFilter(seen, "seen")).toBe(true);
    expect(matchesReviewFilter(fresh, "all")).toBe(true);
    expect(matchesReviewFilter(seen, "all")).toBe(true);
  });
});
