import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LandingPage } from "@/components/landing/landing-ui";
import { LanguageProvider } from "@/components/landing/language-provider";

/**
 * The verticals picker is only on the page for a visitor who has no booking
 * page yet; an owner with one gets the dashboard panel in that slot instead.
 * The nav and footer both link to it by anchor, and an anchor to a section that
 * is not rendered scrolls nowhere — which is invisible when testing signed out.
 */
function render(showUseCases: boolean) {
  return renderToStaticMarkup(
    <LanguageProvider initialLang="en">
      <LandingPage featuredDemos={[0, 1]} showUseCases={showUseCases} />
    </LanguageProvider>,
  );
}

describe("the Use cases anchor", () => {
  it("is offered while the verticals picker is on the page", () => {
    expect(render(true)).toContain('href="#verticals"');
  });

  it("is dropped once the picker is replaced by the dashboard panel", () => {
    const html = render(false);

    expect(html).not.toContain('href="#verticals"');
    // The rest of the nav is untouched.
    expect(html).toContain('href="#how"');
    expect(html).toContain('href="#features"');
  });
});

describe("links that leave the landing page", () => {
  it("points at no route that does not exist", () => {
    const html = render(true);
    const internal = [...html.matchAll(/href="(\/[a-z-]*)"/g)].map((m) => m[1]);
    const routes = new Set(["/", "/gallery", "/login", "/try-booking"]);

    for (const href of new Set(internal)) {
      expect(routes.has(href), `${href} has no page.tsx`).toBe(true);
    }
  });
});
