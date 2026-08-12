import { afterEach, describe, expect, it, vi } from "vitest";

import {
  detectTimeZone,
  findTimeZoneEntry,
  formatTimeInZone,
  formatTimeZoneChoice,
  formatTimeZoneOffset,
  formatTimeZonePlace,
  getTimeZoneOptionGroups,
  isUnsetTimeZone,
  isValidTimeZone,
  normalizeTimeZone,
  prettifyTimeZoneId,
  TIME_ZONES,
  zonedWallTimeToUtc,
} from "@/lib/timezone";

describe("the curated zone table", () => {
  it("only lists zones this runtime accepts", () => {
    for (const entry of TIME_ZONES) {
      expect(isValidTimeZone(entry.zone), entry.zone).toBe(true);
    }
  });

  it("lists each zone once", () => {
    const zones = TIME_ZONES.map((entry) => entry.zone);
    expect(new Set(zones).size).toBe(zones.length);
  });

  it("names every zone in both languages", () => {
    for (const entry of TIME_ZONES) {
      expect(entry.city.en.trim(), entry.zone).not.toBe("");
      expect(entry.city.es.trim(), entry.zone).not.toBe("");
      expect(entry.country.en.trim(), entry.zone).not.toBe("");
      expect(entry.country.es.trim(), entry.zone).not.toBe("");
    }
  });

  it("covers the zones the seeded example pages use", () => {
    for (const zone of [
      "America/New_York",
      "America/Los_Angeles",
      "Europe/London",
      "Asia/Bangkok",
      "America/Mexico_City",
    ]) {
      expect(findTimeZoneEntry(zone), zone).toBeDefined();
    }
  });
});

describe("validation", () => {
  it("accepts a real IANA zone", () => {
    expect(isValidTimeZone("America/Mexico_City")).toBe(true);
    expect(normalizeTimeZone("  America/Mexico_City  ")).toBe("America/Mexico_City");
  });

  it("rejects anything the runtime cannot use", () => {
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
    expect(normalizeTimeZone("Not/AZone")).toBe("");
    expect(normalizeTimeZone(null)).toBe("");
  });

  it("treats the column's UTC default as unset", () => {
    expect(isUnsetTimeZone("UTC")).toBe(true);
    expect(isUnsetTimeZone("utc")).toBe(true);
    expect(isUnsetTimeZone("")).toBe(true);
    expect(isUnsetTimeZone("Not/AZone")).toBe(true);
    expect(isUnsetTimeZone("America/Mexico_City")).toBe(false);
  });
});

describe("labels", () => {
  it("says the place in the reader's language", () => {
    expect(formatTimeZonePlace("America/Mexico_City", "en")).toBe("Mexico City, Mexico");
    expect(formatTimeZonePlace("America/Mexico_City", "es")).toBe("Ciudad de México, México");
    expect(formatTimeZonePlace("Europe/London", "es")).toBe("Londres, Reino Unido");
  });

  it("derives a readable city for an uncurated zone", () => {
    expect(prettifyTimeZoneId("America/Argentina/Buenos_Aires")).toBe("Buenos Aires");
    expect(formatTimeZonePlace("America/Nuuk", "en")).toBe("Nuuk");
  });

  it("pairs the place with the offset", () => {
    expect(formatTimeZoneChoice("America/Mexico_City", "en")).toMatch(
      /^Mexico City, Mexico \(GMT[+-]\d/,
    );
  });

  it("keeps the place when the runtime cannot produce an offset", () => {
    expect(formatTimeZoneOffset("Not/AZone")).toBe("");
    expect(formatTimeZoneChoice("Not/AZone", "en")).toBe("AZone");
  });

  it("reports the current local time as a check the provider can make", () => {
    // 18:30 UTC is 12:30 in Mexico City (GMT-6), year-round since 2022.
    const noonUtc = new Date("2026-08-12T18:30:00Z");
    expect(formatTimeInZone("America/Mexico_City", "en", noonUtc)).toContain("12:30");
    expect(formatTimeInZone("Not/AZone", "en", noonUtc)).toBe("");
  });
});

describe("picker options", () => {
  it("groups zones by region and labels the group", () => {
    const groups = getTimeZoneOptionGroups("es");
    const americas = groups.find((group) => group.region === "americas");

    expect(americas?.label).toBe("América");
    expect(americas?.options.some((option) => option.zone === "America/Mexico_City")).toBe(true);
  });

  it("keeps a saved zone that is not curated, so opening Settings cannot rewrite it", () => {
    const groups = getTimeZoneOptionGroups("en", "Africa/Kampala");
    const zones = groups.flatMap((group) => group.options.map((option) => option.zone));

    expect(zones).toContain("Africa/Kampala");
    expect(groups.find((group) => group.region === "africa")?.options.some(
      (option) => option.zone === "Africa/Kampala",
    )).toBe(true);
  });

  it("ignores an invalid saved zone rather than offering it", () => {
    const groups = getTimeZoneOptionGroups("en", "Not/AZone");
    const zones = groups.flatMap((group) => group.options.map((option) => option.zone));

    expect(zones).not.toContain("Not/AZone");
  });
});

describe("zonedWallTimeToUtc", () => {
  it("anchors a wall time to the instant that zone means by it", () => {
    // 09:00 in Mexico City (GMT-6, no DST) is 15:00 UTC.
    expect(zonedWallTimeToUtc("2026-10-11", "09:00", "America/Mexico_City")?.toISOString()).toBe(
      "2026-10-11T15:00:00.000Z",
    );
  });

  it("uses the offset in force on that date, not today's", () => {
    // New York is GMT-4 in July and GMT-5 in January.
    expect(zonedWallTimeToUtc("2026-07-15", "09:00", "America/New_York")?.toISOString()).toBe(
      "2026-07-15T13:00:00.000Z",
    );
    expect(zonedWallTimeToUtc("2026-01-15", "09:00", "America/New_York")?.toISOString()).toBe(
      "2026-01-15T14:00:00.000Z",
    );
  });

  it("handles a zone ahead of UTC", () => {
    expect(zonedWallTimeToUtc("2026-10-11", "09:00", "Asia/Bangkok")?.toISOString()).toBe(
      "2026-10-11T02:00:00.000Z",
    );
  });

  it("refuses malformed input rather than guessing an instant", () => {
    expect(zonedWallTimeToUtc("2026-10-11", "09:00", "Not/AZone")).toBeNull();
    expect(zonedWallTimeToUtc("11/10/2026", "09:00", "America/Mexico_City")).toBeNull();
    expect(zonedWallTimeToUtc("2026-10-11", "9:00", "America/Mexico_City")).toBeNull();
    expect(zonedWallTimeToUtc("2026-10-11", "09:00", "")).toBeNull();
  });
});

describe("detectTimeZone", () => {
  const resolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;

  afterEach(() => {
    Intl.DateTimeFormat.prototype.resolvedOptions = resolvedOptions;
  });

  it("reports the runtime's own zone", () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      timeZone: "America/Mexico_City",
    } as Intl.ResolvedDateTimeFormatOptions);

    expect(detectTimeZone()).toBe("America/Mexico_City");
  });

  it("returns nothing when the runtime reports a zone it cannot use", () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      timeZone: "Not/AZone",
    } as Intl.ResolvedDateTimeFormatOptions);

    expect(detectTimeZone()).toBe("");
  });
});
