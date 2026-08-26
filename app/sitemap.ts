import type { MetadataRoute } from "next";

import { DEMO_PAGES, getDemoPagePath } from "@/lib/demo-pages";
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
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/gallery",
    "/login",
    // Reachable by more than readers: Google's OAuth review fetches these while
    // verifying the consent screen's privacy policy and terms links.
    "/privacy",
    "/terms",
    ...DEMO_PAGES.map(getDemoPagePath),
  ];

  return paths.map((path) => ({
    url: buildAbsoluteUrl(path),
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.6,
  }));
}
