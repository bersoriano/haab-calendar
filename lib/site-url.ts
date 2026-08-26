/**
 * Where this deployment lives, as one canonical origin.
 *
 * Almost nothing in the application needs this: request-time code derives its
 * own origin from the incoming request, which is correct on every host the app
 * is ever served from — production, previews, localhost. The exceptions are the
 * places where no request origin exists or where a *stable* answer is the
 * point:
 *
 *   - `metadataBase`, `sitemap.ts`, `robots.ts` — search engines must be told a
 *     single home, and a preview deployment announcing itself as canonical is
 *     how duplicate content happens.
 *   - QR and manage links already in circulation, which were minted against
 *     whatever origin served the page at the time and must keep resolving after
 *     the site moves to a new domain.
 *
 * This is the customization seam: a child deployment sets NEXT_PUBLIC_SITE_URL
 * and changes nothing else.
 */

/**
 * Used only when neither the explicit setting nor the hosting platform can say.
 * A build with no configuration at all still produces valid absolute URLs
 * rather than `undefined` in a <link rel="canonical">.
 */
export const DEFAULT_SITE_URL = "https://haabcalendar.com";

/**
 * Requires an explicit scheme. `new URL()` reads a bare word like "nonsense" as
 * a perfectly good host, so without this check a typo in a trusted-origin list
 * becomes a trusted origin.
 */
function toOrigin(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
    return undefined;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return undefined;
  }
}

/** Vercel exposes its production domain as a bare host, with no scheme. */
function hostToOrigin(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed ? toOrigin(`https://${trimmed}`) : undefined;
}

/**
 * The canonical origin, with no trailing slash and no path.
 *
 * NEXT_PUBLIC_SITE_URL is first because it is the only source that is also
 * readable in the browser bundle and the only one an operator sets deliberately.
 * VERCEL_PROJECT_PRODUCTION_URL is the platform's own answer — the custom domain
 * once one is assigned — and keeps a fresh deployment correct before anyone has
 * configured anything.
 */
export function getSiteOrigin(): string {
  return (
    toOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    hostToOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    // Not reached in a configured deployment, and deliberately a constant
    // rather than a throw: metadata is not worth failing a build over.
    toOrigin(DEFAULT_SITE_URL)!
  );
}

export function buildAbsoluteUrl(path: string): string {
  return new URL(path, getSiteOrigin()).toString();
}

/**
 * Every origin whose links this deployment still honours.
 *
 * A domain change does not reach the QR codes and manage links already printed,
 * saved, or mailed: those carry the origin that minted them, and an origin check
 * compares strings, so a redirect on the old host cannot rescue them. Listing
 * the retired origin in HAAB_ADDITIONAL_ORIGINS keeps them working through the
 * changeover. Only origins the operator controls belong here — the token in the
 * link is still resolved against the database, but the origin check is what
 * stops an arbitrary URL from being treated as one of ours.
 */
export function getTrustedAppOrigins(): string[] {
  const origins = [
    getSiteOrigin(),
    ...(process.env.HAAB_ADDITIONAL_ORIGINS ?? "")
      .split(",")
      .map(toOrigin)
      .filter((origin): origin is string => Boolean(origin)),
  ];

  return [...new Set(origins)];
}
