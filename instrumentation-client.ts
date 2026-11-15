/**
 * Client instrumentation: runs once per document, after the HTML loads and
 * before React hydrates. The server-side counterpart is instrumentation.ts.
 *
 * Google Analytics starts here, from the bundle (no inline <script>), and only
 * on the canonical host, outside Do Not Track / Global Privacy Control, and on
 * an ANALYTICS_PATHS page. Page views come from <PageAnalytics /> in the root
 * layout. See docs/operations/google-analytics.md.
 */
import { initAnalytics } from "@/lib/analytics/analytics.client";
import { isAnalyticsPath } from "@/lib/analytics/landing-policy";

// Literal process.env reads: Next.js inlines NEXT_PUBLIC_* only in this form.
initAnalytics({
  gaId: process.env.NEXT_PUBLIC_GA_ID,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  debug: process.env.NEXT_PUBLIC_GA_DEBUG === "true",
  isTrackablePath: isAnalyticsPath,
});
