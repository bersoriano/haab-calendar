import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { bookingTranslations } from "@/components/booking/i18n/translations";

const resolved = vi.hoisted(() => ({ lang: "en" as "en" | "es" }));

vi.mock("@/lib/language/server", () => ({
  getServerLanguage: async () => resolved.lang,
}));

const { default: NotFoundPage } = await import("@/app/not-found");

/** The English copy carries an apostrophe, which React escapes on the way out. */
function decodeEntities(html: string) {
  return html.replace(/&#x27;/g, "'");
}

describe("not-found page language", () => {
  it("renders in the language the server already resolved", async () => {
    // A visitor carrying haab-lang=es used to get a fully English 404 inside
    // <html lang="es">, because this page guessed from ?lang and localStorage
    // instead of the cookie the proxy writes.
    resolved.lang = "es";
    const html = decodeEntities(renderToStaticMarkup(await NotFoundPage()));

    expect(html).toContain(bookingTranslations.es.notFound.title);
    expect(html).not.toContain(bookingTranslations.en.notFound.title);
  });

  it("renders in English for an English visitor", async () => {
    resolved.lang = "en";
    const html = decodeEntities(renderToStaticMarkup(await NotFoundPage()));

    expect(html).toContain(bookingTranslations.en.notFound.title);
    expect(html).not.toContain(bookingTranslations.es.notFound.title);
  });

  it("switches language by link, so the server renders the choice", async () => {
    resolved.lang = "en";
    const html = decodeEntities(renderToStaticMarkup(await NotFoundPage()));

    // Link mode, like /login: there is no client state on this page any more,
    // so the switch has to be a navigation the proxy and server can both see.
    expect(html).toContain('href="?lang=es"');
    expect(html).not.toContain("<button");
  });
});
