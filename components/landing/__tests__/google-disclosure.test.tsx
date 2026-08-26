import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GoogleIntegration } from "@/components/landing/landing-ui";
import { LanguageProvider } from "@/components/landing/language-provider";
import type { Lang } from "@/lib/types";

/**
 * Google's OAuth review reads the home page. It rejected this app once for not
 * explaining its purpose, because nothing on the page mentioned the Google
 * Calendar integration the consent screen asks permission for. These assertions
 * are the reviewer's checklist, so a well-meaning copy edit cannot quietly
 * remove what the verification depends on.
 */
function render(lang: Lang) {
  return renderToStaticMarkup(
    <LanguageProvider initialLang={lang}>
      <GoogleIntegration />
    </LanguageProvider>,
  );
}

const LANGS: Lang[] = ["en", "es"];

describe("home page Google Calendar disclosure", () => {
  it.each(LANGS)("names the Google Calendar integration in %s", (lang) => {
    expect(render(lang)).toContain("Google Calendar");
  });

  it.each(LANGS)("states what the app is for in %s", (lang) => {
    const html = render(lang).toLowerCase();

    expect(html).toMatch(lang === "es" ? /reserva/ : /booking/);
  });

  it.each(LANGS)("says what is never sent to Google, in %s", (lang) => {
    const html = render(lang).toLowerCase();

    // The reviewer's concern is scope justification. The page has to say the
    // integration writes bookings, not client records.
    expect(html).toMatch(lang === "es" ? /nunca/ : /never/);
  });

  it.each(LANGS)("links to the privacy notice from the disclosure in %s", (lang) => {
    expect(render(lang)).toContain("/privacy");
  });

  it.each(LANGS)("is anchored so the consent screen can deep-link it in %s", (lang) => {
    expect(render(lang)).toContain('id="google-calendar"');
  });
});
