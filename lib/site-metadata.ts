import type { Metadata } from "next";

import {
  buildProviderPath,
  buildServicePath,
  normalizeUrlSlugSegment,
  parsePublicVerticalSegment,
} from "@/lib/public-url";
import { buildAbsoluteUrl, getSiteOrigin } from "@/lib/site-url";
import type { Lang } from "@/lib/types";

export const SITE_NAME = "Haab Calendar";

const SITE_DESCRIPTION =
  "Haab Calendar is booking software for small businesses. Publish a booking page, take appointments without client accounts, and optionally sync confirmed bookings to your own Google Calendar.";

/** The link-preview image, one per language; see app/social-card/[image]/route.tsx. */
export const SOCIAL_CARD_SIZE = { width: 1200, height: 630 } as const;

export function socialCardPath(lang: Lang): string {
  return `/social-card/${lang}.png`;
}

/**
 * Metadata that has to name the site's own domain.
 *
 * Built by function rather than declared as a constant so the canonical origin
 * is read where it is used, and a deployment that changes NEXT_PUBLIC_SITE_URL
 * does not have to remember that a second module froze the old value.
 */
export function buildRootMetadata(): Metadata {
  const origin = getSiteOrigin();
  // Search Console's meta-tag method. Left off entirely when unset, because an
  // empty content="" reads as a failed match rather than an absent tag. A DNS
  // TXT record verifies the whole domain instead and is the better option when
  // subdomains need to be covered too — see README.
  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim() || undefined;
  // Every page that does not choose its own still gets a preview image rather
  // than a bare link.
  const socialCard = {
    url: socialCardPath("en"),
    ...SOCIAL_CARD_SIZE,
    type: "image/png",
    alt: SITE_NAME,
  };

  return {
    ...(googleVerification ? { verification: { google: googleVerification } } : {}),
    // Without this, every relative URL in metadata — canonical links, Open
    // Graph images — resolves against whatever host served the request, so a
    // preview deployment advertises itself as the canonical site.
    metadataBase: new URL(origin),
    // A page names itself and the brand follows. The landing page leads with
    // what people search for, not with a name they do not know yet.
    title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
    applicationName: SITE_NAME,
    description: SITE_DESCRIPTION,
    // No `url` here. Every page inherits this object, and Facebook treats
    // og:url as the page's identity: a site-wide value previews every shared
    // booking page as the home page. Without one, the fetched URL is used.
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [socialCard],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [socialCard],
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
