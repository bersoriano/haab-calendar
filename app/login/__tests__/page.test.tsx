import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { translations } from "@/components/landing/translations";

const resolved = vi.hoisted(() => ({
  lang: "en" as "en" | "es",
  explicit: undefined as string | undefined,
}));

vi.mock("@/lib/language/server", () => ({
  getServerLanguage: async (explicit?: string) => {
    resolved.explicit = explicit;
    return resolved.lang;
  },
}));

const { default: LoginPage } = await import("@/app/login/page");

describe("login page intent", () => {
  it("uses signup-first draft-safe copy for a guest publish return", async () => {
    resolved.lang = "en";
    const page = await LoginPage({
      searchParams: Promise.resolve({
        lang: "en",
        mode: "signup",
        next: "/?resumePublish=1&lang=en",
      }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Create your account to publish your page.");
    expect(html).toContain("Your draft is safe in this browser.");
    expect(html).toContain("Create account to publish");
    expect(html).toContain("mode=signup");
  });
});

describe("login page language", () => {
  it("follows the resolved language when the link carries no ?lang", async () => {
    // The proxy's own redirect to /login sets `next` but no `lang`, so a
    // Spanish visitor sent here from a protected route used to land on an
    // English page inside <html lang="es">.
    resolved.lang = "es";
    resolved.explicit = "unset";

    const html = renderToStaticMarkup(
      await LoginPage({ searchParams: Promise.resolve({ next: "/super-admin" }) }),
    );

    expect(resolved.explicit).toBeUndefined();
    expect(html).toContain(translations.es.auth.pageTitle);
    expect(html).not.toContain(translations.en.auth.pageTitle);
  });

  it("still lets an explicit ?lang win", async () => {
    resolved.lang = "en";

    const html = renderToStaticMarkup(
      await LoginPage({ searchParams: Promise.resolve({ lang: "en" }) }),
    );

    expect(resolved.explicit).toBe("en");
    expect(html).toContain(translations.en.auth.pageTitle);
  });
});

describe("login page notices", () => {
  it("shows a refused sign-in from the link as an alert", async () => {
    resolved.lang = "en";
    const html = renderToStaticMarkup(
      await LoginPage({ searchParams: Promise.resolve({ lang: "en", message: "Link expired." }) }),
    );

    expect(html).toMatch(/<div role="alert"[^>]*>[\s\S]*Link expired\./);
  });

  it("shows a success from the link as a status", async () => {
    resolved.lang = "en";
    const html = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({ lang: "en", message: "Check your email.", status: "success" }),
      }),
    );

    expect(html).toMatch(/<div role="status"[^>]*>[\s\S]*Check your email\./);
  });

  it("puts the page heading above the card that holds the form", async () => {
    resolved.lang = "en";
    const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({ lang: "en" }) }));

    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html.indexOf("<h1")).toBeLessThan(html.indexOf("<form"));
  });
});
