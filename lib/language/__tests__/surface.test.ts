import { describe, expect, it } from "vitest";

import {
  resolveGuestChromeLanguage,
  resolveSurfaceLanguage,
} from "@/lib/language/surface";

describe("resolveSurfaceLanguage", () => {
  it("uses the public language on the public surface, ignoring both dashboard inputs", () => {
    expect(
      resolveSurfaceLanguage({
        surface: "public",
        publicLanguage: "es",
        providerDashboardLanguage: "en",
        viewerLanguage: "en",
      }),
    ).toBe("es");
  });

  it("uses the pinned dashboard language on the admin surface, ignoring the viewer language", () => {
    expect(
      resolveSurfaceLanguage({
        surface: "management",
        publicLanguage: "es",
        providerDashboardLanguage: "es",
        viewerLanguage: "en",
      }),
    ).toBe("es");
  });

  it("falls back to the viewer language on the admin surface when nothing is pinned, never the client-facing setting", () => {
    // Regression guard: this must resolve from `viewerLanguage`, not from any
    // client-facing setting. A revert to the old `configuredLanguage` coupling
    // would make this assert the wrong thing and fail.
    expect(
      resolveSurfaceLanguage({
        surface: "management",
        publicLanguage: "es",
        providerDashboardLanguage: undefined,
        viewerLanguage: "en",
      }),
    ).toBe("en");
  });

  it("keeps the public and dashboard languages independent of each other", () => {
    // The owner writes Spanish content for clients but works in English.
    const inputs = {
      publicLanguage: "es" as const,
      providerDashboardLanguage: "en" as const,
      viewerLanguage: "en" as const,
    };

    expect(resolveSurfaceLanguage({ surface: "public", ...inputs })).toBe("es");
    expect(resolveSurfaceLanguage({ surface: "management", ...inputs })).toBe(
      "en",
    );
  });
});

describe("resolveGuestChromeLanguage", () => {
  it("keeps a signed-out guest's chrome and module in one language after a reload", () => {
    // The bug: the guest pins Spanish, reloads, and the server — which cannot
    // read their browser-owned draft — resolves English from Accept-Language.
    // The chrome started there while the module read the draft and rendered
    // Spanish. Both halves now resolve from the same pin, so they agree.
    const draftDashboardLanguage = "es" as const;
    const viewerLanguage = "en" as const;

    const chrome = resolveGuestChromeLanguage({
      loggedIn: false,
      draftDashboardLanguage,
      viewerLanguage,
    });
    const moduleLanguage = resolveSurfaceLanguage({
      surface: "management",
      publicLanguage: "en",
      providerDashboardLanguage: draftDashboardLanguage,
      viewerLanguage,
    });

    expect(chrome).toBe("es");
    expect(chrome).toBe(moduleLanguage);
  });

  it("leaves the guest on the resolved viewer language when the draft pins nothing", () => {
    expect(
      resolveGuestChromeLanguage({
        loggedIn: false,
        draftDashboardLanguage: undefined,
        viewerLanguage: "es",
      }),
    ).toBe("es");
  });

  it("ignores a browser draft once someone is signed in", () => {
    // A signed-in owner's pin comes from the database and is already applied on
    // the server render. A stale draft left in this browser by an earlier guest
    // session must not override it.
    expect(
      resolveGuestChromeLanguage({
        loggedIn: true,
        draftDashboardLanguage: "es",
        viewerLanguage: "en",
      }),
    ).toBe("en");
  });
});
