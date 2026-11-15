import { describe, expect, it } from "vitest";

import { formatRsvpDeadline, isRsvpOpen, parseRsvpDeadline } from "@/lib/rsvp-deadline";

describe("isRsvpOpen", () => {
  const zone = "America/Mexico_City"; // UTC-6 in December

  it("is open with no deadline", () => {
    expect(isRsvpOpen(undefined, zone, new Date("2030-01-01T00:00:00Z"))).toBe(true);
  });

  it("stays open through the whole deadline day in the page's zone", () => {
    // 23:59 on Dec 20 in Mexico City is 05:59 on Dec 21 in UTC.
    expect(isRsvpOpen("2026-12-20", zone, new Date("2026-12-21T05:59:00Z"))).toBe(true);
    // Midnight on Dec 21 in Mexico City.
    expect(isRsvpOpen("2026-12-20", zone, new Date("2026-12-21T06:00:00Z"))).toBe(false);
  });

  it("falls back to UTC without a zone", () => {
    expect(isRsvpOpen("2026-12-20", undefined, new Date("2026-12-20T23:59:00Z"))).toBe(true);
    expect(isRsvpOpen("2026-12-20", "", new Date("2026-12-21T00:00:00Z"))).toBe(false);
  });
});

describe("parseRsvpDeadline", () => {
  it("keeps a real calendar date only", () => {
    expect(parseRsvpDeadline("2026-12-20")).toBe("2026-12-20");
    expect(parseRsvpDeadline(" 2026-12-20 ")).toBe("2026-12-20");
    expect(parseRsvpDeadline("2026-02-30")).toBeUndefined();
    expect(parseRsvpDeadline("20/12/2026")).toBeUndefined();
    expect(parseRsvpDeadline("")).toBeUndefined();
    expect(parseRsvpDeadline(null)).toBeUndefined();
  });
});

describe("formatRsvpDeadline", () => {
  it("writes the date in the page's language without shifting it", () => {
    expect(formatRsvpDeadline("2026-12-20", "es")).toBe("20 de diciembre de 2026");
    expect(formatRsvpDeadline("2026-12-20", "en")).toBe("December 20, 2026");
  });
});
