import { describe, expect, it } from "vitest";
import { groupBookingsByDate } from "@/lib/booking-groups";

describe("groupBookingsByDate", () => {
  const items = [
    { id: "a", dateKey: "2026-10-08" },
    { id: "b", dateKey: "2026-10-08" },
    { id: "c", dateKey: "2026-10-09" },
    { id: "d", dateKey: "2026-10-12" },
  ];

  it("groups by date in order and labels today and tomorrow", () => {
    const groups = groupBookingsByDate(items, "2026-10-08");

    expect(groups.map((group) => [group.dateKey, group.relative, group.items.map((i) => i.id)])).toEqual([
      ["2026-10-08", "today", ["a", "b"]],
      ["2026-10-09", "tomorrow", ["c"]],
      ["2026-10-12", null, ["d"]],
    ]);
  });

  it("finds tomorrow across a month and a year boundary", () => {
    expect(groupBookingsByDate([{ dateKey: "2026-11-01" }], "2026-10-31")[0].relative).toBe(
      "tomorrow",
    );
    expect(groupBookingsByDate([{ dateKey: "2027-01-01" }], "2026-12-31")[0].relative).toBe(
      "tomorrow",
    );
  });

  it("does not label past dates", () => {
    expect(groupBookingsByDate([{ dateKey: "2026-10-07" }], "2026-10-08")[0].relative).toBeNull();
  });

  it("keeps a date that reappears later in its own first-seen group", () => {
    const groups = groupBookingsByDate(
      [
        { id: "x", dateKey: "2026-10-09" },
        { id: "y", dateKey: "2026-10-08" },
        { id: "z", dateKey: "2026-10-09" },
      ],
      "2026-10-08",
    );

    expect(groups.map((group) => group.items.map((item) => item.id))).toEqual([["x", "z"], ["y"]]);
  });

  it("returns no groups for no bookings", () => {
    expect(groupBookingsByDate([], "2026-10-08")).toEqual([]);
  });
});
