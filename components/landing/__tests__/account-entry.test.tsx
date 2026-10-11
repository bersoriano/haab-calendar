import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  getLandingStartMode,
  LandingActionsProvider,
  StickyNav,
} from "@/components/landing/landing-ui";
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
  it("resumes an existing guest draft instead of reopening the start dialog", () => {
    expect(getLandingStartMode({ hasDraft: true, hasPage: false })).toBe("resume");
    expect(getLandingStartMode({ hasDraft: false, hasPage: false })).toBe("dialog");
    expect(getLandingStartMode({ hasDraft: false, hasPage: true })).toBe("resume");
  });

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

  it("offers setup, not the workspace, to a signed-in visitor with no page", () => {
    const html = renderNav({
      loggedIn: true,
      hasPage: false,
      loginHref: "/login?next=%2F&lang=en",
      onOpenDashboard: () => undefined,
    });

    // The workspace bounces anyone without a finished page back here, so
    // "Your dashboard" was a button that did nothing for a new account.
    expect(html).not.toContain("Your dashboard");
    expect(html).not.toContain("Log in");
    expect(html).toContain("Create your page");
  });

  it("says create your page once per place, not twice", () => {
    const html = renderNav({
      loggedIn: true,
      hasPage: false,
      loginHref: "/login?next=%2F&lang=en",
      onOpenDashboard: () => undefined,
    });

    // The bar keeps its primary button (label, then an arrow); the menu keeps
    // a single row. The account entry must not add a second copy beside either.
    expect(html.split(">Create your page</button>").length - 1).toBe(1);
    expect(html.split(">Create your page<svg").length - 1).toBe(1);
  });

  it("keeps the log-in entry reachable on phones through the menu", () => {
    const html = renderNav({ loginHref: "/login?next=%2F&lang=en" });
    const logInOccurrences = html.split(">Log in<").length - 1;

    // One in the desktop utility group, one inside the collapsed menu (<xl).
    expect(logInOccurrences).toBe(2);
    expect(html).toContain("xl:hidden");
  });
});
