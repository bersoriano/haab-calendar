import { describe, expect, it } from "vitest";

import {
  DEFAULT_PUBLIC_THEME,
  PUBLIC_THEMES,
  getPublicThemeStyle,
  isDarkPublicTheme,
  normalizePublicTheme,
} from "@/lib/public-theme";
import { normalizeProvider } from "@/lib/store";

describe("normalizePublicTheme", () => {
  it("accepts every theme, ignoring case and padding", () => {
    for (const theme of PUBLIC_THEMES) {
      expect(normalizePublicTheme(` ${theme.toUpperCase()} `)).toBe(theme);
    }
  });

  it("falls back to the default for anything else", () => {
    for (const value of ["", "neon", null, undefined]) {
      expect(normalizePublicTheme(value)).toBe(DEFAULT_PUBLIC_THEME);
    }
  });
});

describe("theme styles", () => {
  it("leaves the default page untouched", () => {
    // The whole point of "default": no token is re-pointed, so the page renders
    // exactly as it did before themes existed.
    expect(getPublicThemeStyle("default").tokens).toEqual({});
    expect(isDarkPublicTheme("default")).toBe(false);
  });

  it("gives every other theme its own palette", () => {
    const themed = PUBLIC_THEMES.filter((theme) => theme !== "default");

    for (const theme of themed) {
      const style = getPublicThemeStyle(theme);

      expect(Object.keys(style.tokens).length).toBeGreaterThan(6);
      expect(style.layers.length).toBeGreaterThan(0);
      expect(style.base).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("does not repeat a primary colour across themes", () => {
    const primaries = PUBLIC_THEMES.map(
      (theme) => getPublicThemeStyle(theme).tokens["--primary"] ?? "inherited",
    );

    expect(new Set(primaries).size).toBe(PUBLIC_THEMES.length);
  });

  it("keeps Miami dark with matching panel surfaces", () => {
    expect(isDarkPublicTheme("miami")).toBe(true);
    expect(isDarkPublicTheme("pink")).toBe(false);
    expect(isDarkPublicTheme("summer")).toBe(false);

    const miami = getPublicThemeStyle("miami").tokens;

    // A dark ground under light panels is the failure mode; these are what the
    // module's dark surfaces key off.
    expect(miami["--ink"]).toBeTruthy();
    expect(miami["--surface-lowest"]).toBeTruthy();
    expect(miami["--muted"]).toBeTruthy();
  });

  it("offers a dark counterpart to Classic with readable public surfaces", () => {
    expect(PUBLIC_THEMES).toContain("dark");
    expect(normalizePublicTheme(" DARK ")).toBe("dark");
    expect(normalizeProvider({ publicTheme: "dark" }).publicTheme).toBe("dark");
    expect(isDarkPublicTheme("dark")).toBe(true);

    const style = getPublicThemeStyle("dark");
    expect(style.base).toBe("#171a20");
    expect(style.tokens).toMatchObject({
      "--ink": "#f3f5f8",
      "--surface-lowest": "#222731",
      "--primary": "#89bdff",
      "--action-teal": "#72d9c9",
      "--callout-mint": "#19352f",
      "--summary-surface": "#29313c",
    });
  });
});

describe("the provider normalizer", () => {
  it("carries a chosen theme through", () => {
    expect(normalizeProvider({ publicTheme: "summer" }).publicTheme).toBe("summer");
  });

  it("defaults a provider that never chose one", () => {
    expect(normalizeProvider({}).publicTheme).toBe(DEFAULT_PUBLIC_THEME);
  });

  it("refuses a theme that does not exist", () => {
    expect(
      normalizeProvider({ publicTheme: "hotpink" as never }).publicTheme,
    ).toBe(DEFAULT_PUBLIC_THEME);
  });
});
