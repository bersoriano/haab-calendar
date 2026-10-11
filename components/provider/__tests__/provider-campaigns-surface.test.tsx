import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { campaignsCopy } from "@/components/provider/campaigns-copy";
import {
  CampaignResults,
  ProviderCampaignsSurface,
} from "@/components/provider/ProviderCampaignsSurface";
import type { AnalyticsSummary } from "@/lib/analytics/summary";

const SUMMARY: AnalyticsSummary = {
  range: 7,
  timeZone: "America/Mexico_City",
  totals: { views: 40, visitors: 30, serviceSelected: 12, slotSelected: 8, bookings: 6, bookingVisitors: 6 },
  daily: [],
  campaigns: [
    { source: "instagram", medium: "social", campaign: "fall", views: 25, visitors: 20, bookings: 5 },
    { source: null, medium: null, campaign: null, views: 15, visitors: 10, bookings: 1 },
  ],
  referrers: [{ host: "l.instagram.com", views: 18, bookings: 4 }],
  services: [],
  devices: [],
};

function surface(lang: "en" | "es" = "en", integratedMode = true) {
  return renderToStaticMarkup(
    <ProviderCampaignsSurface lang={lang} publicUrl="/professionals/demo" integratedMode={integratedMode} />,
  );
}

describe("ProviderCampaignsSurface", () => {
  it("walks the owner through using a campaign link, step by step", () => {
    const html = surface();
    const steps = html.match(/<ol[^>]*>(.*?)<\/ol>/)?.[1].match(/<li/g) ?? [];

    expect(steps).toHaveLength(campaignsCopy.en.steps.length);
    expect(steps.length).toBeGreaterThanOrEqual(3);
    for (const step of campaignsCopy.en.steps) {
      expect(html).toContain(step.title);
    }
  });

  it("says what each label is for, right at its field", () => {
    const html = surface();

    for (const field of [campaignsCopy.en.source, campaignsCopy.en.medium, campaignsCopy.en.campaign]) {
      expect(html).toContain(field.label);
      // The hint is wired to the input, not just printed near it.
      expect(html).toMatch(
        new RegExp(`<input(?=[^>]*aria-describedby="[^"]+")[^>]*placeholder="${field.placeholder}"`),
      );
      expect(html).toContain(field.hint);
    }
    expect(html).toContain("Copy link");
  });

  it("explains that results need a labelled link before one is filled in", () => {
    expect(surface()).toContain(campaignsCopy.en.linkNeedsSource);
  });

  it("holds the results beside the builder", () => {
    const html = surface();
    expect(html.indexOf(campaignsCopy.en.resultsTitle)).toBeGreaterThan(
      html.indexOf(campaignsCopy.en.builderTitle),
    );
  });

  it("explains that a local preview has no campaigns", () => {
    const html = surface("en", false);
    expect(html).toContain(campaignsCopy.en.previewTitle);
    expect(html).not.toContain("Copy link");
  });

  it("is worded in Spanish too", () => {
    const html = surface("es");
    expect(html).toContain(campaignsCopy.es.builderTitle);
    expect(html).not.toContain(campaignsCopy.en.builderTitle);
    for (const [index, step] of campaignsCopy.es.steps.entries()) {
      expect(step.title).not.toBe(campaignsCopy.en.steps[index].title);
    }
  });
});

describe("CampaignResults", () => {
  it("lists each link with its visits and bookings, and says what untagged means", () => {
    const html = renderToStaticMarkup(<CampaignResults summary={SUMMARY} lang="en" />);

    expect(html).toContain("instagram");
    expect(html).toContain("fall");
    expect(html).toContain("Direct / untagged");
    expect(html).toContain(campaignsCopy.en.directNote);
    expect(html).toContain("l.instagram.com");
  });

  it("says so when no link has been opened yet", () => {
    const html = renderToStaticMarkup(
      <CampaignResults summary={{ ...SUMMARY, campaigns: [], referrers: [] }} lang="en" />,
    );

    expect(html).toContain(campaignsCopy.en.resultsEmptyTitle);
    expect(html).not.toContain("<table");
  });
});
