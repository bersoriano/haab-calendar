import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");

const REQUIRED_TOKENS = [
  "canvas", "surface", "subtle", "border", "border-strong",
  "fg", "fg-secondary", "fg-muted", "placeholder",
  "accent", "accent-hover", "accent-soft", "accent-soft-hover", "accent-on-soft", "accent-ring", "on-accent",
  "success-soft", "success-fg", "success-ring",
  "warning-soft", "warning-fg", "warning-ring",
  "danger-soft", "danger-fg", "danger-ring", "danger", "danger-hover",
  "info-soft", "info-fg", "info-ring",
  "admin-soft", "admin-fg", "admin-ring",
  "neutral-soft", "neutral-fg", "neutral-ring",
  "full-day", "chart-1", "chart-2", "overlay",
];

/**
 * Files already migrated to the app-ui kit. Each later PR appends the files
 * it migrates; the last one replaces the list with whole directories.
 */
const MIGRATED = [
  "components/app-ui",
  "components/app-shell/AppShell.tsx",
  "components/app-shell/SidebarNav.tsx",
  "components/app-shell/ShellFooter.tsx",
  "components/app-shell/ShellIcon.tsx",
  "components/app-shell/ShellSidebarParts.tsx",
  "components/provider/DashboardApp.tsx",
  "components/provider/SaveBar.tsx",
  "components/provider/CampaignBadge.tsx",
  "components/provider/DashboardOverview.tsx",
  "components/provider/BookingsList.tsx",
  "components/provider/AdminCalendar.tsx",
  "components/provider/ProviderAnalyticsSurface.tsx",
  "components/provider/CancelBookingDialog.tsx",
  "components/provider/RescheduleBookingDialog.tsx",
  "components/provider/ToastOnChange.tsx",
  "components/provider/AppointmentScannerDialog.tsx",
  "components/provider/ProviderInfoForm.tsx",
  "components/provider/TimeZoneField.tsx",
  "components/provider/ServiceEditor.tsx",
  "components/super-admin/SuperAdminShell.tsx",
];

const RAW_PALETTE =
  /\b(?:bg|text|border|ring|outline|divide|fill|stroke|from|via|to|shadow|accent|placeholder|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
const RAW_BLACK_WHITE = /\b(?:bg|text|border|ring)-(?:white|black)\b/;
const HEX = /#[0-9a-f]{3,8}\b/i;
// App-owned custom properties (--color-app-*, --app-*) and fonts are fine.
const LEGACY_VAR = /var\(--(?!color-app-|font-|app-)/;

function files(path: string): string[] {
  const full = join(root, path);
  if (statSync(full).isFile()) return [full];
  return readdirSync(full)
    .filter((name) => name !== "__tests__")
    .flatMap((name) => files(join(path, name)))
    .filter((file) => /\.(ts|tsx)$/.test(file));
}

describe("app tokens", () => {
  const css = readFileSync(join(root, "app/globals.css"), "utf8");

  it("defines every app color token in the theme", () => {
    const missing = REQUIRED_TOKENS.filter(
      (token) => !new RegExp(`--color-app-${token}:`).test(css),
    );
    expect(missing).toEqual([]);
  });

  it("hands app controls back to the utilities after the global font reset", () => {
    expect(css).toMatch(/\[data-app-control\]\s*\{\s*font:\s*revert-layer;\s*\}/);
  });

  it("keeps migrated files on app tokens only", () => {
    const offenders = MIGRATED.flatMap(files)
      .map((file) => ({ file: relative(root, file), text: readFileSync(file, "utf8") }))
      .filter(
        ({ text }) =>
          RAW_PALETTE.test(text) ||
          RAW_BLACK_WHITE.test(text) ||
          HEX.test(text) ||
          text.includes("rgba(") ||
          LEGACY_VAR.test(text),
      )
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });
});

function token(css: string, name: string) {
  const value = css.match(new RegExp(`--color-app-${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
  if (!value) throw new Error(`no hex value for --color-app-${name}`);
  return value;
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("app token contrast", () => {
  const css = readFileSync(join(root, "app/globals.css"), "utf8");

  // Text/background pairs the kit actually paints, every state included.
  const PAIRS: [string, string][] = [
    ["on-accent", "accent"],
    ["on-accent", "accent-hover"],
    ["on-accent", "danger"],
    ["on-accent", "danger-hover"],
    ["accent-on-soft", "accent-soft"],
    ["accent-on-soft", "accent-soft-hover"],
    ["fg", "surface"],
    ["fg-secondary", "subtle"],
    ["fg-muted", "surface"],
    ["fg-muted", "canvas"],
    ["success-fg", "success-soft"],
    ["warning-fg", "warning-soft"],
    ["danger-fg", "danger-soft"],
    ["info-fg", "info-soft"],
    ["admin-fg", "admin-soft"],
    ["neutral-fg", "neutral-soft"],
  ];

  it.each(PAIRS)("%s on %s meets WCAG AA (4.5:1)", (fg, bg) => {
    expect(contrast(token(css, fg), token(css, bg))).toBeGreaterThanOrEqual(4.5);
  });
});

