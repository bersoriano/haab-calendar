import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AnalyticsReport,
  AnalyticsTeaserReport,
  PopularTimesPanel,
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
  it("tells a returning buyer when Premium is still on its way", () => {
    const html = renderToStaticMarkup(
      <ProviderAnalyticsSurface
        lang="en"
        publicUrl="/professionals/ai-automation"
        integratedMode
        entitlements={entitlements("free")}
        checkoutResult="success"
      />,
    );
    expect(html).toContain("Premium turns on in a few seconds");
    expect(html).toContain("Refresh");
  });

  it("confirms a cancelled checkout cost nothing", () => {
    const html = renderToStaticMarkup(
      <ProviderAnalyticsSurface
        lang="es"
        publicUrl="/professionals/ai-automation"
        integratedMode
        entitlements={entitlements("free")}
        checkoutResult="cancelled"
      />,
    );
    expect(html).toContain("No se te cobró nada");
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

describe("AnalyticsTeaserReport", () => {
  it("shows real visit totals and an upgrade offer over sample data", () => {
    const html = renderToStaticMarkup(
      <AnalyticsTeaserReport
        lang="en"
        teaser={{ locked: true, range: 30, timeZone: "UTC", totals: { views: 57, visitors: 41 } }}
      />,
    );
    expect(html).toContain(">57<");
    expect(html).toContain(">41<");
    expect(html).toContain("Upgrade to Premium");
    expect(html).toContain('aria-hidden="true"');
  });
});

describe("booking insights", () => {
  const withInsights: AnalyticsSummary = {
    ...SUMMARY,
    previousTotals: { views: 32, visitors: 30, bookings: 8, bookingVisitors: 3 },
    bookingHealth: { created: 20, cancelled: 3, rescheduled: 4 },
    popularTimes: [
      { weekday: 2, hour: 10, bookings: 4 },
      { weekday: 5, hour: 17, bookings: 1 },
    ],
  };

  it("compares each tile with the previous window", () => {
    const html = renderToStaticMarkup(<AnalyticsReport summary={withInsights} lang="en" />);
    // 40 views vs 32 → +25%; 6 bookings vs 8 → -25%; 20% vs 10% → +10 pts.
    expect(html).toContain("+25% vs previous 7 days");
    expect(html).toContain("-25% vs previous 7 days");
    expect(html).toContain("+10 pts vs previous 7 days");
  });

  it("shows cancellation and reschedule rates", () => {
    const html = renderToStaticMarkup(<AnalyticsReport summary={withInsights} lang="en" />);
    expect(html).toContain("Booking health");
    expect(html).toContain("15%");
    expect(html).toContain("3 of 20");
    expect(html).toContain("4 of 20");
  });

  it("leaves comparisons out when the server sent none", () => {
    const html = renderToStaticMarkup(<AnalyticsReport summary={SUMMARY} lang="en" />);
    expect(html).not.toContain("vs previous");
    expect(html).not.toContain("Booking health");
  });

  it("labels every heatmap cell", () => {
    const html = renderToStaticMarkup(
      <PopularTimesPanel times={withInsights.popularTimes ?? []} lang="en" />,
    );
    expect(html).toContain("Tue 10 AM: 4 bookings");
    expect(html).toContain("Fri 5 PM: 1 booking");
    expect(html).toContain("Mon 9 AM: 0 bookings");
  });

  it("explains an empty heatmap in Spanish", () => {
    expect(renderToStaticMarkup(<PopularTimesPanel times={[]} lang="es" />)).toContain(
      "Aún no hay citas con horario",
    );
  });
});
