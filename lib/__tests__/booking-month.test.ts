import { describe, expect, it } from "vitest";

import { buildBookingMonth } from "@/lib/booking-month";
import type { BookingStatus } from "@/lib/types";

function booking(dateKey: string, startTime?: string, status: BookingStatus = "confirmed") {
  return { id: `${dateKey}-${startTime ?? "day"}-${status}`, dateKey, startTime, status };
}

// October 2026 starts on a Thursday and ends on a Saturday.
const october = new Date(2026, 9, 15);

function dayOf(month: ReturnType<typeof buildBookingMonth<ReturnType<typeof booking>>>, dateKey: string) {
  const found = month.weeks.flat().find((day) => day.dateKey === dateKey);
  if (!found) throw new Error(`${dateKey} is not in the month`);
  return found;
}

describe("buildBookingMonth", () => {
  it("lays the month out as whole weeks, Sunday first", () => {
    const month = buildBookingMonth([], october, "2026-10-12");

    expect(month.weeks).toHaveLength(5);
    expect(month.weeks.every((week) => week.length === 7)).toBe(true);
    expect(month.weeks[0][0]).toMatchObject({ dateKey: "2026-09-27", inMonth: false });
    expect(month.weeks[0][4]).toMatchObject({ dateKey: "2026-10-01", dayOfMonth: 1, inMonth: true });
    expect(month.weeks[4][6]).toMatchObject({ dateKey: "2026-10-31", inMonth: true });
  });

  it("gives a month only the weeks it spans", () => {
    // February 2026: 28 days from a Sunday. August 2026: 31 days from a Saturday.
    expect(buildBookingMonth([], new Date(2026, 1, 1), "2026-10-12").weeks).toHaveLength(4);
    expect(buildBookingMonth([], new Date(2026, 7, 1), "2026-10-12").weeks).toHaveLength(6);
  });

  it("marks today", () => {
    const month = buildBookingMonth([], october, "2026-10-12");

    expect(month.weeks.flat().filter((day) => day.isToday).map((day) => day.dateKey)).toEqual([
      "2026-10-12",
    ]);
  });

  it("puts each day's bookings on it, earliest first, a full day leading", () => {
    const month = buildBookingMonth(
      [booking("2026-10-13", "15:00"), booking("2026-10-13", "09:30"), booking("2026-10-13"), booking("2026-10-20", "10:00")],
      october,
      "2026-10-12",
    );

    expect(dayOf(month, "2026-10-13").bookings.map((item) => item.startTime)).toEqual([
      undefined,
      "09:30",
      "15:00",
    ]);
    expect(dayOf(month, "2026-10-20").bookings).toHaveLength(1);
    expect(month.total).toBe(4);
  });

  it("leaves out cancelled bookings, and keeps rescheduled ones", () => {
    const month = buildBookingMonth(
      [booking("2026-10-13", "09:00", "cancelled"), booking("2026-10-13", "10:00", "rescheduled")],
      october,
      "2026-10-12",
    );

    expect(dayOf(month, "2026-10-13").bookings.map((item) => item.status)).toEqual(["rescheduled"]);
    expect(month.total).toBe(1);
  });

  it("counts only the month's own days", () => {
    const month = buildBookingMonth(
      [booking("2026-09-30", "09:00"), booking("2026-10-01", "09:00"), booking("2026-11-01", "09:00")],
      october,
      "2026-10-12",
    );

    expect(dayOf(month, "2026-09-30").bookings).toEqual([]);
    expect(dayOf(month, "2026-09-30").level).toBe(0);
    expect(month.total).toBe(1);
  });

  it("shades a quiet month lightly: one booking a day is not a full day", () => {
    const month = buildBookingMonth(
      [booking("2026-10-13", "09:00"), booking("2026-10-14", "09:00"), booking("2026-10-14", "10:00")],
      october,
      "2026-10-12",
    );

    expect(dayOf(month, "2026-10-12").level).toBe(0);
    expect(dayOf(month, "2026-10-13").level).toBe(1);
    expect(dayOf(month, "2026-10-14").level).toBe(2);
  });

  it("shades a busy month against its busiest day", () => {
    const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
    const month = buildBookingMonth(
      [
        ...hours.map((hour) => booking("2026-10-13", hour)),
        ...hours.slice(0, 5).map((hour) => booking("2026-10-14", hour)),
        booking("2026-10-15", "09:00"),
      ],
      october,
      "2026-10-12",
    );

    expect(dayOf(month, "2026-10-13").level).toBe(4);
    expect(dayOf(month, "2026-10-14").level).toBe(3);
    expect(dayOf(month, "2026-10-15").level).toBe(1);
  });
});
