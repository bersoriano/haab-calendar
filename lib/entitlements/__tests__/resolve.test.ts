import { describe, expect, it } from "vitest";

import { FEATURE_KEYS } from "@/lib/entitlements/catalog";
import {
  hasResolvedEntitlement,
  resolveEntitlements,
  UnknownFeatureKeyError,
} from "@/lib/entitlements/resolve";

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-08-15T12:00:00.000Z");

const resolve = (input: Parameters<typeof resolveEntitlements>[0]) =>
  resolveEntitlements({ now: NOW, ...input });

describe("plan-derived entitlements", () => {
  it("gives a free provider neither feature", () => {
    const snapshot = resolve({ providerId: PROVIDER, planTier: "free", overrides: [] });

    expect(snapshot.features.custom_slug).toEqual({ enabled: false, source: "plan" });
    expect(snapshot.features.google_calendar_sync).toEqual({ enabled: false, source: "plan" });
  });

  it("gives a premium provider both features", () => {
    const snapshot = resolve({ providerId: PROVIDER, planTier: "premium", overrides: [] });

    expect(snapshot.features.custom_slug.enabled).toBe(true);
    expect(snapshot.features.google_calendar_sync.enabled).toBe(true);
    expect(snapshot.features.custom_slug.source).toBe("plan");
  });

  it("answers for every declared feature key", () => {
    const snapshot = resolve({ providerId: PROVIDER, planTier: "free", overrides: [] });

    expect(Object.keys(snapshot.features).sort()).toEqual([...FEATURE_KEYS].sort());
  });

  it("fails closed on a plan it does not recognise", () => {
    const snapshot = resolve({
      providerId: PROVIDER,
      planTier: "enterprise" as never,
      overrides: [],
    });

    expect(snapshot.planTier).toBe("free");
    expect(snapshot.features.custom_slug.enabled).toBe(false);
    expect(snapshot.features.google_calendar_sync.enabled).toBe(false);
  });
});

describe("manual overrides", () => {
  it("grants a feature the plan does not include", () => {
    const snapshot = resolve({
      providerId: PROVIDER,
      planTier: "free",
      overrides: [{ featureKey: "google_calendar_sync", enabled: true, expiresAt: null }],
    });

    expect(snapshot.features.google_calendar_sync).toEqual({
      enabled: true,
      source: "override",
    });
  });

  it("revokes a feature the plan includes", () => {
    const snapshot = resolve({
      providerId: PROVIDER,
      planTier: "premium",
      overrides: [{ featureKey: "custom_slug", enabled: false, expiresAt: null }],
    });

    expect(snapshot.features.custom_slug).toEqual({ enabled: false, source: "override" });
  });

  it("keeps a permanent override active", () => {
    const snapshot = resolve({
      providerId: PROVIDER,
      planTier: "free",
      overrides: [{ featureKey: "custom_slug", enabled: true, expiresAt: null }],
    });

    expect(snapshot.features.custom_slug.enabled).toBe(true);
    expect(snapshot.features.custom_slug.overrideExpiresAt).toBeUndefined();
  });

  it("keeps an override with a future expiry active, and reports the expiry", () => {
    const expiresAt = "2026-08-15T12:00:01.000Z";
    const snapshot = resolve({
      providerId: PROVIDER,
      planTier: "free",
      overrides: [{ featureKey: "custom_slug", enabled: true, expiresAt }],
    });

    expect(snapshot.features.custom_slug).toEqual({
      enabled: true,
      source: "override",
      overrideExpiresAt: expiresAt,
    });
  });

  it("treats the exact expiry instant as expired", () => {
    const snapshot = resolve({
      providerId: PROVIDER,
      planTier: "free",
      overrides: [
        { featureKey: "custom_slug", enabled: true, expiresAt: NOW.toISOString() },
      ],
    });

    expect(snapshot.features.custom_slug).toEqual({ enabled: false, source: "plan" });
  });

  it("ignores an override that has already expired", () => {
    const snapshot = resolve({
      providerId: PROVIDER,
      planTier: "premium",
      overrides: [
        {
          featureKey: "custom_slug",
          enabled: false,
          expiresAt: "2026-08-14T12:00:00.000Z",
        },
      ],
    });

    // The revoke lapsed, so the plan speaks again.
    expect(snapshot.features.custom_slug).toEqual({ enabled: true, source: "plan" });
  });

  it("returns plan behaviour once the override is cleared", () => {
    const withOverride = resolve({
      providerId: PROVIDER,
      planTier: "premium",
      overrides: [{ featureKey: "custom_slug", enabled: false, expiresAt: null }],
    });
    const cleared = resolve({ providerId: PROVIDER, planTier: "premium", overrides: [] });

    expect(withOverride.features.custom_slug.enabled).toBe(false);
    expect(cleared.features.custom_slug).toEqual({ enabled: true, source: "plan" });
  });

  it("ignores a persisted key that is not in the catalog", () => {
    const snapshot = resolve({
      providerId: PROVIDER,
      planTier: "free",
      overrides: [
        { featureKey: "retired_feature", enabled: true, expiresAt: null },
        { featureKey: "custom_slug", enabled: true, expiresAt: null },
      ],
    });

    expect(snapshot.features).not.toHaveProperty("retired_feature");
    expect(snapshot.features.custom_slug.enabled).toBe(true);
  });
});

