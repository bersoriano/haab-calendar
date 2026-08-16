import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

/**
 * Extraction is itself the requirement here, so a few of these read source
 * rather than behaviour. The behavioural coverage lives in the component tests
 * beside the components; these guard the boundaries that would otherwise be
 * easy to erode one convenient import at a time.
 */
describe("settings surface extraction", () => {
  const moduleSource = read("components/haab-booking-module.tsx");

  it("no longer owns the settings markup", () => {
    expect(moduleSource).not.toContain("function renderSettings(");
  });

  it("renders the extracted surface instead", () => {
    expect(moduleSource).toContain(
      'import { ProviderSettingsSurface } from "@/components/provider/ProviderSettingsSurface"',
    );
    expect(moduleSource).toContain("<ProviderSettingsSurface");
  });

  it("computes no integration status of its own", () => {
    expect(moduleSource).not.toContain("google_calendar");
    expect(moduleSource).not.toContain("hasResolvedEntitlement");
  });
});

describe("integration state boundaries", () => {
  it("keeps the integrations card away from data access", () => {
    const section = read("components/provider/ProviderIntegrationsSection.tsx");

    expect(section).not.toContain("@/lib/supabase");
    expect(section).not.toContain("fetch(");
    expect(section).not.toContain("googleapis");
    // Eligibility is read from the resolved snapshot, never from a plan string.
    expect(section).not.toContain("planTier");
    expect(section).toContain("hasResolvedEntitlement");
  });

  it("keeps the settings surface presentational", () => {
    const surface = read("components/provider/ProviderSettingsSurface.tsx");

    expect(surface).not.toContain("@/lib/supabase");
    expect(surface).not.toContain("/api/provider/store");
    expect(surface).not.toContain("fetch(");
  });

  it("keeps integration and entitlement state out of the store contract", () => {
    const types = read("lib/types.ts");
    const moduleStore = types.slice(
      types.indexOf("export type ModuleStore"),
      types.indexOf("export type ModuleStore") + 800,
    );

    for (const forbidden of [
      "accessToken",
      "refreshToken",
      "calendarId",
      "oauth",
      "entitlement",
      "integration",
    ]) {
      expect(moduleStore.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});

describe("entitlement data flow", () => {
  it("resolves entitlements on the server from the dashboard context", () => {
    const page = read("app/page.tsx");

    expect(page).toContain("getProviderDashboardContext");
    expect(page).toContain("getProviderEntitlements(");
    expect(page).toContain("dashboardContext.providerId");
    expect(page).toContain("providerEntitlements={providerEntitlements}");
    // Failure is logged and passed on as absence, not swallowed into access.
    expect(page).toContain("provider_entitlements_load_failed");
  });

  it("never reads entitlements from the session or the browser", () => {
    const page = read("app/page.tsx");

    expect(page).not.toContain("user_metadata");
    expect(page).not.toContain("searchParams.providerId");
  });

  it("passes the snapshot through the client tree without rebuilding it", () => {
    const home = read("components/home-experience.tsx");

    expect(home).toContain("providerEntitlements?: ProviderEntitlements");
    expect(home).toContain("providerEntitlements={providerEntitlements}");
    expect(home).not.toContain("resolveEntitlements(");
  });
});
