import { describe, expect, it } from "vitest";
import { getNextSteps } from "@/lib/dashboard-overview";
import { createEmptyStore } from "@/lib/store";

function openWeek() {
  const availability = createEmptyStore().availability;
  availability.monday.enabled = true;
  return availability;
}

function closedWeek() {
  const availability = createEmptyStore().availability;
  for (const day of Object.values(availability)) day.enabled = false;
  return availability;
}

describe("getNextSteps", () => {
  it("is empty when the page is ready", () => {
    expect(
      getNextSteps({
        serviceCount: 2,
        vertical: "healthcare",
        availability: openWeek(),
        publishingEnabled: true,
      }),
    ).toEqual([]);
  });

  it("asks for a service first", () => {
    expect(
      getNextSteps({ serviceCount: 0, vertical: "healthcare", availability: openWeek() }).map(
        (step) => step.id,
      ),
    ).toEqual(["add-service"]);
  });

  it("asks for availability when no day is open, pointing at that section", () => {
    expect(
      getNextSteps({ serviceCount: 1, vertical: "healthcare", availability: closedWeek() })[0],
    ).toEqual({ id: "set-availability", section: "availability" });
  });

  it("does not ask events organisers for weekly hours", () => {
    expect(
      getNextSteps({ serviceCount: 1, vertical: "events", availability: closedWeek() }),
    ).toEqual([]);
  });

  it("surfaces publishing being off, and only when it is known to be off", () => {
    expect(
      getNextSteps({
        serviceCount: 1,
        vertical: "spaces",
        availability: openWeek(),
        publishingEnabled: false,
      }).map((step) => step.id),
    ).toEqual(["publishing-off"]);
    expect(
      getNextSteps({ serviceCount: 1, vertical: "spaces", availability: openWeek() }),
    ).toEqual([]);
  });

  it("orders several gaps by what unblocks bookings first", () => {
    expect(
      getNextSteps({
        serviceCount: 0,
        vertical: "spaces",
        availability: closedWeek(),
        publishingEnabled: false,
      }).map((step) => step.id),
    ).toEqual(["add-service", "set-availability", "publishing-off"]);
  });
});
