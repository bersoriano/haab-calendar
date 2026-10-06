export const PUBLIC_THEMES = ["default", "dark", "pink", "summer", "miami"] as const;

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

/** Classic's blue and teal on charcoal, with the same photograph after dark. */
const DARK: PublicThemeStyle = {
  base: "#171a20",
  dark: true,
  layers: [
    "url('/bkg2.jpg') center / cover no-repeat",
    "linear-gradient(160deg,rgba(17,20,27,0.82),rgba(20,25,33,0.88) 44%,rgba(13,17,24,0.94) 100%)",
  ],
  tokens: {
    "--background": "#171a20",
    "--foreground": "#f3f5f8",
    "--ink": "#f3f5f8",
    "--muted": "#b2bdcb",
    "--line": "#536070",
    "--outline-ghost": "rgba(154,170,190,0.2)",
    "--surface": "rgba(34,39,49,0.9)",
    "--surface-soft": "#29313c",
    "--surface-lowest": "#222731",
    "--surface-highest": "#343e4b",
    "--primary": "#89bdff",
    "--on-primary": "#102239",
    "--primary-container": "#5fa6f4",
    "--accent": "#5fa6f4",
    "--accent-strong": "#b9d8ff",
    "--accent-soft": "rgba(137,189,255,0.18)",
    "--action-teal": "#72d9c9",
    "--action-teal-deep": "#9be9dc",
    "--secondary-fixed": "#72d9c9",
    "--secondary-container": "rgba(114,217,201,0.2)",
    "--full-day": "#91c8f1",
    "--teal": "#72d9c9",
    "--teal-soft": "rgba(114,217,201,0.16)",
    "--danger-strong": "#ff9ba8",
    "--danger-soft": "#45232e",
    "--danger-line": "#a8586b",
    "--warning-strong": "#f4ca82",
    "--warning-soft": "#443626",
    "--warning-line": "#9e7944",
    "--avail-open": "rgba(114,217,201,0.2)",
    "--avail-open-line": "rgba(114,217,201,0.5)",
    "--avail-tight": "rgba(244,202,130,0.2)",
    "--avail-tight-line": "rgba(244,202,130,0.48)",
    "--shadow-air": "rgba(0,0,0,0.42)",
    "--panel-mute-14": "rgba(114,217,201,0.16)",
    "--panel-mute-45": "rgba(154,170,190,0.34)",
    "--panel-mute-9": "rgba(34,39,49,0.9)",
    "--panel-mute-94": "rgba(34,39,49,0.94)",
    "--panel-mute-96": "rgba(34,39,49,0.96)",
    "--panel-tint-72": "rgba(34,39,49,0.72)",
    "--panel-tint-78": "rgba(34,39,49,0.78)",
    "--panel-tint-9": "rgba(34,39,49,0.9)",
    "--panel-tint-92": "rgba(34,39,49,0.92)",
    "--panel-tint-94": "rgba(34,39,49,0.94)",
    "--panel-tint-98": "rgba(34,39,49,0.98)",
    "--panel-glass-44": "rgba(47,55,68,0.52)",
    "--panel-glass-46": "rgba(47,55,68,0.54)",
    "--panel-glass-5": "rgba(47,55,68,0.58)",
    "--panel-glass-55": "rgba(47,55,68,0.62)",
    "--panel-glass-58": "rgba(47,55,68,0.65)",
    "--panel-glass-62": "rgba(47,55,68,0.68)",
    "--panel-glass-72": "rgba(43,50,62,0.76)",
    "--panel-glass-78": "rgba(43,50,62,0.82)",
    "--panel-glass-88": "rgba(39,46,57,0.9)",
    "--panel-glass-9": "rgba(39,46,57,0.92)",
    "--panel-glass-92": "rgba(39,46,57,0.94)",
    "--panel-glass-98": "rgba(34,39,49,0.98)",
    "--callout-mint": "#19352f",
    "--callout-mint-line": "#376d61",
    "--callout-mint-ink": "#d2f3e8",
    "--tile-blue": "#233b59",
    "--tile-teal": "#1d443e",
    "--chip-duration-bg": "#21443e",
    "--summary-surface": "#29313c",
    "--ink-secondary": "#d4dce6",
    "--link": "#a6d0ff",
    "--form-border": "#627184",
    "--field-placeholder": "#9aa9ba",
    "--neutral-chip": "#343e4b",
    "--tile-teal-ink": "#9be9dc",
    "--success-detail-ink": "#d2f3e8",
    "--receipt-footer": "#29313c",
    "--success-strong": "#8de0ae",
    "--success-soft": "#173b2f",
    "--success-line": "#347a57",
  },
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
 * Night beach: deep indigo ground lit from three corners — pink, cyan, violet.
 * A dark theme, so it also flips the page's panel surfaces; neon on
 * white would be a different look entirely, and a worse one.
 *
 * Order matters. The vignette is painted first and the colour on top of it,
 * because a dark wash laid over the gradients flattens exactly what makes this
 * theme worth having.
 */
const MIAMI: PublicThemeStyle = {
  base: "#080b16",
  dark: true,
  layers: [
    "linear-gradient(175deg, rgba(8,11,22,0.2), rgba(6,9,18,0.72) 60%, rgba(4,6,14,0.92) 100%)",
    "radial-gradient(120% 95% at 8% -8%, rgba(255,45,149,0.55), transparent 56%)",
    "radial-gradient(110% 88% at 98% 4%, rgba(34,211,238,0.45), transparent 58%)",
    // The third corner. Violet is the theme's own secondary, so the page is lit
    // by its palette rather than by a colour that appears nowhere else.
    "radial-gradient(105% 85% at -6% 104%, rgba(168,85,247,0.42), transparent 60%)",
    "radial-gradient(80% 60% at 60% 118%, rgba(34,211,238,0.16), transparent 62%)",
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
    "--callout-mint": "#163c3d",
    "--callout-mint-line": "#2e7374",
    "--callout-mint-ink": "#d0f7f0",
    "--tile-blue": "#183c54",
    "--tile-teal": "#18484a",
    "--chip-duration-bg": "#214a4b",
    "--summary-surface": "#1b2440",
    "--ink-secondary": "#cad3ea",
    "--link": "#67e8f9",
    "--form-border": "#536180",
    "--field-placeholder": "#9aa6c9",
    "--neutral-chip": "#25304b",
    "--tile-teal-ink": "#5eead4",
    "--success-detail-ink": "#d0f7f0",
    "--receipt-footer": "#1b2440",
    "--success-strong": "#8de0ae",
    "--success-soft": "#173b2f",
    "--success-line": "#347a57",
  },
};

const THEME_STYLES: Record<PublicTheme, PublicThemeStyle> = {
  default: PHOTO_BACKDROP,
  dark: DARK,
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
