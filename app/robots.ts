import type { MetadataRoute } from "next";

import { buildAbsoluteUrl } from "@/lib/site-url";

/**
 * What crawlers may index.
 *
 * The important rule is the one covering manage links: such a URL is not a
 * page about a booking, it *is* the credential for one, and an indexed manage
 * link publishes a customer's appointment to anyone who searches. robots.txt
 * alone is not the guarantee — the manage page also serves `noindex` — but a
 * crawler that never fetches the URL cannot index it in the first place.
 *
 * `/public/` is the standalone local demo surface. It renders the same provider
 * as the canonical `/{vertical}/{slug}` route, so indexing it would split one
 * page's ranking across two URLs.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/*/manage/",
        "/public/",
        "/reset-password",
        "/login/reset",
        "/super-admin",
        "/try-booking",
        "/account-deletion-preview",
      ],
    },
    sitemap: buildAbsoluteUrl("/sitemap.xml"),
  };
}
