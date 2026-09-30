import { describe, expect, it } from "vitest";

import { getDateTile, getSummaryClientRows } from "../details-summary";
import { formatCompactTimeRange } from "../format";

describe("getDateTile", () => {
  it("splits a date into month, day and weekday", () => {
    expect(getDateTile("2026-10-01", "en")).toEqual({ month: "OCT", day: "1", weekday: "THU" });
  });

  it("drops the abbreviation dot Spanish adds", () => {
    const tile = getDateTile("2026-10-01", "es");

    expect(tile.month).toBe("OCT");
    expect(tile.weekday).toBe("JUE");
    expect(tile.month).not.toContain(".");
  });
});

describe("formatCompactTimeRange", () => {
  it("merges the meridiem when both ends share it", () => {
    expect(formatCompactTimeRange("09:00", "09:30", "en")).toBe("9:00 – 9:30 AM");
  });

  it("keeps both when the range crosses noon", () => {
    expect(formatCompactTimeRange("11:30", "12:30", "en")).toBe("11:30 AM – 12:30 PM");
  });

  it("uses 24h in Spanish", () => {
    expect(formatCompactTimeRange("14:00", "14:45", "es")).toBe("14:00 – 14:45");
  });

  it("is empty when an end is missing", () => {
    expect(formatCompactTimeRange("09:00", undefined)).toBe("");
    expect(formatCompactTimeRange(undefined, "09:30")).toBe("");
  });
});

describe("getSummaryClientRows", () => {
  const labels = {
    name: "Full name",
    email: "Email",
    phone: "Phone number",
    partySize: "Guests",
    notes: "Notes",
  };
  const empty = { clientName: "", clientEmail: "", clientPhone: "", partySize: "", notes: "" };

  it("asks for every required field and accepts empty notes", () => {
    const rows = getSummaryClientRows({ values: empty, requiresPartySize: false, labels });

    expect(rows.map((r) => [r.key, r.status])).toEqual([
      ["name", "missing"],
      ["email", "missing"],
      ["phone", "missing"],
      ["notes", "optional-empty"],
    ]);
  });

  it("marks trimmed values as filled and ignores whitespace-only input", () => {
    const rows = getSummaryClientRows({
      values: { ...empty, clientName: "  Jamie ", clientEmail: "   ", notes: "hi" },
      requiresPartySize: false,
      labels,
    });

    expect(rows[0]).toMatchObject({ value: "Jamie", status: "filled" });
    expect(rows[1].status).toBe("missing");
    expect(rows[3]).toMatchObject({ value: "hi", status: "filled" });
  });

  it("adds a required party-size row only for services that seat guests", () => {
    const rows = getSummaryClientRows({ values: empty, requiresPartySize: true, labels });

    expect(rows.map((r) => r.key)).toEqual(["name", "email", "phone", "partySize", "notes"]);
    expect(rows[3].status).toBe("missing");
  });
});
