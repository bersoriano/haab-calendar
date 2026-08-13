import { parsePublicVerticalSegment } from "@/lib/public-url";

/**
 * A page belonging to one business, read by that business's clients:
 * `/[verticalSegment]/[providerSlug]` and its `[serviceSlug]` and
 * `manage/[token]` children, plus the `/public/[slug]` form.
 *
 * These are the only routes where the language in the URL is *not* the
 * visitor's own preference — it is a choice scoped to one business's page, so
 * the proxy must not promote it into the shared `haab-lang` cookie. Doing so
 * would let a client who reads one page in Spanish find the marketing site and
 * every other business in Spanish too.
 *
 * Pure and dependency-free so it can be unit-tested without a request.
 */
export function isPublicBookingRoute(pathname: string): boolean {
  const [first, second] = pathname.split("/").filter(Boolean);
  if (!first || !second) return false;

  // `/public/[slug]` is the slug-only form of the same page.
  if (first.toLowerCase() === "public") return true;

  return parsePublicVerticalSegment(first) !== undefined;
}
