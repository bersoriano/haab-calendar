import { hasSlotCapacity } from "@/lib/availability";
import type { Service } from "@/lib/types";
import type { VerticalCopy } from "@/lib/vertical-copy";

/**
 * The action cue on a service card. The three booking modes hand over
 * different things — a time, a whole day, one of a fixed number of places — so
 * each names its own verb rather than sharing a generic "Select".
 */
export function getServiceSelectCta(service: Service, copy: VerticalCopy) {
  if (service.bookingType === "full-day") {
    return copy.phrases.selectFullDayCta;
  }

  const sellsPlaces =
    hasSlotCapacity(service) ||
    (typeof service.maxSpots === "number" && Number.isFinite(service.maxSpots));

  return sellsPlaces ? copy.phrases.selectCapacityCta : copy.phrases.selectAppointmentCta;
}
