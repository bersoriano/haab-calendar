import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

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
});
