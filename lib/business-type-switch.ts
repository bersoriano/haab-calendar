import type { Vertical } from "@/config/verticals";
import { applyVerticalToStore } from "@/lib/store";
import type { BookingHoldRecord, BookingRecord, ModuleStore } from "@/lib/types";

/**
 * Rules for switching a published page to another business type. Pure, so
 * the dialog, the draft and the tests agree; the database function re-checks
 * the blocking rule inside its own transaction.
 */

/**
 * What stops a switch: a booking a client still expects (not cancelled, dated
 * today or later in the provider's zone) or a hold someone is mid-checkout on.
 */
export function findBlockingBookings(
  bookings: BookingRecord[],
  holds: BookingHoldRecord[],
  todayKey: string,
  nowMs: number,
): { bookings: BookingRecord[]; activeHolds: number } {
  return {
    bookings: bookings.filter(
      (booking) => booking.status !== "cancelled" && booking.dateKey >= todayKey,
    ),
    // The exact instant counts as expired, as it does in the database.
    activeHolds: holds.filter((hold) => hold.expiresAt > nowMs).length,
  };
}

/**
 * The starting point for the new type: the account's profile, languages,
 * branding and link carried over; services and weekly hours from the new
 * type's starter setup; no daily limit; not yet published.
 */
export function seedBusinessTypeDraft(live: ModuleStore, vertical: Vertical): ModuleStore {
  const { maxBookingsPerDay: _dropped, ...provider } = live.provider;
  void _dropped;

  return applyVerticalToStore(
    {
      ...live,
      provider,
      services: [],
      bookings: [],
      bookingHolds: [],
      setupComplete: false,
    },
    vertical,
  );
}

/** The counts the warning repeats back to the provider. */
export function summarizeReplacement(live: ModuleStore) {
  return {
    services: live.services.length,
    openDays: Object.values(live.availability).filter((day) => day.enabled).length,
    hasDailyLimit: typeof live.provider.maxBookingsPerDay === "number",
  };
}

/** One draft per provider per browser. */
export function businessTypeDraftKey(providerKey: string) {
  return `haab-business-type-draft:${providerKey}`;
}
