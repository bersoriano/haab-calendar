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
];

const RAW_PALETTE =
  /\b(?:bg|text|border|ring|outline|divide|fill|stroke|from|via|to|shadow|accent|placeholder|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
const RAW_BLACK_WHITE = /\b(?:bg|text|border|ring)-(?:white|black)\b/;
const HEX = /#[0-9a-f]{3,8}\b/i;
const LEGACY_VAR = /var\(--(?!color-app-|font-)/;

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
