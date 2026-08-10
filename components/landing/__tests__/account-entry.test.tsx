import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LandingActionsProvider, StickyNav } from "@/components/landing/landing-ui";
import { LanguageProvider } from "@/components/landing/language-provider";

function renderNav(
  actions: Partial<Parameters<typeof LandingActionsProvider>[0]["actions"]> = {},
) {
  return renderToStaticMarkup(
    <LanguageProvider initialLang="en">
      <LandingActionsProvider
        actions={{ onStart: () => undefined, onSelectVertical: () => undefined, ...actions }}
      >
        <StickyNav />
      </LandingActionsProvider>
    </LanguageProvider>,
  );
}

describe("landing account entry", () => {
  it("offers a sign-in link to a visitor without a session", () => {
    const html = renderNav({ loginHref: "/login?next=%2F&lang=en" });

    expect(html).toContain("Log in");
    expect(html).toContain("/login?next=%2F&amp;lang=en");
    expect(html).not.toContain("Your dashboard");
  });

  it("sends a configured provider to their workspace instead", () => {
    const html = renderNav({
      loggedIn: true,
      hasPage: true,
      loginHref: "/login?next=%2F&lang=en",
      onOpenDashboard: () => undefined,
    });

    expect(html).toContain("Your dashboard");
    expect(html).not.toContain("Log in");
    expect(html).not.toContain("/login");
  });

  it("shows neither while a signed-in provider is still setting up", () => {
    const html = renderNav({
      loggedIn: true,
      hasPage: false,
      loginHref: "/login?next=%2F&lang=en",
      onOpenDashboard: () => undefined,
    });

    expect(html).not.toContain("Log in");
    expect(html).not.toContain("Your dashboard");
    // The primary CTA is what continues an unfinished setup.
    expect(html).toContain("Create your page");
  });

  it("keeps the log-in entry reachable on phones through the menu", () => {
    const html = renderNav({ loginHref: "/login?next=%2F&lang=en" });
    const logInOccurrences = html.split(">Log in<").length - 1;

    // One in the desktop utility group, one inside the collapsed menu (<xl).
    expect(logInOccurrences).toBe(2);
    expect(html).toContain("xl:hidden");
  });
});
