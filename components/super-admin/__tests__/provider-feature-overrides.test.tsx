import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProviderFeatureOverrides } from "@/components/super-admin/ProviderFeatureOverrides";
import { resolveEntitlements } from "@/lib/entitlements/resolve";

const PROVIDER = "00000000-0000-4000-8000-000000000001";

function render(planTier: string, overrides: Parameters<typeof resolveEntitlements>[0]["overrides"]) {
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

    expect(html).toContain("Plan: free");
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
