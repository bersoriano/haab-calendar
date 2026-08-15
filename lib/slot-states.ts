import { getAvailableSlots, type AvailabilityClock } from "@/lib/availability";
import type {
  BookingHoldRecord,
  BookingRecord,
  Service,
  WeeklyAvailability,
} from "@/lib/types";

export type PublicSlotState =
  | { time: string; status: "open" }
  | { time: string; status: "held"; freesAt: number };

/**
 * The times to show for a date, and why each one is the way it is.
 *
 * A slot sitting inside someone else's ten-minute hold is not gone — it is
 * pending, and will come back if they do not finish. Hiding it tells the
 * visitor less than saying so, and sends them away from a time that may be
 * theirs in two minutes.
 *
 * Derived by asking the availability engine twice: once as it stands, and once
 * as if no hold existed. Anything that only the second pass offers is held by
 * someone. Slots blocked by a confirmed booking, a blocked window, or the clock
 * appear in neither pass and stay hidden, because those are not coming back.
 */
export function getPublicSlotStates(
  dateKey: string,
  service: Service,
  availability: WeeklyAvailability,
  bookings: BookingRecord[],
  ignoredBookingId?: string,
  bookingHolds: BookingHoldRecord[] = [],
  ignoredHoldId?: string,
  clockOptions?: AvailabilityClock,
): PublicSlotState[] {
  const open = getAvailableSlots(
    dateKey,
    service,
    availability,
    bookings,
    ignoredBookingId,
    bookingHolds,
    ignoredHoldId,
    clockOptions,
  );

  const withoutHolds = getAvailableSlots(
    dateKey,
    service,
    availability,
    bookings,
    ignoredBookingId,
    [],
    undefined,
    clockOptions,
  );

  const openSet = new Set(open);
  const dateHolds = bookingHolds.filter(
    (hold) => hold.dateKey === dateKey && hold.id !== ignoredHoldId,
  );

  return withoutHolds.map((time) => {
    if (openSet.has(time)) {
      return { time, status: "open" } as const;
    }

    // The hold that frees this time soonest is the one worth naming.
    const freesAt = dateHolds
      .filter((hold) => !hold.startTime || hold.startTime === time || overlapsSlot(hold, time))
      .map((hold) => hold.expiresAt)
      .sort((left, right) => left - right)[0];

    return freesAt === undefined
      ? ({ time, status: "open" } as const)
      : ({ time, status: "held", freesAt } as const);
  });
}

/** A full-day hold has no start time and takes every slot on its date. */
function overlapsSlot(hold: BookingHoldRecord, time: string) {
  if (!hold.startTime || !hold.endTime) {
    return true;
  }

  return hold.startTime <= time && time < hold.endTime;
}
