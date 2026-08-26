import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  blockingPrerequisites,
  ProviderFeatureOverrides,
} from "@/components/super-admin/ProviderFeatureOverrides";
import { resolveEntitlements } from "@/lib/entitlements/resolve";

const PROVIDER = "00000000-0000-4000-8000-000000000001";

function render(
  planTier: string,
  overrides: Parameters<typeof resolveEntitlements>[0]["overrides"],
) {
  return renderToStaticMarkup(
    <ProviderFeatureOverrides
      ownerEmail="owner@example.com"
      entitlements={resolveEntitlements({
        providerId: PROVIDER,
        planTier,
        overrides,
        now: new Date("2026-08-15T12:00:00.000Z"),
      })}
    />,
  );
}

describe("ProviderFeatureOverrides", () => {
  it("shows a free plan with every feature off and none overridden", () => {
    const html = render("free", []);

    expect(html).toContain("Premium access");
    expect(html).toContain("0 of 4 enabled");
    expect(html).toContain("Manage premium access");
    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
    expect(html).toContain("Custom URL slug");
    expect(html).toContain("Google Calendar sync");
    expect(html).toContain("Off");
    expect(html).not.toContain("Override");
    expect(html).toContain("Change access");
  });

  it("marks a granted feature as an override and shows its expiry", () => {
    const html = render("free", [
      {
        featureKey: "custom_slug",
        enabled: true,
        expiresAt: "2026-09-01T10:30:00.000Z",
      },
    ]);

    expect(html).toContain("Override");
    expect(html).toContain("On");
    expect(html).toContain("Expires Sep 1, 2026");
  });

  it("shows a feature the plan grants but an override withholds", () => {
    const html = render("premium", [
      { featureKey: "custom_slug", enabled: false, expiresAt: null },
    ]);

    // The plan says yes, the override says no, and the override wins.
    expect(html).toContain("Override");
    expect(html).toContain("Off");
    // A permanent override has no expiry line.
    expect(html).not.toContain("Expires");
  });

  it("does not treat an expired override as current state", () => {
    const html = render("free", [
      {
        featureKey: "custom_slug",
        enabled: true,
        expiresAt: "2026-08-01T00:00:00.000Z",
      },
    ]);

    expect(html).not.toContain("Override");
    expect(html).not.toContain("On<");
  });
});

describe("prerequisite chain", () => {
  const GRANT_TWO_WAY = [
    {
      featureKey: "google_calendar_two_way_sync",
      enabled: true,
      expiresAt: null,
    },
  ];

  it("says a granted feature is off, and names what it needs", () => {
    // The support case this exists to prevent: two-way granted, two-way off,
    // and nothing on screen connecting the two.
    const html = render("free", GRANT_TWO_WAY);

    expect(html).toContain("Blocked");
    expect(html).toContain("Granted, but off: needs");
    expect(html).toContain("Google Calendar sync");
    expect(html).toContain("Google Calendar busy blocking");
  });

  it("does not call a feature blocked when nothing is blocking it", () => {
    const html = render("free", [
      { featureKey: "custom_slug", enabled: true, expiresAt: null },
    ]);

    expect(html).not.toContain("Blocked");
    expect(html).not.toContain("Granted, but off");
  });

  it("reports no block once every prerequisite is granted too", () => {
    const html = render("free", [
      { featureKey: "google_calendar_sync", enabled: true, expiresAt: null },
      {
        featureKey: "google_calendar_busy_blocking",
        enabled: true,
        expiresAt: null,
      },
      {
        featureKey: "google_calendar_two_way_sync",
        enabled: true,
        expiresAt: null,
      },
    ]);

    expect(html).not.toContain("Blocked");
    expect(html).not.toContain("Granted, but off");
    // Three overrides, all deciding their feature.
    expect(html.match(/Override/g)?.length).toBe(3);
  });

  it("keeps withholding available on a blocked feature", () => {
    // Taking access away must never depend on a prerequisite being met.
    const html = render("free", GRANT_TWO_WAY);

    expect(html).toContain("Change access");
  });
});

describe("blockingPrerequisites", () => {
  function snapshot(
    overrides: Parameters<typeof resolveEntitlements>[0]["overrides"],
  ) {
    return resolveEntitlements({
      providerId: PROVIDER,
      planTier: "free",
      overrides,
      now: new Date("2026-08-15T12:00:00.000Z"),
    });
  }

  it("names both prerequisites two-way needs when neither is on", () => {
    expect(
      blockingPrerequisites(snapshot([]), "google_calendar_two_way_sync"),
    ).toEqual(["google_calendar_sync", "google_calendar_busy_blocking"]);
  });

  it("names only the one still missing", () => {
    const current = snapshot([
      { featureKey: "google_calendar_sync", enabled: true, expiresAt: null },
    ]);

    expect(
      blockingPrerequisites(current, "google_calendar_two_way_sync"),
    ).toEqual(["google_calendar_busy_blocking"]);
  });

  it("returns nothing once the chain is satisfied", () => {
    const current = snapshot([
      { featureKey: "google_calendar_sync", enabled: true, expiresAt: null },
      {
        featureKey: "google_calendar_busy_blocking",
        enabled: true,
        expiresAt: null,
      },
    ]);

    expect(
      blockingPrerequisites(current, "google_calendar_two_way_sync"),
    ).toEqual([]);
  });

  it("returns nothing for a feature that depends on nothing", () => {
    expect(blockingPrerequisites(snapshot([]), "custom_slug")).toEqual([]);
    expect(blockingPrerequisites(snapshot([]), "google_calendar_sync")).toEqual(
      [],
    );
  });

  it("counts a revoke as unmet, not just an absent grant", () => {
    // A withheld prerequisite blocks exactly as a missing one does.
    const current = snapshot([
      { featureKey: "google_calendar_sync", enabled: false, expiresAt: null },
    ]);

    expect(
      blockingPrerequisites(current, "google_calendar_busy_blocking"),
    ).toEqual(["google_calendar_sync"]);
  });
});
