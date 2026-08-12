import { describe, expect, it } from "vitest";

import {
  formatTimeZoneLabel,
  resolvePublicHeaderSlot,
  shouldShowProviderNameVisually,
} from "../public-header";
import { getVerticalCopy } from "../vertical-copy";

const baseSlot = {
  bookingsNoun: "Registrations",
  timesShownIn: "Times shown in",
  holdingSpotLabel: "Holding your spot…",
  timeZoneLabel: "GMT-6",
  isAdvancing: false,
};

describe("shouldShowProviderNameVisually", () => {
  it("hides the name when a logo carries the brand", () => {
    expect(shouldShowProviderNameVisually("https://blob/logo.png")).toBe(false);
  });

  it("shows the name when there is no logo", () => {
    expect(shouldShowProviderNameVisually(undefined)).toBe(true);
    expect(shouldShowProviderNameVisually("")).toBe(true);
  });

  it("treats a blank logo url as no logo", () => {
    expect(shouldShowProviderNameVisually("   ")).toBe(true);
  });
});

describe("formatTimeZoneLabel", () => {
  it("names the place, with the offset kept for visitors elsewhere", () => {
    expect(formatTimeZoneLabel("America/Mexico_City", "en")).toMatch(
      /^Mexico City, Mexico \(GMT[+-]\d/,
    );
  });

  it("says the place in the page's own language", () => {
    expect(formatTimeZoneLabel("America/Mexico_City", "es")).toMatch(
      /^Ciudad de M\u00e9xico, M\u00e9xico \(GMT[+-]\d/,
    );
  });

  it("falls back to the zone's own city when it is not curated", () => {
    expect(formatTimeZoneLabel("America/Nuuk", "en")).toMatch(/^Nuuk \(GMT[+-]\d/);
  });

  it("says nothing when the zone is missing", () => {
    expect(formatTimeZoneLabel(undefined)).toBe("");
    expect(formatTimeZoneLabel("  ")).toBe("");
  });

  it("says nothing rather than guessing when the zone is invalid", () => {
    expect(formatTimeZoneLabel("Not/AZone")).toBe("");
  });

  it("treats the schema's default UTC as unset rather than as GMT+0", () => {
    expect(formatTimeZoneLabel("UTC")).toBe("");
    expect(formatTimeZoneLabel("utc")).toBe("");
  });
});

describe("resolvePublicHeaderSlot", () => {
  it("describes the page when nothing is happening", () => {
    expect(resolvePublicHeaderSlot(baseSlot)).toEqual({
      tone: "idle",
      text: "Registrations · Times shown in GMT-6",
    });
  });

  it("drops the offset clause when the zone is unknown", () => {
    expect(
      resolvePublicHeaderSlot({ ...baseSlot, timeZoneLabel: "" }),
    ).toEqual({ tone: "idle", text: "Registrations" });
  });

  it("speaks during the transition, when it is the only thing on screen", () => {
    expect(
      resolvePublicHeaderSlot({ ...baseSlot, isAdvancing: true }),
    ).toEqual({ tone: "pending", text: "Holding your spot…" });
  });

  it("lets a failure outrank the work that failed", () => {
    expect(
      resolvePublicHeaderSlot({
        ...baseSlot,
        isAdvancing: true,
        errorMessage: "That slot was just taken.",
      }),
    ).toEqual({ tone: "error", text: "That slot was just taken." });
  });

  it("ignores a blank error", () => {
    expect(
      resolvePublicHeaderSlot({ ...baseSlot, errorMessage: "   " }).tone,
    ).toBe("idle");
  });

  it("raises an expiring hold above the idle line", () => {
    expect(
      resolvePublicHeaderSlot({ ...baseSlot, warningMessage: "1:30 left" }),
    ).toEqual({ tone: "warning", text: "1:30 left" });
  });

  it("keeps the transition above an expiring hold", () => {
    expect(
      resolvePublicHeaderSlot({
        ...baseSlot,
        isAdvancing: true,
        warningMessage: "1:30 left",
      }).tone,
    ).toBe("pending");
  });

  it("takes its noun from the vertical and the language", () => {
    const events = resolvePublicHeaderSlot({
      ...baseSlot,
      bookingsNoun: getVerticalCopy("events", "es").Bookings,
    });
    const healthcare = resolvePublicHeaderSlot({
      ...baseSlot,
      bookingsNoun: getVerticalCopy("healthcare", "en").Bookings,
    });

    expect(events.text).toContain("Registros");
    expect(healthcare.text).toContain("Appointments");
  });
});
