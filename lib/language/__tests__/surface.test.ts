import { describe, expect, it } from "vitest";

import { resolveSurfaceLanguage } from "@/lib/language/surface";

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
