import { DOCTORS_LANDING_PATHS } from "@/lib/language/localized-routes";

/**
 * The marketing pages measured, and the only paths an event may name: the
 * landing page and the online booking page for doctors in each language. Never
 * a business's booking page, a manage link, or the workspace.
 */
export const LANDING_PATHS: readonly string[] = ["/", ...Object.values(DOCTORS_LANDING_PATHS)];

const isLandingPath = (pathname: string) => LANDING_PATHS.includes(pathname);

/**
 * Every page Google Analytics may see: the landing pages plus the gallery and
 * the legal pages. An allowlist, so a new route is private until listed here.
 * Booking pages, setup, dashboards and manage links (whose URL is a bearer
 * credential) are never on it.
 */
export const ANALYTICS_PATHS: readonly string[] = [...LANDING_PATHS, "/gallery", "/privacy", "/terms"];

export const isAnalyticsPath = (pathname: string) => ANALYTICS_PATHS.includes(pathname);

/** The only landing data allowed to leave the browser. No account identity. */
export const LANDING_SECTIONS = [
  "header", "hero", "facts", "verticals", "how", "demo", "live-examples",
  "features", "google-calendar", "trust", "blog", "faq", "early-access", "footer",
  // The doctors page's own sections.
  "front-desk", "for-practices",
] as const;
/** `data-landing-action` values in the landing markup; mapped to events in landing-browser.ts. */
export const LANDING_ACTIONS = [
  "create_page", "resume_setup", "open_dashboard", "try_demo", "view_gallery", "view_example", "read_post", "login",
] as const;
export const LANDING_VERTICALS = ["healthcare", "professional", "spaces", "events", "restaurant"] as const;
/** `cta_type` values the landing sends (a subset of CtaType in lib/analytics/analytics.ts). */
export const LANDING_CTA_TYPES = ["signup", "resume", "login", "demo", "gallery"] as const;
export const LANDING_CONTENT_TYPES = ["faq", "vertical", "example", "article", "page", "video"] as const;

/**
 * Shared landing-page taxonomy names (docs/operations/google-analytics.md),
 * sent to Google Analytics and PostHog alike, plus PostHog's own page events.
 * Renamed from landing_* on 2026-11-15.
 */
export const LANDING_EVENTS = [
  "$pageview", "$pageleave", "section_view", "cta_click", "select_content", "read_progress", "language_change",
] as const;

export type LandingEventName = (typeof LANDING_EVENTS)[number];
export type LandingProperties = Record<string, string | number>;
export type LandingCapture = (event: LandingEventName, properties?: LandingProperties) => void;

type AnalyticsEnvironment = { key?: string; host?: string; allowedHosts?: string };
type Visitor = { hostname: string; pathname: string; doNotTrack: string | null; globalPrivacyControl: boolean };

export function getLandingAnalyticsConfig(environment: AnalyticsEnvironment, visitor: Visitor) {
  const key = environment.key?.trim();
  const host = environment.host?.trim().replace(/\/$/, "");
  const allowed = environment.allowedHosts?.split(",").map((value) => value.trim().toLowerCase());
  if (!key || !host || !["https://us.i.posthog.com", "https://eu.i.posthog.com"].includes(host)
    || !isLandingPath(visitor.pathname) || visitor.doNotTrack === "1" || visitor.globalPrivacyControl
    || !allowed?.includes(visitor.hostname.toLowerCase())
    || /^(localhost|127\.|\[?::1\]?)/.test(visitor.hostname)
    || visitor.hostname.endsWith(".vercel.app")) {
    return null;
  }
  return { key, host };
}

