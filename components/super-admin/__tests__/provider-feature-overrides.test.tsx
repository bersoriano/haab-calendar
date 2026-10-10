import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  blockingPrerequisites,
  FeatureAccessSummary,
  FeatureEditor,
  ProviderFeatureOverrides,
} from "@/components/super-admin/ProviderFeatureOverrides";
import { resolveEntitlements } from "@/lib/entitlements/resolve";

const PROVIDER = "00000000-0000-4000-8000-000000000001";

function entitlements(
  planTier: string,
  overrides: Parameters<typeof resolveEntitlements>[0]["overrides"],
) {
  return resolveEntitlements({
    providerId: PROVIDER,
    planTier,
    overrides,
    now: new Date("2026-08-15T12:00:00.000Z"),
  });
}

function render(
  planTier: string,
  overrides: Parameters<typeof resolveEntitlements>[0]["overrides"],
  open = true,
) {
  return renderToStaticMarkup(
    <ProviderFeatureOverrides
      open={open}
      onClose={() => undefined}
      onChange={() => undefined}
      ownerEmail="owner@example.com"
      entitlements={entitlements(planTier, overrides)}
    />,
  );
}

describe("ProviderFeatureOverrides", () => {
  it("shows a free plan with every feature off and none overridden", () => {
    const html = render("free", []);

    expect(html).toMatch(/^<dialog/);
    expect(html).toMatch(/<h2[^>]*>Premium access<\/h2>/);
    expect(html).toContain("owner@example.com");
    expect(html).toContain("0 of 6 enabled");
    expect(html).toContain('aria-label="Close"');
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

describe("ProviderFeatureOverrides when closed", () => {
  it("renders the dialog shell without its contents", () => {
    const html = render("free", [], false);

    expect(html).toMatch(/^<dialog/);
    expect(html).not.toContain("Custom URL slug");
  });
});

describe("FeatureAccessSummary", () => {
  it("names the plan and counts the features that are on", () => {
    const html = renderToStaticMarkup(
      <FeatureAccessSummary
        entitlements={entitlements("free", [
          { featureKey: "custom_slug", enabled: true, expiresAt: null },
        ])}
      />,
    );

    expect(html).toContain("free plan");
    // Says what is counted: this sits in the accounts row, away from the dialog.
    expect(html).toContain("1 of 6 features on");
  });
});

describe("FeatureEditor", () => {
  function renderEditor(props: Partial<Parameters<typeof FeatureEditor>[0]> = {}) {
    return renderToStaticMarkup(
      <FeatureEditor
        ownerEmail="owner@example.com"
        reason=""
        expiresAt=""
        missing={[]}
        overridden={false}
        pendingAction={undefined}
        onReasonChange={() => undefined}
        onExpiresAtChange={() => undefined}
        onSubmit={() => undefined}
        onCancel={() => undefined}
        {...props}
      />,
    );
  }

  it("marks the reason field when the reason is missing", () => {
    const html = renderEditor({ error: { field: "reason", message: "A reason is required." } });

    const reasonInput = html.match(/<input[^>]*placeholder="Why owner@example.com[^>]*>/)?.[0] ?? "";
    expect(reasonInput).toContain('aria-invalid="true"');
    expect(html).toContain("A reason is required.");
    expect(html).not.toContain('role="alert"');
  });

  it("marks the expiry field when its date cannot be read", () => {
    const html = renderEditor({
      error: { field: "expiresAt", message: "Expiry must be a valid date and time." },
    });

    expect(html).toMatch(/<input[^>]*type="datetime-local"[^>]*aria-invalid="true"|<input[^>]*aria-invalid="true"[^>]*type="datetime-local"/);
  });

  it("shows any other failure inside the editor, above its actions", () => {
    const html = renderEditor({ error: { message: "Could not update the feature override." } });
    const alert = html.indexOf('role="alert"');

    expect(alert).toBeGreaterThan(-1);
    expect(alert).toBeLessThan(html.indexOf(">Grant<"));
  });

  it("keeps Grant locked while a prerequisite is missing and offers Clear only on an override", () => {
    const blocked = renderEditor({ missing: ["google_calendar_sync"] });
    const overridden = renderEditor({ overridden: true });

    expect(blocked).toMatch(/<button[^>]*disabled=""[^>]*>Grant<\/button>/);
    expect(blocked).not.toMatch(/<button[^>]*disabled=""[^>]*>Withhold<\/button>/);
    expect(blocked).toContain("Turn on Google Calendar sync first.");
    expect(blocked).not.toContain("Clear override");
    expect(overridden).toContain("Clear override");
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
