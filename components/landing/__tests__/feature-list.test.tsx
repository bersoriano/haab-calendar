import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FeatureList } from "@/components/landing/feature-list";
import { LanguageProvider } from "@/components/landing/language-provider";
import { translations } from "@/components/landing/translations";
import type { Lang } from "@/lib/types";

const LANGS: Lang[] = ["en", "es"];

function render(lang: Lang) {
  return renderToStaticMarkup(
    <LanguageProvider initialLang={lang}>
      <FeatureList />
    </LanguageProvider>,
  );
}

describe("landing feature list", () => {
  it.each(LANGS)("renders every feature as a titled list item in %s", (lang) => {
    const html = render(lang);
    const { featureList } = translations[lang];

    expect(html).toContain('id="feature-list"');
    expect(html).toContain(featureList.title);
    expect(html.match(/<li\b/g)).toHaveLength(featureList.items.length);

    for (const item of featureList.items) {
      expect(html).toContain(`<h3`);
      expect(html).toContain(escape(item.title));
    }
  });

  it("lists the same number of features in both languages", () => {
    expect(translations.es.featureList.items).toHaveLength(translations.en.featureList.items.length);
  });

  // Every feature is on the free plan; the product is not a beta or early access.
  it.each(LANGS)("says it is on the free plan, without early-access claims, in %s", (lang) => {
    const text = JSON.stringify(translations[lang].featureList);

    expect(text).toMatch(lang === "en" ? /free plan/ : /plan gratuito/);
    expect(text).not.toMatch(/\b(early access|beta|acceso anticipado)\b/i);
  });
});

function escape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
}
