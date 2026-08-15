export const PUBLIC_THEMES = ["default", "pink", "summer", "miami"] as const;

export type PublicTheme = (typeof PUBLIC_THEMES)[number];

export const DEFAULT_PUBLIC_THEME: PublicTheme = "default";

/**
 * A look for one provider's public page.
 *
 * Themes are expressed as overrides to the custom properties the page already
 * styles itself with, so a theme never touches component markup — it re-points
 * the same tokens. `default` deliberately carries no overrides at all: it is
 * the page exactly as it was before themes existed.
 */
export type PublicThemeStyle = {
  /** Solid colour behind the layers, and the base the page falls back to. */
  base: string;
  /**
   * Painted over the base, bottom to top. The default theme uses a photograph;
   * the rest are gradients, which stay sharp at any size and cost nothing.
   */
  layers: string[];
  /** Custom property overrides applied to the public page root. */
  tokens: Record<string, string>;
  /** Dark grounds need light panels flipped, not just recoloured. */
  dark?: boolean;
};

const PHOTO_BACKDROP: PublicThemeStyle = {
  base: "#eef2f5",
  layers: [
    "url('/bkg2.jpg') center / cover no-repeat",
    "linear-gradient(160deg,rgba(248,249,250,0.28),rgba(248,249,250,0.54) 34%,rgba(243,244,245,0.74) 100%)",
  ],
  tokens: {},
};

/**
 * Hot pink against white, with gold as the one warm note — the doll-box
 * palette. Text stays near-black on light panels: the point is a pink page,
 * not pink prose nobody can read.
 */
const PINK: PublicThemeStyle = {
  base: "#fff0f7",
  layers: [
    "radial-gradient(120% 90% at 12% 0%, rgba(236,72,153,0.28), transparent 58%)",
    "radial-gradient(100% 80% at 100% 18%, rgba(244,114,182,0.26), transparent 62%)",
    "linear-gradient(165deg, rgba(255,241,248,0.72), rgba(255,214,235,0.62) 46%, rgba(255,247,237,0.78) 100%)",
  ],
  tokens: {
    "--primary": "#be185d",
    "--primary-container": "#ec4899",
    "--accent": "#db2777",
    "--accent-strong": "#9d174d",
    "--accent-soft": "rgba(236,72,153,0.14)",
    "--action-teal": "#c026d3",
    "--action-teal-deep": "#86198f",
    "--secondary-fixed": "#fbcfe8",
    "--secondary-container": "rgba(251,207,232,0.4)",
    "--full-day": "#a21caf",
    "--teal": "#db2777",
    "--teal-soft": "rgba(219,39,119,0.12)",
    "--avail-open": "rgba(236,72,153,0.16)",
    "--avail-open-line": "rgba(190,24,93,0.34)",
    "--avail-tight": "rgba(217,119,6,0.16)",
    "--avail-tight-line": "rgba(180,83,9,0.34)",
  },
};

/**
 * Sea and sand: turquoise water, a coral accent for anything urgent, and a
 * warm sand wash at the foot of the page.
 */
const SUMMER: PublicThemeStyle = {
  base: "#e8f7fb",
  layers: [
    "radial-gradient(120% 90% at 8% 0%, rgba(6,182,212,0.3), transparent 58%)",
    "radial-gradient(110% 85% at 100% 12%, rgba(45,212,191,0.28), transparent 60%)",
    "linear-gradient(170deg, rgba(224,247,250,0.7), rgba(209,242,235,0.62) 48%, rgba(255,244,214,0.72) 100%)",
  ],
  tokens: {
    "--primary": "#0e7490",
    "--primary-container": "#0891b2",
    "--accent": "#0891b2",
    "--accent-strong": "#155e75",
    "--accent-soft": "rgba(8,145,178,0.14)",
    "--action-teal": "#0d9488",
    "--action-teal-deep": "#115e59",
    "--secondary-fixed": "#99f6e4",
    "--secondary-container": "rgba(153,246,228,0.34)",
    "--full-day": "#0369a1",
    "--teal": "#0d9488",
    "--teal-soft": "rgba(13,148,136,0.12)",
    "--avail-open": "rgba(13,148,136,0.16)",
    "--avail-open-line": "rgba(15,118,110,0.34)",
    "--avail-tight": "rgba(234,88,12,0.16)",
    "--avail-tight-line": "rgba(194,65,12,0.36)",
  },
};

/**
 * Night beach: deep indigo ground, neon pink and cyan on top. The only dark
 * theme, so it also flips the page's panel surfaces — neon on white would be
 * a different look entirely, and a worse one.
 */
