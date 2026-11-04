import type { MetadataRoute } from "next";

import { BLOG_PATH, blogAlternateLanguages, localizedUrl, postPath } from "@/components/blog/seo";
import { doctorsAlternateLanguages, doctorsLandingUrl } from "@/components/landing/doctors-seo";
import { landingAlternateLanguages, landingUrl } from "@/components/landing/seo";
import { DEMO_PAGES, getDemoPagePath } from "@/lib/demo-pages";
import { getPosts } from "@/lib/posts.server";
import { buildAbsoluteUrl } from "@/lib/site-url";

/**
 * The pages this deployment wants indexed.
 *
 * Deliberately static: the marketing surfaces plus the seeded example booking
 * pages, all of which are known at build time. Real provider pages are *not*
 * listed. Whether a business's booking page belongs in a search index is that
 * business's decision, not this deployment's, and there is no published-to-search
 * flag to read yet — so listing every published provider would opt them all in
 * silently. Add them here once that flag exists.
 *
 * The blog joins the list with its first published post: until then it is a page
 * with nothing to read, which also asks not to be indexed (components/blog/seo.ts).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Both language versions of the landing page, each carrying the full
  // hreflang set: an annotation only counts when every version confirms it.
  const landing = (["en", "es"] as const).map((lang) => ({
    url: landingUrl(lang),
    changeFrequency: "weekly" as const,
    priority: 1,
    alternates: { languages: landingAlternateLanguages() },
  }));

  // The doctors page has one URL per language, each confirming the other.
  const doctors = (["en", "es"] as const).map((lang) => ({
    url: doctorsLandingUrl(lang),
    changeFrequency: "weekly" as const,
    priority: 0.8,
    alternates: { languages: doctorsAlternateLanguages() },
  }));

  const paths = [
    "/gallery",
    "/login",
    // Reachable by more than readers: Google's OAuth review fetches these while
    // verifying the consent screen's privacy policy and terms links.
    "/privacy",
    "/terms",
    ...DEMO_PAGES.map(getDemoPagePath),
  ];

  // A post is listed once it is published in English; a test keeps the Spanish
  // version alongside it, so both hreflang targets resolve.
  const posts = (await getPosts("en")).filter((post) => !post.draft);
  const blog = (path: string, priority: number, lastModified?: string) =>
    (["en", "es"] as const).map((lang) => ({
      url: localizedUrl(path, lang),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "weekly" as const,
      priority,
      alternates: { languages: blogAlternateLanguages(path) },
    }));

  return [
    ...landing,
    ...doctors,
    ...(posts.length ? blog(BLOG_PATH, 0.7) : []),
    ...posts.flatMap((post) => blog(postPath(post.slug), 0.6, post.updated ?? post.date)),
    ...paths.map((path) => ({
      url: buildAbsoluteUrl(path),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
