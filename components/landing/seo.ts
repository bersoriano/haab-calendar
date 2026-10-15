import type { Metadata } from "next";

import {
  SITE_NAME,
  SOCIAL_CARD_SIZE,
  socialCardPath,
} from "@/lib/site-metadata";
import { buildAbsoluteUrl, getSiteOrigin } from "@/lib/site-url";
import { translations, type Lang } from "./translations";

/**
 * Search and link-preview metadata for the landing page, in each language.
 *
 * The page has two language versions on one route. English is the bare `/`,
 * because English is the default and that is what a crawler with no language
 * preference is served. Spanish is `/?lang=es`: `?lang` outranks the cookie and
 * Accept-Language (lib/language/resolve.ts), so that URL is Spanish for every
 * visitor and every crawler alike, which is what a URL in an index must be.
 */

const LANDING_PATHS: Record<Lang, string> = { en: "/", es: "/?lang=es" };

/** Spanish copy uses es-MX dates and times, so its previews claim that region. */
const OPEN_GRAPH_LOCALES: Record<Lang, string> = { en: "en_US", es: "es_MX" };

export function landingUrl(lang: Lang): string {
  return buildAbsoluteUrl(LANDING_PATHS[lang]);
}

/**
 * The hreflang set. Both versions list both, as the annotation requires, and
 * `x-default` names the English page for a visitor matching neither.
 */
export function landingAlternateLanguages(): Record<Lang | "x-default", string> {
  return {
    en: landingUrl("en"),
    es: landingUrl("es"),
    "x-default": landingUrl("en"),
  };
}

function socialCard(lang: Lang) {
  return {
    url: buildAbsoluteUrl(socialCardPath(lang)),
    ...SOCIAL_CARD_SIZE,
    type: "image/png",
    alt: translations[lang].seo.socialImageAlt,
  };
}

/**
 * `lang` is the language the page is rendering in, so the canonical URL names
 * the version that was actually served. Every other query parameter the
 * landing page reads (`vertical`, `name`, `resumePublish`) is state for a
 * visitor mid-signup, not a different page, and the canonical URL drops it.
 */
export function buildLandingMetadata(lang: Lang): Metadata {
  const { seo } = translations[lang];
  const url = landingUrl(lang);
  const otherLang: Lang = lang === "es" ? "en" : "es";
  const fullTitle = `${seo.title} · ${SITE_NAME}`;
  const image = socialCard(lang);

  return {
    // Absolute: the root layout's title template reaches child segments only,
    // and this page shares the root segment with that layout.
    title: { absolute: fullTitle },
    description: seo.description,
    alternates: {
      canonical: url,
      languages: landingAlternateLanguages(),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url,
      title: fullTitle,
      description: seo.description,
      locale: OPEN_GRAPH_LOCALES[lang],
      alternateLocale: [OPEN_GRAPH_LOCALES[otherLang]],
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: seo.description,
      images: [image],
    },
  };
}

/**
 * Schema.org description of the landing page, for search engines and answer
 * engines. It restates what the page shows, never more: the FAQ entries are
 * the page's own questions and answers, so the two cannot drift apart, and
 * there is no rating or review because none exist yet. Google rejects
 * structured data that claims what the page does not show.
 */
export function buildLandingJsonLd(lang: Lang) {
  const t = translations[lang];
  const site = `${getSiteOrigin()}/`;
  const url = landingUrl(lang);
  const ids = {
    organization: `${site}#organization`,
    website: `${site}#website`,
    app: `${site}#app`,
    webpage: `${url}#webpage`,
    faq: `${url}#faq`,
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ids.organization,
        name: SITE_NAME,
        url: site,
        logo: {
          "@type": "ImageObject",
          url: buildAbsoluteUrl("/icon-512.png"),
          width: 512,
          height: 512,
        },
      },
      {
        "@type": "WebSite",
        "@id": ids.website,
        name: SITE_NAME,
        url: site,
        inLanguage: ["en", "es"],
        publisher: { "@id": ids.organization },
      },
      {
        "@type": "WebApplication",
        "@id": ids.app,
        name: SITE_NAME,
        url: site,
        description: t.seo.description,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: t.seo.title,
        operatingSystem: "Web",
        browserRequirements: "Requires JavaScript.",
        image: socialCard(lang).url,
        featureList: t.hero.chips,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: t.hero.badgeText,
        },
        publisher: { "@id": ids.organization },
      },
      {
        "@type": "WebPage",
        "@id": ids.webpage,
        url,
        name: `${t.seo.title} · ${SITE_NAME}`,
        description: t.seo.description,
        inLanguage: lang,
        isPartOf: { "@id": ids.website },
        about: { "@id": ids.app },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: socialCard(lang).url,
          ...SOCIAL_CARD_SIZE,
        },
      },
      {
        "@type": "FAQPage",
        "@id": ids.faq,
        url,
        inLanguage: lang,
        isPartOf: { "@id": ids.webpage },
        mainEntity: t.faq.items.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };
}

/**
 * JSON for an inline <script>. `JSON.stringify` leaves `<` alone, so copy that
 * ever contained "</script>" would end the tag early and run what followed.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
