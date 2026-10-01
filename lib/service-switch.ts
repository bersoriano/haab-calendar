import { isSingleOccurrence, isWeeklyOccurrence, weeklyMatchesDate } from "@/lib/availability";
import type { BookingFlow, LocationKey, Service } from "@/lib/types";

/**
 * What changing the service on the details step should try. `hold` asks for the
 * same date (and time) for the new service, so the visitor can stay put if it
 * is free; `pick-time` goes straight to the calendar because the new service
 * cannot reuse the selection at all.
 */
export type ServiceSwitchPlan =
  | { kind: "hold"; dateKey: string; time: string; locationKey: LocationKey | undefined }
  | { kind: "pick-time"; dateKey: string; locationKey: LocationKey | undefined };

export function planServiceSwitch(
  next: Service,
  flow: Pick<BookingFlow, "dateKey" | "time" | "locationKey">,
  /** The new service's locations, in display order. */
  locationKeys: LocationKey[],
): ServiceSwitchPlan {
  // Keep the visitor's location when the new service is offered there. With
  // two or more to choose from and no match, the choice is theirs, on step 2.
  const keepsLocation = flow.locationKey && locationKeys.includes(flow.locationKey);
  const locationKey = keepsLocation ? flow.locationKey : undefined;
  const mustPickLocation = !keepsLocation && locationKeys.length >= 2;

  // A fixed-date event brings its own date and time.
  if (isSingleOccurrence(next)) {
    const dateKey = next.occurrenceDate ?? "";
    return mustPickLocation || !dateKey
      ? { kind: "pick-time", dateKey, locationKey }
      : { kind: "hold", dateKey, time: next.startTime ?? "", locationKey };
  }

  // A weekly event only runs on its own weekdays.
  const dateKey =
    flow.dateKey && (!isWeeklyOccurrence(next) || weeklyMatchesDate(next, flow.dateKey))
      ? flow.dateKey
      : "";
  const time = next.bookingType === "full-day" ? "" : flow.time;

  if (mustPickLocation || !dateKey || (next.bookingType === "appointment" && !time)) {
    return { kind: "pick-time", dateKey, locationKey };
  }

  return { kind: "hold", dateKey, time, locationKey };
}
