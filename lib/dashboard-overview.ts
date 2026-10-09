import type { AdminTab, VerticalId, WeeklyAvailability } from "@/lib/types";

export type NextStepId = "add-service" | "set-availability" | "publishing-off";

export type NextStep = {
  id: NextStepId;
  /**
   * The dashboard section that resolves it. Absent when the owner cannot fix
   * it themselves — publishing is switched on by Haab, not from Settings.
   */
  section?: AdminTab;
};

/**
 * What still stands between this page and its next booking, in the order
 * that unblocks bookings first. Empty when nothing does — the overview then
 * shows no checklist at all.
 */
export function getNextSteps(input: {
  serviceCount: number;
  vertical?: VerticalId;
  availability: WeeklyAvailability;
  /** Undefined means unknown, which is not the same as off. */
  publishingEnabled?: boolean;
}): NextStep[] {
  const steps: NextStep[] = [];

  if (input.serviceCount === 0) {
    steps.push({ id: "add-service", section: "services" });
  }

  // Events carry their own dates and times; weekly hours do not apply.
  const hasOpenDay = Object.values(input.availability).some((day) => day.enabled);
  if (input.vertical !== "events" && !hasOpenDay) {
    steps.push({ id: "set-availability", section: "availability" });
  }

  if (input.publishingEnabled === false) {
    steps.push({ id: "publishing-off" });
  }

  return steps;
}
