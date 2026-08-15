import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

// Each option renders exactly one `class="..."` attribute followed, after
// any remaining attributes (e.g. Next.js's `Link` emits `href` after
// `className`), by the visible label. That's enough to pick the right
// element's classes out without a full HTML parser.
function pillClasses(html: string, label: "English" | "Español") {
  const match = html.match(new RegExp(`class="([^"]+)"[^>]*>${label}<`));
  if (!match) {
    throw new Error(`could not find a pill for "${label}" in: ${html}`);
  }
  return match[1].split(" ");
}

// The outer `role="group"` container is unique per render, so its class
// attribute is the first one after the `role="group"` marker.
function containerClasses(html: string) {
  const match = html.match(/<div role="group"[^>]*class="([^"]+)"/);
  if (!match) {
    throw new Error(`could not find the group container in: ${html}`);
  }
  return match[1].split(" ");
}

describe("LanguageSwitcher", () => {
  it("labels both options in the active language", () => {
    const html = renderToStaticMarkup(
      <LanguageSwitcher lang="es" onChange={() => undefined} />,
    );

    expect(html).toContain("English");
    expect(html).toContain("Español");
    expect(html).toContain("Elegir idioma");
  });

  it("marks the active language for assistive tech", () => {
    const html = renderToStaticMarkup(
      <LanguageSwitcher lang="en" onChange={() => undefined} />,
    );

    expect(html).toMatch(/aria-pressed="true"[^>]*>English/);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Español/);
  });

  it("renders anchors when given hrefs instead of a handler", () => {
    const html = renderToStaticMarkup(
      <LanguageSwitcher lang="en" hrefFor={(lang) => `/login?lang=${lang}`} />,
    );

    expect(html).toContain('href="/login?lang=es"');
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain("<button");
  });

  it("keeps identical option labels across both modes", () => {
    const buttons = renderToStaticMarkup(
      <LanguageSwitcher lang="en" onChange={() => undefined} />,
    );
    const links = renderToStaticMarkup(
      <LanguageSwitcher lang="en" hrefFor={(lang) => `/?lang=${lang}`} />,
    );

    for (const label of ["English", "Español"]) {
      expect(buttons).toContain(label);
      expect(links).toContain(label);
    }
  });

  it("emits identical pill classes in button and anchor mode, plus only the anchor's layout compensation", () => {
    const buttonHtml = renderToStaticMarkup(
      <LanguageSwitcher lang="en" onChange={() => undefined} />,
    );
    const anchorHtml = renderToStaticMarkup(
      <LanguageSwitcher lang="en" hrefFor={(lang) => `/?lang=${lang}`} />,
    );

    // Anchors need this because a native <a> is `display: inline` and would
    // ignore `min-h-*`, collapsing to text height — buttons don't need it
    // because <button> is already a flex-sizeable box. Anything beyond these
    // three utilities diverging between modes is a real regression.
    const ANCHOR_LAYOUT_COMPENSATION = ["inline-flex", "items-center", "justify-center"];

    for (const label of ["English", "Español"] as const) {
      const buttonPill = pillClasses(buttonHtml, label);
      const anchorPill = pillClasses(anchorHtml, label);

      expect(anchorPill).toEqual([...buttonPill, ...ANCHOR_LAYOUT_COMPENSATION]);
    }
  });

  it("keeps pill geometry identical across tones and swaps only the container material and active treatment", () => {
    const floatingHtml = renderToStaticMarkup(
      <LanguageSwitcher lang="en" onChange={() => undefined} tone="floating" />,
    );
    const insetHtml = renderToStaticMarkup(
      <LanguageSwitcher lang="en" onChange={() => undefined} tone="inset" />,
    );

    // Container: each tone supplies its own material, and never the other's.
    const floatingContainer = containerClasses(floatingHtml);
    const insetContainer = containerClasses(insetHtml);

    expect(floatingContainer).toContain("bg-[var(--panel-glass-72)]");
    expect(floatingContainer).not.toContain("bg-[rgba(15,23,42,0.05)]");
    expect(insetContainer).toContain("bg-[rgba(15,23,42,0.05)]");
    expect(insetContainer).not.toContain("bg-[var(--panel-glass-72)]");

    // Geometry: the sizing/shape utilities are shared and must not drift
    // between tones, for both the active and inactive option.
    const GEOMETRY = [
      "min-h-9",
      "rounded-full",
      "px-2.5",
      "text-xs",
      "font-semibold",
      "transition",
      "sm:min-h-10",
      "sm:px-4",
      "sm:text-sm",
    ];

    for (const label of ["English", "Español"] as const) {
      const floatingPill = pillClasses(floatingHtml, label);
      const insetPill = pillClasses(insetHtml, label);

      for (const cls of GEOMETRY) {
        expect(floatingPill).toContain(cls);
        expect(insetPill).toContain(cls);
      }
    }

    // Active treatment: the one thing that's allowed — and expected — to
    // differ between tones, per option.
    const floatingActive = pillClasses(floatingHtml, "English");
    const insetActive = pillClasses(insetHtml, "English");

    expect(floatingActive).toContain("bg-[var(--primary)]");
    expect(floatingActive).not.toContain("bg-[var(--surface-lowest)]");
    expect(insetActive).toContain("bg-[var(--surface-lowest)]");
    expect(insetActive).not.toContain("bg-[var(--primary)]");
  });
});
