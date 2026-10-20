import type { Metadata } from "next";

import { DOCTORS_LANDING_PATHS } from "@/lib/language/localized-routes";
import { SITE_NAME, SOCIAL_CARD_SIZE, socialCardPath } from "@/lib/site-metadata";
import { buildAbsoluteUrl, getSiteOrigin } from "@/lib/site-url";
import { doctorsTranslations } from "./doctors-translations";
import type { Lang } from "./translations";

/**
 * Search metadata for the online booking page for doctors. Unlike the landing
 * page (one route, `?lang=`), each language has its own URL with its own words
 * in it, and each version names both in its hreflang set.
 */

const OPEN_GRAPH_LOCALES: Record<Lang, string> = { en: "en_US", es: "es_MX" };

export function doctorsLandingUrl(lang: Lang): string {
  return buildAbsoluteUrl(DOCTORS_LANDING_PATHS[lang]);
}

export function doctorsAlternateLanguages(): Record<Lang | "x-default", string> {
  return {
    en: doctorsLandingUrl("en"),
    es: doctorsLandingUrl("es"),
    "x-default": doctorsLandingUrl("en"),
  };
}

export function buildDoctorsMetadata(lang: Lang): Metadata {
  const { seo } = doctorsTranslations[lang];
  const url = doctorsLandingUrl(lang);
  const fullTitle = `${seo.title} · ${SITE_NAME}`;
  const image = {
    url: buildAbsoluteUrl(socialCardPath(lang)),
    ...SOCIAL_CARD_SIZE,
    type: "image/png",
    alt: seo.socialImageAlt,
  };

  return {
    title: { absolute: fullTitle },
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical: url,
      languages: doctorsAlternateLanguages(),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url,
      title: fullTitle,
      description: seo.description,
      locale: OPEN_GRAPH_LOCALES[lang],
      alternateLocale: [OPEN_GRAPH_LOCALES[lang === "es" ? "en" : "es"]],
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
 * Restates what the page shows and nothing more, like the landing's own
 * (components/landing/seo.ts): the FAQ entries are the page's questions, and
 * the app node shares the landing's `@id`, so search engines read one product.
 */
export function buildDoctorsJsonLd(lang: Lang) {
  const t = doctorsTranslations[lang];
  const site = `${getSiteOrigin()}/`;
  const url = doctorsLandingUrl(lang);
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
        "@type": "WebApplication",
        "@id": ids.app,
        name: SITE_NAME,
        url: site,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: t.seo.title,
        operatingSystem: "Web",
        featureList: t.hero.chips,
        audience: {
          "@type": "Audience",
          audienceType: lang === "es" ? "Médicos, dentistas y clínicas" : "Doctors, dentists, and clinics",
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