const MIAMI: PublicThemeStyle = {
  base: "#080b16",
  dark: true,
  layers: [
    "radial-gradient(120% 95% at 10% 0%, rgba(236,72,153,0.34), transparent 55%)",
    "radial-gradient(110% 85% at 96% 10%, rgba(34,211,238,0.28), transparent 58%)",
    "linear-gradient(175deg, rgba(8,11,22,0.35), rgba(8,11,22,0.78) 52%, rgba(4,6,14,0.94) 100%)",
  ],
  tokens: {
    "--background": "#080b16",
    "--foreground": "#e8ecfb",
    "--ink": "#e8ecfb",
    "--muted": "#9aa6c9",
    "--line": "#2b3557",
    "--surface": "rgba(19,26,44,0.86)",
    "--surface-soft": "#141b2e",
    "--surface-lowest": "#131a2c",
    "--surface-highest": "#1b2440",
    "--primary": "#ff2d95",
    "--on-primary": "#0b0f1a",
    "--danger-strong": "#ff7a94",
    "--danger-soft": "rgba(190,18,60,0.18)",
    "--danger-line": "rgba(255,122,148,0.45)",
    "--warning-strong": "#fbbf24",
    "--warning-soft": "rgba(251,191,36,0.16)",
    "--warning-line": "rgba(251,191,36,0.42)",
    "--primary-container": "#ff5cae",
    "--accent": "#22d3ee",
    "--accent-strong": "#67e8f9",
    "--accent-soft": "rgba(34,211,238,0.16)",
    "--action-teal": "#2dd4bf",
    "--action-teal-deep": "#5eead4",
    "--secondary-fixed": "#a855f7",
    "--secondary-container": "rgba(168,85,247,0.24)",
    "--full-day": "#818cf8",
    "--teal": "#22d3ee",
    "--teal-soft": "rgba(34,211,238,0.14)",
    "--avail-open": "rgba(45,212,191,0.2)",
    "--avail-open-line": "rgba(45,212,191,0.42)",
    "--avail-tight": "rgba(251,191,36,0.2)",
    "--avail-tight-line": "rgba(251,191,36,0.44)",
    "--shadow-air": "rgba(0,0,0,0.5)",
    // Every public surface, flipped. Without these a dark ground sits under
    // white panels and the light text on them disappears.
    "--panel-mute-14": "rgba(168,85,247,0.16)",
    "--panel-mute-45": "rgba(148,163,214,0.28)",
    "--panel-mute-9": "rgba(17,23,40,0.9)",
    "--panel-mute-94": "rgba(17,23,40,0.94)",
    "--panel-mute-96": "rgba(17,23,40,0.96)",
    "--panel-tint-72": "rgba(19,26,44,0.72)",
    "--panel-tint-78": "rgba(19,26,44,0.78)",
    "--panel-tint-9": "rgba(19,26,44,0.9)",
    "--panel-tint-92": "rgba(19,26,44,0.92)",
    "--panel-tint-94": "rgba(19,26,44,0.94)",
    "--panel-tint-98": "rgba(19,26,44,0.98)",
    "--panel-glass-44": "rgba(30,40,68,0.5)",
    "--panel-glass-46": "rgba(30,40,68,0.52)",
    "--panel-glass-5": "rgba(30,40,68,0.56)",
    "--panel-glass-55": "rgba(30,40,68,0.6)",
    "--panel-glass-58": "rgba(30,40,68,0.64)",
    "--panel-glass-62": "rgba(28,37,62,0.7)",
    "--panel-glass-72": "rgba(26,35,58,0.78)",
    "--panel-glass-78": "rgba(24,32,54,0.84)",
    "--panel-glass-88": "rgba(22,30,50,0.9)",
    "--panel-glass-9": "rgba(22,30,50,0.92)",
    "--panel-glass-92": "rgba(21,28,48,0.94)",
    "--panel-glass-98": "rgba(19,26,44,0.98)",
  },
};

const THEME_STYLES: Record<PublicTheme, PublicThemeStyle> = {
  default: PHOTO_BACKDROP,
  pink: PINK,
  summer: SUMMER,
  miami: MIAMI,
};

export function getPublicThemeStyle(theme?: PublicTheme | null): PublicThemeStyle {
  return THEME_STYLES[normalizePublicTheme(theme)];
}

export function normalizePublicTheme(value?: string | null): PublicTheme {
  const candidate = value?.trim().toLowerCase();

  return (PUBLIC_THEMES as readonly string[]).includes(candidate ?? "")
    ? (candidate as PublicTheme)
    : DEFAULT_PUBLIC_THEME;
}

/** True when the page's own surfaces need to be dark, not just its ground. */
export function isDarkPublicTheme(theme?: PublicTheme | null) {
  return Boolean(getPublicThemeStyle(theme).dark);
}
