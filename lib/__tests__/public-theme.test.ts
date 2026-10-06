import { describe, expect, it } from "vitest";

import {
  DEFAULT_PUBLIC_THEME,
  PUBLIC_THEMES,
  getPublicThemeStyle,
  isDarkPublicTheme,
  normalizePublicTheme,
} from "@/lib/public-theme";
import { normalizeProvider } from "@/lib/store";

function rgb(value: string): [number, number, number, number] {
  if (value.startsWith("#")) {
    return [
      parseInt(value.slice(1, 3), 16),
      parseInt(value.slice(3, 5), 16),
      parseInt(value.slice(5, 7), 16),
      1,
    ];
  }

  const channels = value.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/);
  if (!channels) throw new Error(`Unsupported test colour: ${value}`);
  return [Number(channels[1]), Number(channels[2]), Number(channels[3]), Number(channels[4])];
}

function luminance(channels: number[]) {
  const [red, green, blue] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrastOnSurface(text: string, surface: string, base: string) {
  const [red, green, blue, alpha] = rgb(surface);
  const ground = rgb(base);
  const painted = [red, green, blue].map((channel, index) =>
    channel * alpha + ground[index] * (1 - alpha),
  );
  const light = Math.max(luminance(rgb(text)), luminance(painted));
  const dark = Math.min(luminance(rgb(text)), luminance(painted));
  return (light + 0.05) / (dark + 0.05);
}

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

  it("provides dark fills for booking panels that use light text", () => {
    for (const theme of ["dark", "miami"] as const) {
      const style = getPublicThemeStyle(theme);
      const pairs = [
        ["--ink-secondary", "--panel-tint-75"],
        ["--muted", "--panel-tint-94"],
        ["--ink", "--panel-mute-72"],
        ["--ink", "--panel-mute-88"],
        ["--muted", "--panel-glass-55"],
        ["--muted", "--panel-glass-75"],
      ];

      for (const [text, surface] of pairs) {
        expect(
          contrastOnSurface(style.tokens[text], style.tokens[surface], style.base),
          `${theme}: ${text} on ${surface}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
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
