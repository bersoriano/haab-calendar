import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LoginHeader } from "@/components/auth/LoginHeader";

describe("LoginHeader", () => {
  it("links the English login page back to the English landing page", () => {
    const html = renderToStaticMarkup(<LoginHeader lang="en" />);

    expect(html).toContain("Haab Calendar");
    expect(html).toContain("← Back to home");
    // The brand mark and the back link both point at the English landing page.
    expect(html.match(/href="\/\?lang=en"/g)).toHaveLength(2);
  });

  it("links the Spanish login page back to the Spanish landing page", () => {
    const html = renderToStaticMarkup(<LoginHeader lang="es" />);

    expect(html).toContain("← Volver al inicio");
    expect(html.match(/href="\/\?lang=es"/g)).toHaveLength(2);
  });

  it("carries the language switcher, so no page has to place its own", () => {
    const html = renderToStaticMarkup(<LoginHeader lang="en" />);

    expect(html).toContain('href="?lang=es"');
    expect(html).toContain('href="?lang=en"');
    expect(html).toContain('aria-label="Choose language"');
    expect(html).toMatch(/<a[^>]*href="\?lang=en"[^>]*aria-current="true"/);
  });

  it("names the brand link with its own visible text", () => {
    // An aria-label that does not contain the visible text fails label-in-name.
    const html = renderToStaticMarkup(<LoginHeader lang="en" />);
    const brand = html.match(/<a[^>]*href="\/\?lang=en"[^>]*>[\s\S]*?<\/a>/)?.[0] ?? "";

    expect(brand).not.toContain("aria-label");
    expect(brand).toContain("Haab Calendar");
    expect(brand).toMatch(/<span class="sr-only">[^<]*Back to home<\/span>/);
  });

  it("is the app's bar, not the landing page's glass band", () => {
    const html = renderToStaticMarkup(<LoginHeader lang="en" />);

    expect(html).toMatch(/^<header[^>]*bg-app-surface/);
    expect(html).not.toContain("backdrop-blur");
  });

  it("lets a page build the switch links when its state lives in the query", () => {
    const html = renderToStaticMarkup(
      <LoginHeader
        lang="en"
        languageHrefFor={(option) => `/login?lang=${option}&mode=signup`}
      />,
    );

    expect(html).toContain('href="/login?lang=es&amp;mode=signup"');
    expect(html).toContain('href="/login?lang=en&amp;mode=signup"');
  });
});
