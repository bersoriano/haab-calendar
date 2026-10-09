import { describe, expect, it } from "vitest";
import {
  DASHBOARD_SECTIONS,
  isAdminTab,
  parseCheckoutResult,
  parseGoogleOutcome,
  pathForSection,
  resolveHomeRedirect,
  sectionFromPathname,
  sectionFromSegments,
} from "@/lib/dashboard-routes";

describe("dashboard sections", () => {
  it("maps every section to a unique path and back", () => {
    const paths = DASHBOARD_SECTIONS.map((section) => pathForSection(section.id));
    expect(new Set(paths).size).toBe(paths.length);
    for (const section of DASHBOARD_SECTIONS) {
      expect(sectionFromPathname(pathForSection(section.id))).toBe(section.id);
    }
  });

  it("serves the overview at the bare dashboard path", () => {
    expect(pathForSection("dashboard")).toBe("/dashboard");
    expect(sectionFromSegments(undefined)).toBe("dashboard");
    expect(sectionFromSegments([])).toBe("dashboard");
  });

  it("appends only the query values that are set", () => {
    expect(pathForSection("analytics", { checkout: "success" })).toBe(
      "/dashboard/analytics?checkout=success",
    );
    expect(pathForSection("analytics", { checkout: undefined })).toBe("/dashboard/analytics");
  });

  it("rejects unknown, nested, duplicated and miscased segments", () => {
    expect(sectionFromSegments(["dashboard"])).toBeNull();
    expect(sectionFromSegments(["bookings", "extra"])).toBeNull();
    expect(sectionFromSegments(["BOOKINGS"])).toBeNull();
    expect(sectionFromSegments(["nope"])).toBeNull();
  });

  it("reads sections from pathnames, ignoring a trailing slash", () => {
    expect(sectionFromPathname("/dashboard/")).toBe("dashboard");
    expect(sectionFromPathname("/dashboard/calendar/")).toBe("calendar");
    expect(sectionFromPathname("/dashboardx")).toBeNull();
    expect(sectionFromPathname("/")).toBeNull();
  });

  it("recognises admin tabs", () => {
    expect(isAdminTab("integrations")).toBe(true);
    expect(isAdminTab("billing")).toBe(false);
    expect(isAdminTab(undefined)).toBe(false);
  });
});

describe("resolveHomeRedirect", () => {
  it("leaves guests and providers without a page on the landing page", () => {
    expect(
      resolveHomeRedirect({ loggedIn: false, configured: false, demoEditing: false }),
    ).toBeNull();
    expect(
      resolveHomeRedirect({ loggedIn: true, configured: false, demoEditing: false }),
    ).toBeNull();
  });

  it("sends a configured provider to the dashboard", () => {
    expect(resolveHomeRedirect({ loggedIn: true, configured: true, demoEditing: false })).toBe(
      "/dashboard",
    );
  });

  it("sends a demo-editing super admin to the dashboard", () => {
    expect(resolveHomeRedirect({ loggedIn: true, configured: false, demoEditing: true })).toBe(
      "/dashboard",
    );
  });

  it("keeps legacy tab and checkout links working", () => {
    expect(
      resolveHomeRedirect({
        loggedIn: true,
        configured: true,
        demoEditing: false,
        tab: "analytics",
        checkout: "success",
      }),
    ).toBe("/dashboard/analytics?checkout=success");
  });

  it("drops unknown tabs and checkout values", () => {
    expect(
      resolveHomeRedirect({
        loggedIn: true,
        configured: true,
        demoEditing: false,
        tab: "billing",
        checkout: "maybe",
      }),
    ).toBe("/dashboard");
  });
});

describe("query parsing", () => {
  it("accepts only known checkout results", () => {
    expect(parseCheckoutResult("success")).toBe("success");
    expect(parseCheckoutResult("cancelled")).toBe("cancelled");
    expect(parseCheckoutResult("other")).toBeUndefined();
  });

  it("accepts only known Google outcomes", () => {
    expect(parseGoogleOutcome("connected")).toBe("connected");
    expect(parseGoogleOutcome("missing_scopes")).toBe("missing_scopes");
    expect(parseGoogleOutcome("<script>")).toBeUndefined();
    expect(parseGoogleOutcome(undefined)).toBeUndefined();
  });
});
