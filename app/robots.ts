import type { MetadataRoute } from "next";

import { buildAbsoluteUrl, getSiteOrigin } from "@/lib/site-url";

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
const DISALLOW = [
  "/api/",
  "/auth/",
  "/*/manage/",
  "/public/",
  "/reset-password",
  "/login/reset",
  "/super-admin",
  "/try-booking",
  "/account-deletion-preview",
];

/**
 * Search and answer-engine crawlers, named so the invitation is explicit. `*`
 * already admits them; naming them is the signal.
 *
 * Each named group repeats the full disallow list. A crawler obeys only the
 * most specific group that names it and ignores `*` entirely, so a bare
 * `Allow: /` here would quietly lift every rule above for that crawler, manage
 * links included.
 */
const NAMED_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Claude-SearchBot",
  "Claude-User",
  "Googlebot",
  "Bingbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: ["*", ...NAMED_CRAWLERS].map((userAgent) => ({
      userAgent,
      allow: "/",
      disallow: DISALLOW,
    })),
    sitemap: buildAbsoluteUrl("/sitemap.xml"),
    host: getSiteOrigin(),
  };
}
