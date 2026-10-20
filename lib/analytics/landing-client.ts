import type { PostHog } from "posthog-js";
import {
  getLandingAnalyticsConfig,
  readLandingAttribution,
  sanitizeLandingEvent,
  type LandingCapture,
} from "./landing-policy";

let loading: Promise<typeof import("posthog-js/no-external") | null> | undefined;
let client: PostHog | undefined;

function currentConfig() {
  if (typeof window === "undefined") return null;
  return getLandingAnalyticsConfig({
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    allowedHosts: process.env.NEXT_PUBLIC_POSTHOG_ALLOWED_HOSTS,
  }, {
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    doNotTrack: navigator.doNotTrack,
    globalPrivacyControl: (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true,
  });
}

/** No global provider: private routes never initialize this client. */
export async function loadLandingCapture(signal?: AbortSignal): Promise<LandingCapture | null> {
  const config = currentConfig();
  if (!config || signal?.aborted) return null;

  // Origin and path only, the same shape the policy lets through.
  const { pathname } = window.location;
  const page = `${window.location.origin}${pathname}`;
  const attribution = readLandingAttribution(window.location.href, document.referrer);
  loading ??= import("posthog-js/no-external").catch(() => null);
  const sdk = await loading;
  // Imports can finish after navigation or an in-place switch to setup.
  if (!sdk || signal?.aborted || !currentConfig()) return null;
  try {
    client ??= sdk.default.init(config.key, {
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
      disable_conversations: true,
      disableDeviceModel: true,
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
    }, "haab_landing");
  } catch { return null; }

  const landingClient = client;
  return (event, properties) => {
    try {
      landingClient.capture(event, { ...properties, ...attribution, $current_url: page, $pathname: pathname, $host: new URL(page).host },
        event === "$pageleave" ? { send_instantly: true, transport: "sendBeacon" } : undefined);
    } catch { /* A blocked analytics request never interferes with the page. */ }
  };
}
