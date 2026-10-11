import { describe, expect, it } from "vitest";

import { resolveLandingAccountEntry } from "@/lib/landing-account-entry";

describe("resolveLandingAccountEntry", () => {
  it("offers sign-in to a visitor who is not signed in", () => {
    expect(
      resolveLandingAccountEntry({
        loggedIn: false,
        hasPage: false,
        canOpenDashboard: false,
        hasLoginHref: true,
      }),
    ).toBe("login");
  });

  it("offers the workspace to a signed-in owner with a finished page", () => {
    expect(
      resolveLandingAccountEntry({
        loggedIn: true,
        hasPage: true,
        canOpenDashboard: true,
        hasLoginHref: true,
      }),
    ).toBe("dashboard");
  });

  it("offers setup, not the workspace, to a signed-in visitor with no finished page", () => {
    // The workspace sends anyone without a finished page back to the landing
    // page, so offering it here was a link that went nowhere: a new account
    // clicked "Your dashboard" and stayed exactly where it was.
    expect(
      resolveLandingAccountEntry({
        loggedIn: true,
        hasPage: false,
        canOpenDashboard: true,
        hasLoginHref: true,
      }),
    ).toBe("setup");
  });

  it("never leaves a signed-in visitor with nothing when a way in exists", () => {
    for (const hasPage of [true, false]) {
      expect(
        resolveLandingAccountEntry({
          loggedIn: true,
          hasPage,
          canOpenDashboard: true,
          hasLoginHref: false,
        }),
      ).not.toBe("none");
    }
  });

  it("shows nothing only when there is genuinely nowhere to send them", () => {
    expect(
      resolveLandingAccountEntry({
        loggedIn: false,
        hasPage: false,
        canOpenDashboard: false,
        hasLoginHref: false,
      }),
    ).toBe("none");

    // A page that reuses the landing chrome without a way into the workspace
    // (the gallery) does not know whether there is a page, so it offers neither.
    for (const hasPage of [true, false]) {
      expect(
        resolveLandingAccountEntry({
          loggedIn: true,
          hasPage,
          canOpenDashboard: false,
          hasLoginHref: true,
        }),
      ).toBe("none");
    }
  });
});
