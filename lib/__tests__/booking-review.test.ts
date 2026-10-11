import { describe, expect, it } from "vitest";

import {
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

  it("filters by new, by seen, or not at all", () => {
    expect(matchesReviewFilter(fresh, "new")).toBe(true);
    expect(matchesReviewFilter(seen, "new")).toBe(false);
    expect(matchesReviewFilter(fresh, "seen")).toBe(false);
    expect(matchesReviewFilter(seen, "seen")).toBe(true);
    expect(matchesReviewFilter(fresh, "all")).toBe(true);
    expect(matchesReviewFilter(seen, "all")).toBe(true);
  });
});
