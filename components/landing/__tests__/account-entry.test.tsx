import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  Footer,
  getLandingStartMode,
  Hero,
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

  it("leaves the footer to its own create button for a visitor with no page", () => {
    const html = renderToStaticMarkup(
      <LanguageProvider initialLang="en">
        <LandingActionsProvider
          actions={{
            onStart: () => undefined,
            onSelectVertical: () => undefined,
            loggedIn: true,
            hasPage: false,
            onOpenDashboard: () => undefined,
          }}
        >
          <Footer />
        </LandingActionsProvider>
      </LanguageProvider>,
    );

    // The footer already carries the create button (label, then an arrow), so
    // the account row would only repeat it in the links beside it.
    expect(html).not.toContain("Your dashboard");
    expect(html).toContain("Create your page<svg");
    expect(html).not.toContain(">Create your page</button>");
  });

  it("tells a signed-in visitor with no page that they are in, and how to get out", () => {
    const html = renderNav({
      loggedIn: true,
      hasPage: false,
      loginHref: "/login?next=%2F&lang=en",
      onOpenDashboard: () => undefined,
      accountEmail: "owner@example.com",
      onSignOut: () => undefined,
    });

    // Signing in used to empty the slot "Log in" had held. The setup entry
    // steps aside there for the bar's primary button, and that button is
    // invisible until the hero has scrolled away, so a new account came back
    // from the form to a bar that said nothing: no sign the session existed,
    // and no way to end it.
    // One in the desktop utility group, one inside the collapsed menu (<xl).
    expect(html.split(">Sign out</button>").length - 1).toBe(2);
    expect(html).toContain("Signed in as owner@example.com");

    // The bar's copy has to be seen, so it must not share the primary
    // button's fade.
    const bar = html.slice(0, html.indexOf("<details"));
    const signOut = bar.match(/<button[^>]*>Sign out<\/button>/)?.[0];
    expect(signOut).toBeDefined();
    expect(signOut).not.toContain("opacity-0");
  });

  it("keeps the way out beside the workspace entry for an owner with a page", () => {
    const html = renderNav({
      loggedIn: true,
      hasPage: true,
      onOpenDashboard: () => undefined,
      onSignOut: () => undefined,
    });

    expect(html).toContain("Your dashboard");
    expect(html.split(">Sign out</button>").length - 1).toBe(2);
    // No address from the host: the menu still says the session exists.
    expect(html).toContain("You&#x27;re signed in");
  });

  it("offers no way out to a visitor without a session", () => {
    const html = renderNav({
      loginHref: "/login?next=%2F&lang=en",
      onSignOut: () => undefined,
    });

    expect(html).toContain("Log in");
    expect(html).not.toContain("Sign out");
    expect(html).not.toContain("signed in");
  });

  it("names the signed-in account under the hero's primary button", () => {
    const html = renderToStaticMarkup(
      <LanguageProvider initialLang="en">
        <LandingActionsProvider
          actions={{
            onStart: () => undefined,
            onSelectVertical: () => undefined,
            loggedIn: true,
            hasPage: false,
            loginHref: "/login?next=%2F&lang=en",
            onOpenDashboard: () => undefined,
            accountEmail: "owner@example.com",
          }}
        >
          <Hero />
        </LandingActionsProvider>
      </LanguageProvider>,
    );

    // "Already have a page? Log in" is wrong for someone who just did. The
    // line says whose session this is instead of saying nothing.
    expect(html).toContain("Signed in as");
    expect(html).toContain("owner@example.com");
    expect(html).not.toContain("Log in");
  });

  it("keeps the log-in entry reachable on phones through the menu", () => {
    const html = renderNav({ loginHref: "/login?next=%2F&lang=en" });
    const logInOccurrences = html.split(">Log in<").length - 1;

    // One in the desktop utility group, one inside the collapsed menu (<xl).
    expect(logInOccurrences).toBe(2);
    expect(html).toContain("xl:hidden");
  });
});
