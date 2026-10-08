import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AnalyticsReport,
  ProviderAnalyticsSurface,
} from "@/components/provider/ProviderAnalyticsSurface";
import type { AnalyticsSummary } from "@/lib/analytics/summary";
import { resolveEntitlements } from "@/lib/entitlements/resolve";

const PROVIDER = "00000000-0000-4000-8000-000000000001";

function entitlements(planTier: "free" | "premium") {
  return resolveEntitlements({
    providerId: PROVIDER,
    planTier,
    overrides: [],
    now: new Date("2026-10-08T12:00:00.000Z"),
  });
}

const SUMMARY: AnalyticsSummary = {
  range: 7,
  timeZone: "America/Mexico_City",
  totals: { views: 40, visitors: 30, serviceSelected: 12, slotSelected: 8, bookings: 6, bookingVisitors: 6 },
  daily: [
    { day: "2026-10-07", views: 15, visitors: 10, bookings: 2 },
    { day: "2026-10-08", views: 25, visitors: 20, bookings: 4 },
  ],
  campaigns: [
    { source: "instagram", medium: "social", campaign: "fall", views: 25, visitors: 20, bookings: 5 },
    { source: null, medium: null, campaign: null, views: 15, visitors: 10, bookings: 1 },
  ],
  referrers: [{ host: "l.instagram.com", views: 20, bookings: 4 }],
  services: [{ serviceId: "s-1", name: "Strategy call", selections: 12, bookings: 6 }],
  devices: [{ device: "mobile", views: 30 }],
};

describe("ProviderAnalyticsSurface", () => {
  it("shows the premium upsell to free providers", () => {
    const html = renderToStaticMarkup(
      <ProviderAnalyticsSurface
        lang="en"
        publicUrl="/professionals/ai-automation"
        integratedMode
        entitlements={entitlements("free")}
      />,
    );
    expect(html).toContain("Analytics is part of Premium");
    expect(html).not.toContain("Campaign link builder");
  });

  it("shows the dashboard to premium providers", () => {
    const html = renderToStaticMarkup(
      <ProviderAnalyticsSurface
        lang="en"
        publicUrl="/professionals/ai-automation"
        integratedMode
        entitlements={entitlements("premium")}
      />,
    );
    expect(html).toContain("Booking page analytics");
    expect(html).toContain("Campaign link builder");
  });

  it("explains that a local preview has no analytics", () => {
    const html = renderToStaticMarkup(
      <ProviderAnalyticsSurface lang="es" publicUrl="/public" integratedMode={false} />,
    );
    expect(html).toContain("La analítica necesita una página publicada");
  });
});

describe("AnalyticsReport", () => {
  it("renders totals, conversion, campaigns and services", () => {
    const html = renderToStaticMarkup(<AnalyticsReport summary={SUMMARY} lang="en" />);
    expect(html).toContain(">40<");
    expect(html).toContain("20%");
    expect(html).toContain("instagram");
    expect(html).toContain("Direct / untagged");
    expect(html).toContain("Strategy call");
    expect(html).toContain("l.instagram.com");
  });

  it("shows an empty state before the first visit", () => {
    const empty: AnalyticsSummary = {
      ...SUMMARY,
      totals: { views: 0, visitors: 0, serviceSelected: 0, slotSelected: 0, bookings: 0, bookingVisitors: 0 },
    };
    expect(renderToStaticMarkup(<AnalyticsReport summary={empty} lang="en" />)).toContain("No visits yet");
  });
});
