import { describe, expect, it } from "vitest";
import { resolveEntitlements } from "@/lib/entitlements/resolve";
import { normalizeProvider } from "@/lib/store";

describe("booking history retention preference and access", () => {
  it("defaults to off and accepts only a boolean opt-in", () => {
    expect(normalizeProvider().keepBookingHistoryOneYear).toBe(false);
    expect(normalizeProvider({ keepBookingHistoryOneYear: true }).keepBookingHistoryOneYear).toBe(true);
    expect(normalizeProvider({ keepBookingHistoryOneYear: "true" as never }).keepBookingHistoryOneYear).toBe(false);
  });

  it("includes extended history in Premium but not free", () => {
    for (const planTier of ["free", "premium"] as const) {
      const access = resolveEntitlements({ providerId: "p", planTier, overrides: [] });
      expect(access.features.booking_history_retention?.enabled).toBe(planTier === "premium");
    }
  });

  it("honors manual revocation and expiration", () => {
    const input = { providerId: "p", planTier: "premium", now: new Date("2026-10-09T12:00:00Z") };
    expect(resolveEntitlements({ ...input, overrides: [{ featureKey: "booking_history_retention", enabled: false, expiresAt: null }] }).features.booking_history_retention?.enabled).toBe(false);
    expect(resolveEntitlements({ ...input, overrides: [{ featureKey: "booking_history_retention", enabled: false, expiresAt: "2026-10-09T12:00:00Z" }] }).features.booking_history_retention?.enabled).toBe(true);
  });
});
