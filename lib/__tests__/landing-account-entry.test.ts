import { describe, expect, it } from "vitest";

import { resolveLandingAccountEntry } from "@/lib/landing-account-entry";

describe("resolveLandingAccountEntry", () => {
  it("offers sign-in to a visitor who is not signed in", () => {
    expect(
      resolveLandingAccountEntry({
        loggedIn: false,
        canOpenDashboard: false,
        hasLoginHref: true,
      }),
    ).toBe("login");
  });

  it("offers the workspace to a signed-in owner", () => {
    expect(
      resolveLandingAccountEntry({
        loggedIn: true,
        canOpenDashboard: true,
        hasLoginHref: true,
      }),
    ).toBe("dashboard");
  });

  it("still offers the workspace to a signed-in owner with no finished page", () => {
    // The regression this function exists for. Setup state used to gate this,
    // so an owner whose store failed to load saw no log-in link (signed in)
    // and no dashboard link (no page) — no way in at all.
    expect(
      resolveLandingAccountEntry({
        loggedIn: true,
        canOpenDashboard: true,
        hasLoginHref: true,
      }),
    ).toBe("dashboard");
  });

  it("never leaves a signed-in visitor with nothing when a way in exists", () => {
    for (const canOpenDashboard of [true]) {
      expect(
        resolveLandingAccountEntry({
          loggedIn: true,
          canOpenDashboard,
          hasLoginHref: false,
        }),
      ).not.toBe("none");
    }
  });

  it("shows nothing only when there is genuinely nowhere to send them", () => {
    expect(
      resolveLandingAccountEntry({
        loggedIn: false,
        canOpenDashboard: false,
        hasLoginHref: false,
      }),
    ).toBe("none");

    expect(
      resolveLandingAccountEntry({
        loggedIn: true,
        canOpenDashboard: false,
        hasLoginHref: true,
      }),
    ).toBe("none");
  });
});