describe("hasResolvedEntitlement", () => {
  it("reads a feature out of a snapshot", () => {
    const snapshot = resolve({ providerId: PROVIDER, planTier: "premium", overrides: [] });

    expect(hasResolvedEntitlement(snapshot, "custom_slug")).toBe(true);
  });

  it("rejects a feature key that does not exist", () => {
    const snapshot = resolve({ providerId: PROVIDER, planTier: "premium", overrides: [] });

    expect(() => hasResolvedEntitlement(snapshot, "nope" as never)).toThrow(
      UnknownFeatureKeyError,
    );
  });
});

describe("capability prerequisites", () => {
  const PROVIDER = "00000000-0000-4000-8000-000000000001";

  function resolve(overrides: Parameters<typeof resolveEntitlements>[0]["overrides"]) {
    return resolveEntitlements({
      providerId: PROVIDER,
      planTier: "free",
      overrides,
      now: new Date("2026-08-18T12:00:00.000Z"),
    });
  }

  it("refuses busy blocking granted without the base connection", () => {
    // Busy blocking reads a calendar the provider has not connected. A grant on
    // its own is a misconfiguration, and resolving it to "yes" would enable a
    // feature with nothing underneath it.
    const snapshot = resolve([
      { featureKey: "google_calendar_busy_blocking", enabled: true, expiresAt: null },
    ]);

    expect(snapshot.features.google_calendar_busy_blocking.enabled).toBe(false);
    expect(snapshot.features.google_calendar_busy_blocking.unmetPrerequisites).toEqual([
      "google_calendar_sync",
    ]);
  });

  it("allows busy blocking once the base connection is granted too", () => {
    const snapshot = resolve([
      { featureKey: "google_calendar_sync", enabled: true, expiresAt: null },
      { featureKey: "google_calendar_busy_blocking", enabled: true, expiresAt: null },
    ]);

    expect(snapshot.features.google_calendar_busy_blocking.enabled).toBe(true);
    expect(
      snapshot.features.google_calendar_busy_blocking.unmetPrerequisites,
    ).toBeUndefined();
  });

  it("refuses two-way sync without busy blocking", () => {
    const snapshot = resolve([
      { featureKey: "google_calendar_sync", enabled: true, expiresAt: null },
      { featureKey: "google_calendar_two_way_sync", enabled: true, expiresAt: null },
    ]);

    expect(snapshot.features.google_calendar_two_way_sync.enabled).toBe(false);
    expect(snapshot.features.google_calendar_two_way_sync.unmetPrerequisites).toEqual([
      "google_calendar_busy_blocking",
    ]);
  });

  it("allows two-way sync only with the whole chain granted", () => {
    const snapshot = resolve([
      { featureKey: "google_calendar_sync", enabled: true, expiresAt: null },
      { featureKey: "google_calendar_busy_blocking", enabled: true, expiresAt: null },
      { featureKey: "google_calendar_two_way_sync", enabled: true, expiresAt: null },
    ]);

    expect(snapshot.features.google_calendar_two_way_sync.enabled).toBe(true);
  });

  it("collapses the whole chain when the base is revoked", () => {
    // Revoking the connection must take everything built on it, in one pass.
    const snapshot = resolve([
      { featureKey: "google_calendar_sync", enabled: false, expiresAt: null },
      { featureKey: "google_calendar_busy_blocking", enabled: true, expiresAt: null },
      { featureKey: "google_calendar_two_way_sync", enabled: true, expiresAt: null },
    ]);

    expect(snapshot.features.google_calendar_busy_blocking.enabled).toBe(false);
    expect(snapshot.features.google_calendar_two_way_sync.enabled).toBe(false);
  });

  it("keeps naming the grant's source, so an overruled override is visible", () => {
    const snapshot = resolve([
      { featureKey: "google_calendar_busy_blocking", enabled: true, expiresAt: null },
    ]);

    // An operator reading this can see an override existed and was overruled,
    // rather than wondering why a granted feature reads as off.
    expect(snapshot.features.google_calendar_busy_blocking.source).toBe("override");
  });

  it("leaves the new capabilities off for a premium plan", () => {
    // Deliberate: they read a provider's wider calendar, and pricing intent for
    // them is not settled. Only a manual override turns them on today.
    const snapshot = resolveEntitlements({
      providerId: PROVIDER,
      planTier: "premium",
      overrides: [],
    });

    expect(snapshot.features.google_calendar_sync.enabled).toBe(true);
    expect(snapshot.features.google_calendar_busy_blocking.enabled).toBe(false);
    expect(snapshot.features.google_calendar_two_way_sync.enabled).toBe(false);
  });
});