export function readLandingAttribution(href: string, referrer: string): Record<string, string> {
  const url = new URL(href);
  const attribution: Record<string, string> = { $referrer: "$direct", $referring_domain: "$direct" };
  for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
    const value = url.searchParams.get(key)?.trim().toLowerCase().slice(0, 100);
    if (value) attribution[key] = value;
  }
  try {
    const source = new URL(referrer);
    const hostname = source.hostname.toLowerCase().replace(/^www\./, "");
    if (["http:", "https:"].includes(source.protocol) && hostname !== url.hostname.replace(/^www\./, "")) {
      attribution.$referrer = `${source.protocol}//${hostname}`;
      attribution.$referring_domain = hostname;
    }
  } catch { /* A missing or invalid referrer is direct/unknown traffic. */ }
  return attribution;
}

/** FAQ number, vertical, example card index, or the featured post: never free text. */
export function isLandingContentId(value: unknown): value is string {
  return typeof value === "string" && (/^(q|example_)\d{1,2}$/.test(value)
    || value === "featured" || (LANDING_VERTICALS as readonly string[]).includes(value));
}

type WireEvent = { event: string; properties: Record<string, unknown>; uuid?: string; timestamp?: Date };

const SDK_PROPERTIES = new Set([
  "token", "distinct_id", "$device_id", "$session_id", "$window_id", "$lib", "$lib_version",
  "$browser", "$browser_version", "$os", "$os_version", "$device_type", "$screen_height",
  // Required for PostHog's cookieless hash; removed server-side after hashing.
  "$raw_user_agent",
  "$screen_width", "$viewport_height", "$viewport_width", "$timezone", "$timezone_offset",
  "$is_identified", "$process_person_profile", "$cookieless_mode", "$config_defaults",
  "$prev_pageview_id", "$pageview_id", "$prev_pageview_duration",
]);

export function sanitizeLandingEvent(input: WireEvent): WireEvent | null {
  if (!(LANDING_EVENTS as readonly string[]).includes(input.event)) return null;
  let url: URL;
  try {
    url = new URL(String(input.properties.$current_url));
    if (!isLandingPath(url.pathname) || !["http:", "https:"].includes(url.protocol)) return null;
  } catch { return null; }

  const properties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input.properties)) {
    if (SDK_PROPERTIES.has(key) && ["string", "number", "boolean"].includes(typeof value)) properties[key] = value;
  }
  // Origin and path only: the query and hash can carry anything.
  properties.$current_url = `${url.origin}${url.pathname}`;
  if (input.properties.$pathname === url.pathname) properties.$pathname = url.pathname;
  if (input.properties.$host === url.host) properties.$host = url.host;
  const referrer = input.properties.$referrer;
  if (typeof referrer === "string") {
    const clean = readLandingAttribution(url.href, referrer);
    properties.$referrer = clean.$referrer;
    // Never trust the SDK's original referring-domain property independently.
    if ("$referring_domain" in input.properties) properties.$referring_domain = clean.$referring_domain;
  }
  for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
    const value = input.properties[key];
    if (typeof value === "string" && value.trim()) properties[key] = value.trim().toLowerCase().slice(0, 100);
  }
  const enums: Record<string, readonly unknown[]> = {
    section_id: LANDING_SECTIONS, cta_location: LANDING_SECTIONS, cta_type: LANDING_CTA_TYPES,
    content_type: LANDING_CONTENT_TYPES, locale: ["en", "es"], language: ["en", "es"],
  };
  for (const [key, values] of Object.entries(enums)) {
    if (values.includes(input.properties[key])) properties[key] = input.properties[key];
  }
  if (isLandingContentId(input.properties.content_id)) properties.content_id = input.properties.content_id;
  for (const key of ["percent", "duration_seconds", "active_seconds", "max_scroll_percent"]) {
    const value = input.properties[key];
    const max = ["duration_seconds", "active_seconds"].includes(key) ? 86_400 : 100;
    if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max) properties[key] = value;
  }
  return { event: input.event, properties, ...(input.uuid ? { uuid: input.uuid } : {}), ...(input.timestamp ? { timestamp: input.timestamp } : {}) };
}
