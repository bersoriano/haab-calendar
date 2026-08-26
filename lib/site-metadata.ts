import type { Metadata } from "next";

import {
  buildProviderPath,
  buildServicePath,
  normalizeUrlSlugSegment,
  parsePublicVerticalSegment,
} from "@/lib/public-url";
import { buildAbsoluteUrl, getSiteOrigin } from "@/lib/site-url";

/**
 * Metadata that has to name the site's own domain.
 *
 * Built by function rather than declared as a constant so the canonical origin
 * is read where it is used, and a deployment that changes NEXT_PUBLIC_SITE_URL
 * does not have to remember that a second module froze the old value.
 */
export function buildRootMetadata(): Metadata {
  const origin = getSiteOrigin();

  return {
    // Without this, every relative URL in metadata — canonical links, Open
    // Graph images — resolves against whatever host served the request, so a
    // preview deployment advertises itself as the canonical site.
    metadataBase: new URL(origin),
    title: "Haab Calendar",
    description:
      "Reusable appointment and booking management module for timed appointments and full-day reservations.",
    openGraph: {
      type: "website",
      siteName: "Haab Calendar",
      url: origin,
      title: "Haab Calendar",
      description:
        "Reusable appointment and booking management module for timed appointments and full-day reservations.",
    },
  };
}

/**
 * For pages whose URL is itself a secret — the customer manage link.
 *
 * app/robots.ts already asks crawlers not to fetch these, but robots.txt only
 * governs crawling: a URL discovered elsewhere can still be indexed without
 * ever being fetched. `noindex` is the half that actually keeps it out.
 */
export const PRIVATE_PAGE_METADATA: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * One canonical URL for a public page.
 *
 * The query string is dropped deliberately: `?lang=es` selects the rendering
 * language of the same booking page, not a different page, and leaving it in
 * would have every language variant compete with the bare URL.
 */
export function buildPublicPageMetadata(path: string): Metadata {
  const url = new URL(buildAbsoluteUrl(path));
  url.search = "";
  url.hash = "";

  return { alternates: { canonical: url.toString() } };
}

/**
 * The canonical URL of a public booking page, derived from its route segments.
 *
 * Route segments rather than the resolved provider row, so declaring a canonical
 * URL costs no second database read on a page that already resolved the same
 * provider to render. That is sound because the page only renders a 200 for a
 * URL that is already canonical: a historical slug, or the `venues` alias, is
 * answered with a permanent redirect before this metadata would apply.
 *
 * An unrecognised vertical segment yields no canonical URL at all. That route
 * is a 404, and a 404 claiming to be the canonical version of something is
 * worse than saying nothing.
 */
export function buildProviderCanonicalMetadata(
  verticalSegment: string,
  providerSlug: string,
  serviceSlug?: string,
): Metadata {
  const vertical = parsePublicVerticalSegment(verticalSegment);

  if (!vertical) {
    return {};
  }

  const provider = normalizeUrlSlugSegment(providerSlug);
  const service = serviceSlug ? normalizeUrlSlugSegment(serviceSlug) : undefined;

  return buildPublicPageMetadata(
    service
      ? buildServicePath(vertical, provider, service)
      : buildProviderPath(vertical, provider),
  );
}
