import type { BookingRecord, VerticalId } from "@/lib/types";

export type BookingReviewFilter = "all" | "new" | "seen";

/**
 * Reviewing bookings: a provider-side "seen" flag. A booking is new until its
 * provider marks it as seen, and can be marked new again.
 */

/** Only professional services work from an inbox of new sessions. */
export function tracksBookingReview(vertical: VerticalId | null | undefined) {
  return vertical === "professional";
}

export function isNewBooking(booking: Pick<BookingRecord, "reviewedAt">) {
  return !booking.reviewedAt;
}

export function countNewBookings(bookings: readonly Pick<BookingRecord, "reviewedAt">[]) {
  return bookings.filter(isNewBooking).length;
}

export function matchesReviewFilter(
  booking: Pick<BookingRecord, "reviewedAt">,
  filter: BookingReviewFilter,
) {
  return filter === "all" || isNewBooking(booking) === (filter === "new");
}
