import {
  BOOKING_HOLD_DURATION_MS,
  BOOKING_HOLD_WARNING_MS,
} from "./constants";
import type { BookingHold, Service } from "./types";

export function getBookingHoldSelectionKey(service: Service, dateKey: string, time: string) {
  return [
    service.id,
    dateKey,
    service.bookingType === "appointment" ? time : "full-day",
  ].join(":");
}

export function getBookingHoldRemainingMs(
  hold: Pick<BookingHold, "expiresAt"> | null,
  now: number,
) {
  return hold ? Math.max(0, hold.expiresAt - now) : BOOKING_HOLD_DURATION_MS;
}

export function isBookingHoldWarning(remainingMs: number) {
  return remainingMs > 0 && remainingMs <= BOOKING_HOLD_WARNING_MS;
}

export function canExtendBookingHold(
  hold: Pick<BookingHold, "extensionCount" | "released"> | null,
  remainingMs: number,
) {
  return Boolean(
    hold &&
      !hold.released &&
      hold.extensionCount === 0 &&
      isBookingHoldWarning(remainingMs),
  );
}

export function expireBookingHoldAtServerTime(hold: BookingHold, serverNow: number) {
  return {
    ...hold,
    expiresAt: Math.min(hold.expiresAt, serverNow),
    released: true,
  };
}
