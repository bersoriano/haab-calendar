import type { Service } from "./types";

export function getBookingHoldSelectionKey(service: Service, dateKey: string, time: string) {
  return [
    service.id,
    dateKey,
    service.bookingType === "appointment" ? time : "full-day",
  ].join(":");
}
