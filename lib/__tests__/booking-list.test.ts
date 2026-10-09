import { describe, expect, it } from "vitest";
import { getBookingListView } from "@/lib/booking-list";
import { getDateTimeKeysInTimeZone } from "@/lib/date";
import type { BookingRecord } from "@/lib/types";

function booking(id: string, dateKey: string, startTime = "09:00", overrides: Partial<BookingRecord> = {}): BookingRecord {
  return { id, dateKey, startTime, endTime: "18:00", serviceId: "s1", serviceName: "Consultation", bookingType: "appointment", clientName: id, clientEmail: `${id}@example.com`, clientPhone: "555", notes: "", cost: "", status: "confirmed", createdAt: "2026-01-01", updatedAt: "2026-01-01", manageToken: "", ...overrides };
}

describe("getBookingListView", () => {
  const items = [booking("future", "2026-10-12"), booking("yesterday", "2026-10-08"), booking("morning", "2026-10-09"), booking("evening", "2026-10-09", "18:00"), booking("tomorrow", "2026-10-10"), booking("week", "2026-10-02"), booking("old", "2026-10-01")];
  it("defaults to nearest day, preferring future on ties and later times within a day", () => {
    expect(getBookingListView(items, "2026-10-09").bookings.map(b => b.id)).toEqual(["evening", "morning", "tomorrow", "yesterday", "future", "week"]);
    expect(items[0].id).toBe("future");
  });
  it("sorts sooner and latest by scheduled date and time", () => {
    expect(getBookingListView(items, "2026-10-09", { sort: "sooner" }).bookings.map(b => b.id)).toEqual(["week", "yesterday", "morning", "evening", "tomorrow", "future"]);
    expect(getBookingListView(items, "2026-10-09", { sort: "latest" }).bookings.map(b => b.id)).toEqual(["future", "tomorrow", "evening", "morning", "yesterday", "week"]);
  });
  it("archives only dates more than seven calendar days old across year boundaries", () => {
    const result = getBookingListView([booking("boundary", "2026-12-25"), booking("old", "2026-12-24")], "2027-01-01", { view: "archive" });
    expect(result.bookings.map(b => b.id)).toEqual(["old"]);
    expect([result.activeCount, result.archiveCount, result.totalCount]).toEqual([1, 1, 1]);
  });
  it("combines search, status and type within archive while keeping view counts", () => {
    const result = getBookingListView([booking("Ana", "2026-10-01", "09:00", { status: "cancelled", bookingType: "full-day" }), booking("Bo", "2026-09-30")], "2026-10-09", { view: "archive", search: " ANA ", status: "cancelled", type: "full-day" });
    expect(result.bookings.map(b => b.id)).toEqual(["Ana"]);
    expect(result.totalCount).toBe(2);
  });
  it("uses provider's day at midnight and moves bookings when that day advances", () => {
    const today = getDateTimeKeysInTimeZone(new Date("2026-10-10T02:00:00Z"), "America/Mexico_City").dateKey;
    const items = [booking("boundary", "2026-10-02")];
    expect(getBookingListView(items, today).activeCount).toBe(1);
    expect(getBookingListView(items, "2026-10-10").archiveCount).toBe(1);
  });
  it("sorts full-day bookings without a start time", () => {
    const items = [booking("appointment", "2026-10-09"), booking("day", "2026-10-09", "09:00", { bookingType: "full-day", startTime: undefined, endTime: undefined })];
    expect(getBookingListView(items, "2026-10-09", { sort: "sooner" }).bookings.map(b => b.id)).toEqual(["day", "appointment"]);
  });
});
