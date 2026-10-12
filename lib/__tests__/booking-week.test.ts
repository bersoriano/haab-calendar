import { describe, expect, it } from "vitest";

import { buildBookingWeek } from "@/lib/booking-week";
import type { BookingStatus } from "@/lib/types";

function booking(dateKey: string, startTime?: string, status: BookingStatus = "confirmed") {
  return { id: `${dateKey}-${startTime ?? "day"}-${status}`, dateKey, startTime, status };
}

// Wednesday, in the week of Sunday October 11 to Saturday October 17.
const wednesday = new Date(2026, 9, 14);

describe("buildBookingWeek", () => {
  it("is the seven days, Sunday first, of the week the day falls in", () => {
    const week = buildBookingWeek([], wednesday, "2026-10-12");

    expect(week.days.map((day) => day.dateKey)).toEqual([
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
    ]);
    expect(week.days[0].dayOfMonth).toBe(11);
  });

  it("is the same week from any of its days", () => {
    const fromSunday = buildBookingWeek([], new Date(2026, 9, 11), "2026-10-12");
    const fromSaturday = buildBookingWeek([], new Date(2026, 9, 17), "2026-10-12");

    expect(fromSunday).toEqual(fromSaturday);
  });

  it("runs across the end of a month and of a year", () => {
    const week = buildBookingWeek([], new Date(2026, 11, 31), "2026-10-12");

    expect(week.days[0].dateKey).toBe("2026-12-27");
    expect(week.days[6].dateKey).toBe("2027-01-02");
  });

  it("marks today, when today is in the week", () => {
    expect(
      buildBookingWeek([], wednesday, "2026-10-12").days.filter((day) => day.isToday).map((day) => day.dateKey),
    ).toEqual(["2026-10-12"]);
    expect(buildBookingWeek([], wednesday, "2026-10-20").days.some((day) => day.isToday)).toBe(false);
  });

  it("puts each day's bookings on it, earliest first, a full day leading", () => {
    const week = buildBookingWeek(
      [booking("2026-10-13", "15:00"), booking("2026-10-13", "09:30"), booking("2026-10-13"), booking("2026-10-16", "10:00")],
      wednesday,
      "2026-10-12",
    );

    expect(week.days[2].bookings.map((item) => item.startTime)).toEqual([undefined, "09:30", "15:00"]);
    expect(week.days[5].bookings).toHaveLength(1);
    expect(week.total).toBe(4);
  });

  it("leaves out cancelled bookings and the bookings of other weeks", () => {
    const week = buildBookingWeek(
      [
        booking("2026-10-13", "09:00", "cancelled"),
        booking("2026-10-13", "10:00", "rescheduled"),
        booking("2026-10-10", "09:00"),
        booking("2026-10-18", "09:00"),
      ],
      wednesday,
      "2026-10-12",
    );

    expect(week.days[2].bookings.map((item) => item.status)).toEqual(["rescheduled"]);
    expect(week.total).toBe(1);
  });
});
