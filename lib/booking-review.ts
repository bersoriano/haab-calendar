import type { BookingRecord, VerticalId } from "@/lib/types";

export type BookingReviewFilter = "all" | "new" | "seen";

/**
 * Reviewing bookings: a provider-side "seen" flag. A booking is new until its
 * provider marks it as seen, and can be marked new again.
 */

/** Only professional services work from an inbox of new appointments. */
export function tracksBookingReview(vertical: VerticalId | null | undefined) {
  return vertical === "professional";
}

export function isNewBooking(booking: Pick<BookingRecord, "reviewedAt">) {
  return !booking.reviewedAt;
}

/**
 * Marking a booking new again asks its provider to look at it once more. A
 * cancelled booking, or one whose day has passed, has nothing left to look
 * at: once seen it stays seen. `todayKey` is today on the provider's clock.
 */
export function canMarkBookingAsNew(
  booking: Pick<BookingRecord, "status" | "dateKey">,
  todayKey: string,
) {
  return booking.status !== "cancelled" && booking.dateKey >= todayKey;
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
