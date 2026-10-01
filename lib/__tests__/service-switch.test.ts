import { describe, expect, it } from "vitest";

import { planServiceSwitch } from "@/lib/service-switch";
import type { Service } from "@/lib/types";

const appointment = { id: "svc_2", name: "Follow-up", bookingType: "appointment" } as Service;
const fullDay = { id: "svc_3", name: "Day pass", bookingType: "full-day" } as Service;
const flow = { dateKey: "2026-08-10", time: "09:30", locationKey: undefined };

describe("planServiceSwitch", () => {
  it("tries to hold the same date and time for another appointment", () => {
    expect(planServiceSwitch(appointment, flow, [])).toEqual({
      kind: "hold",
      dateKey: "2026-08-10",
      time: "09:30",
      locationKey: undefined,
    });
  });

  it("drops the time for a full-day service", () => {
    expect(planServiceSwitch(fullDay, flow, [])).toMatchObject({ kind: "hold", time: "" });
  });

  it("brings a fixed-date event's own date and time", () => {
    const single = {
      ...appointment,
      occurrenceMode: "single",
      occurrenceDate: "2026-09-01",
      startTime: "18:00",
    } as Service;

    expect(planServiceSwitch(single, flow, [])).toMatchObject({
      kind: "hold",
      dateKey: "2026-09-01",
      time: "18:00",
    });
  });

  it("keeps a date a weekly event runs on and clears one it does not", () => {
    // 2026-08-10 is a Monday.
    const weekly = (weekdays: Service["weekdays"]) =>
      ({ ...appointment, occurrenceMode: "weekly", weekdays }) as Service;

    expect(planServiceSwitch(weekly(["monday"]), flow, [])).toMatchObject({
      kind: "hold",
      dateKey: "2026-08-10",
    });
    expect(planServiceSwitch(weekly(["friday"]), flow, [])).toEqual({
      kind: "pick-time",
      dateKey: "",
      locationKey: undefined,
    });
  });

  it("keeps a location the new service offers, and asks when it does not", () => {
    const at = { ...flow, locationKey: "address2" as const };

    expect(planServiceSwitch(appointment, at, ["address1", "address2"])).toMatchObject({
      kind: "hold",
      locationKey: "address2",
    });
    expect(planServiceSwitch(appointment, at, ["address1", "custom"])).toMatchObject({
      kind: "pick-time",
      dateKey: "2026-08-10",
    });
    expect(planServiceSwitch(appointment, at, ["address1"])).toMatchObject({
      kind: "hold",
      locationKey: undefined,
    });
  });
});
