import { describe, expect, it } from "vitest";

import { draftWorkspaceSection, draftWorkspaceSections } from "@/lib/draft-workspace";
import type { AdminTab } from "@/lib/types";

const ALL: Array<{ value: AdminTab; label: string }> = [
  { value: "dashboard", label: "Dashboard" },
  { value: "bookings", label: "Appointments" },
  { value: "calendar", label: "Calendar" },
  { value: "services", label: "Services" },
  { value: "availability", label: "Availability" },
  { value: "appearance", label: "Appearance" },
  { value: "analytics", label: "Analytics" },
  { value: "integrations", label: "Integrations" },
  { value: "settings", label: "Settings" },
];

/**
 * A draft that has not been published takes no bookings, counts no visits and
 * has no account to connect anything to. Its workspace offers the sections
 * that build the page, in the order the full workspace lists them.
 */
describe("draftWorkspaceSections", () => {
  it("keeps the sections that set the page up", () => {
    expect(draftWorkspaceSections(ALL, true).map((section) => section.value)).toEqual([
      "dashboard",
      "services",
      "availability",
      "appearance",
      "settings",
    ]);
  });

  it("leaves a published workspace every section", () => {
    expect(draftWorkspaceSections(ALL, false)).toEqual(ALL);
  });
});

describe("draftWorkspaceSection", () => {
  it("opens the overview in place of a section a draft does not offer", () => {
    for (const hidden of ["bookings", "calendar", "analytics", "integrations"] as const) {
      expect(draftWorkspaceSection(hidden, true)).toBe("dashboard");
    }
  });

  it("keeps a section a draft does offer", () => {
    expect(draftWorkspaceSection("services", true)).toBe("services");
  });

  it("never moves a published workspace", () => {
    expect(draftWorkspaceSection("bookings", false)).toBe("bookings");
  });
});
