import type { Metadata } from "next";

import { buildOrganizationJsonLd } from "@/components/landing/seo";
import type { PostMeta } from "@/lib/posts";
import { SITE_NAME, SOCIAL_CARD_SIZE, socialCardPath } from "@/lib/site-metadata";
import { buildAbsoluteUrl, getSiteOrigin } from "@/lib/site-url";
import type { Lang } from "@/lib/types";
import { blogCopy } from "./copy";

/**
 * Search metadata for the blog. Like the landing page, each page has two
 * language versions on one route: English is the bare URL and Spanish is
 * `?lang=es`, which outranks the cookie and Accept-Language, so that URL is
 * Spanish for every visitor and crawler alike.
 */

const OPEN_GRAPH_LOCALES: Record<Lang, string> = { en: "en_US", es: "es_MX" };

export const BLOG_PATH = "/blog";

export function postPath(slug: string) {
  return `${BLOG_PATH}/${slug}`;
}

export function localizedUrl(path: string, lang: Lang) {
  return buildAbsoluteUrl(lang === "es" ? `${path}?lang=es` : path);
}

/** The hreflang set: both versions list both, and English is the default. */
export function blogAlternateLanguages(path: string): Record<Lang | "x-default", string> {
  return {
    en: localizedUrl(path, "en"),
    es: localizedUrl(path, "es"),
    "x-default": localizedUrl(path, "en"),
  };
}

function socialCard(lang: Lang, alt: string) {
  return {
    url: buildAbsoluteUrl(socialCardPath(lang)),
    ...SOCIAL_CARD_SIZE,
    type: "image/png",
    alt,
  };
}

/** A blog with nothing to read stays out of search results until it has posts. */
export function buildBlogMetadata(lang: Lang, hasPublishedPosts: boolean): Metadata {
  const { description, title } = blogCopy[lang];
  const url = localizedUrl(BLOG_PATH, lang);
  const fullTitle = `${title} · ${SITE_NAME}`;
  const image = socialCard(lang, title);

  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url, languages: blogAlternateLanguages(BLOG_PATH) },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url,
      title: fullTitle,
      description,
      locale: OPEN_GRAPH_LOCALES[lang],
      alternateLocale: [OPEN_GRAPH_LOCALES[lang === "es" ? "en" : "es"]],
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
    ...(hasPublishedPosts ? {} : { robots: { index: false, follow: true } }),
  };
}

/** Keep article overrides together with the canonical and hreflang they describe. */
export function buildPostMetadata(post: PostMeta): Metadata {
  const path = postPath(post.slug);
  const url = localizedUrl(path, post.lang);
  const image = socialCard(post.lang, post.title);
  const site = `${getSiteOrigin()}/`;

  return {
    title: { absolute: `${post.seoTitle ?? post.title} · ${SITE_NAME}` },
    description: post.description,
    authors: [{ name: SITE_NAME, url: site }],
    alternates: { canonical: url, languages: blogAlternateLanguages(path) },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      url,
      title: post.title,
      description: post.description,
      locale: OPEN_GRAPH_LOCALES[post.lang],
      alternateLocale: [OPEN_GRAPH_LOCALES[post.lang === "es" ? "en" : "es"]],
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [SITE_NAME],
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [image],
    },
    ...(post.draft ? { robots: { index: false, follow: false } } : {}),
  };
}

function blogBreadcrumbs(lang: Lang, post?: PostMeta) {
  const { blog, home } = blogCopy[lang];
  const blogUrl = localizedUrl(BLOG_PATH, lang);
  const items = [
    { name: home, item: localizedUrl("/", lang) },
    { name: blog, item: blogUrl },
    ...(post ? [{ name: post.title, item: localizedUrl(postPath(post.slug), lang) }] : []),
  ];

  return {
    "@type": "BreadcrumbList",
    "@id": `${post ? items[2].item : blogUrl}#breadcrumbs`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      ...item,
    })),
  };
}

export function buildPostJsonLd(post: PostMeta) {
  const url = localizedUrl(postPath(post.slug), post.lang);
  const site = `${getSiteOrigin()}/`;
  const breadcrumbs = blogBreadcrumbs(post.lang, post);

  return {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationJsonLd(),
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: post.title,
        description: post.description,
        inLanguage: post.lang,
        isPartOf: { "@id": `${site}#website` },
        mainEntity: { "@id": `${url}#article` },
        breadcrumb: { "@id": breadcrumbs["@id"] },
      },
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        dateModified: post.updated ?? post.date,
        inLanguage: post.lang,
        url,
        mainEntityOfPage: { "@id": `${url}#webpage` },
        image: {
          "@type": "ImageObject",
          url: buildAbsoluteUrl(socialCardPath(post.lang)),
          ...SOCIAL_CARD_SIZE,
        },
        author: { "@id": `${site}#organization` },
        publisher: { "@id": `${site}#organization` },
        isPartOf: { "@id": `${localizedUrl(BLOG_PATH, post.lang)}#blog` },
      },
      breadcrumbs,
    ],
  };
}

export function buildBlogJsonLd(lang: Lang, posts: PostMeta[]) {
  const { description, title } = blogCopy[lang];
  const url = localizedUrl(BLOG_PATH, lang);
  const site = `${getSiteOrigin()}/`;
  const published = posts.filter((post) => !post.draft);

  return {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationJsonLd(),
      {
        "@type": "Blog",
        "@id": `${url}#blog`,
        url,
        name: title,
        description,
        inLanguage: lang,
        publisher: { "@id": `${site}#organization` },
        isPartOf: { "@id": `${site}#website` },
        blogPost: published.map((post) => ({
          "@id": `${localizedUrl(postPath(post.slug), lang)}#article`,
        })),
      },
      blogBreadcrumbs(lang),
    ],
  };
}
