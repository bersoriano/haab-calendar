/** The only landing data allowed to leave the browser. No account identity. */
export const LANDING_SECTIONS = [
  "header", "hero", "facts", "verticals", "how", "demo", "live-examples",
  "features", "google-calendar", "trust", "faq", "early-access", "footer",
] as const;
export const LANDING_ACTIONS = [
  "create_page", "resume_setup", "open_dashboard", "try_demo", "view_gallery", "view_example", "login",
] as const;
export const LANDING_EVENTS = [
  "$pageview", "$pageleave", "landing_section_view", "landing_cta_click",
  "landing_faq_open", "landing_video_progress", "landing_scroll_depth",
  "landing_vertical_select", "landing_language_change", "landing_nav_click",
] as const;

export type LandingEventName = (typeof LANDING_EVENTS)[number];
export type LandingCapture = (event: LandingEventName, properties?: Record<string, unknown>) => void;

type AnalyticsEnvironment = { key?: string; host?: string; allowedHosts?: string };
type Visitor = { hostname: string; pathname: string; doNotTrack: string | null; globalPrivacyControl: boolean };

export function getLandingAnalyticsConfig(environment: AnalyticsEnvironment, visitor: Visitor) {
  const key = environment.key?.trim();
  const host = environment.host?.trim().replace(/\/$/, "");
  const allowed = environment.allowedHosts?.split(",").map((value) => value.trim().toLowerCase());
  if (!key || !host || !["https://us.i.posthog.com", "https://eu.i.posthog.com"].includes(host)
    || visitor.pathname !== "/" || visitor.doNotTrack === "1" || visitor.globalPrivacyControl
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

type WireEvent = { event: string; properties: Record<string, unknown>; uuid?: string; timestamp?: Date };

const SDK_PROPERTIES = new Set([
  "token", "distinct_id", "$device_id", "$session_id", "$window_id", "$lib", "$lib_version",
  "$browser", "$browser_version", "$os", "$os_version", "$device_type", "$screen_height",
  "$screen_width", "$viewport_height", "$viewport_width", "$timezone", "$timezone_offset",
  "$is_identified", "$process_person_profile", "$cookieless_mode", "$config_defaults",
  "$prev_pageview_id", "$pageview_id", "$prev_pageview_duration",
]);

export function sanitizeLandingEvent(input: WireEvent): WireEvent | null {
  if (!(LANDING_EVENTS as readonly string[]).includes(input.event)) return null;
  let url: URL;
  try {
    url = new URL(String(input.properties.$current_url));
    if (url.pathname !== "/" || !["http:", "https:"].includes(url.protocol)) return null;
  } catch { return null; }

  const properties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input.properties)) {
    if (SDK_PROPERTIES.has(key) && ["string", "number", "boolean"].includes(typeof value)) properties[key] = value;
  }
  properties.$current_url = `${url.origin}/`;
  if (input.properties.$pathname === "/") properties.$pathname = "/";
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
    section: LANDING_SECTIONS, action: LANDING_ACTIONS, language: ["en", "es"],
    target_language: ["en", "es"], vertical: ["healthcare", "professional", "spaces", "events", "restaurant"],
    milestone: ["start", "25", "50", "75", "complete"],
  };
  for (const [key, values] of Object.entries(enums)) {
    if (values.includes(input.properties[key])) properties[key] = input.properties[key];
  }
  for (const key of ["question", "example", "percent", "duration_seconds", "active_seconds", "max_scroll_percent"]) {
    const value = input.properties[key];
    const max = ["duration_seconds", "active_seconds"].includes(key) ? 86_400 : key === "question" ? 30 : 100;
    if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max) properties[key] = value;
  }
  return { event: input.event, properties, ...(input.uuid ? { uuid: input.uuid } : {}), ...(input.timestamp ? { timestamp: input.timestamp } : {}) };
}
