import { analyticsEnabled, track } from "./analytics.client";
import type { LandingCapture, LandingEventName } from "./landing-policy";

type TaxonomyEvent = Exclude<LandingEventName, "$pageview" | "$pageleave">;

/**
 * One capture for the landing tracker: taxonomy events go to Google Analytics
 * through track() and to PostHog when its landing client loaded. PostHog's own
 * $pageview/$pageleave stay PostHog-only; GA's page_view comes from
 * <PageAnalytics />. Null when neither destination is active.
 */
export function combineLandingCapture(posthog: LandingCapture | null): LandingCapture | null {
  const google = analyticsEnabled();
  if (!google && !posthog) return null;
  return (event, properties) => {
    if (google && event !== "$pageview" && event !== "$pageleave") {
      try { track(event as TaxonomyEvent, properties); }
      catch { /* Analytics never interferes with the page. */ }
    }
    posthog?.(event, properties);
  };
}
