import type { PostHog } from "posthog-js";
import {
  getLandingAnalyticsConfig,
  readLandingAttribution,
  sanitizeLandingEvent,
  type LandingCapture,
} from "./landing-policy";

let loading: Promise<PostHog | null> | undefined;

/** No global provider: private routes never initialize this client. */
export async function loadLandingCapture(): Promise<LandingCapture | null> {
  if (typeof window === "undefined") return null;
  const config = getLandingAnalyticsConfig({
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    allowedHosts: process.env.NEXT_PUBLIC_POSTHOG_ALLOWED_HOSTS,
  }, {
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    doNotTrack: navigator.doNotTrack,
    globalPrivacyControl: (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true,
  });
  if (!config) return null;

  const page = `${window.location.origin}/`;
  const attribution = readLandingAttribution(window.location.href, document.referrer);
  loading ??= import("posthog-js/no-external").then(({ default: posthog }) => posthog.init(config.key, {
    api_host: config.host,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_performance: false,
    capture_exceptions: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    rageclick: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_product_tours: true,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    person_profiles: "never",
    cookieless_mode: "always",
    persistence: "memory",
    disable_persistence: true,
    save_campaign_params: false,
    save_referrer: false,
    respect_dnt: true,
    before_send: (event) => {
      const safe = sanitizeLandingEvent(event);
      return safe ? { ...safe, uuid: event.uuid } : null;
    },
  }, "haab_landing")).catch(() => null);

  const client = await loading;
  if (!client) return null;
  return (event, properties) => {
    try {
      client.capture(event, { ...properties, ...attribution, $current_url: page, $pathname: "/", $host: new URL(page).host },
        event === "$pageleave" ? { send_instantly: true, transport: "sendBeacon" } : undefined);
    } catch { /* A blocked analytics request never interferes with the page. */ }
  };
}
