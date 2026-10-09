import { describe, expect, it } from "vitest";

import {
  normalizeCampaignValue,
  parsePublicPageEventPayload,
  readCampaignParams,
  readReferrerHost,
} from "@/lib/analytics/events";
import {
  buildCampaignUrl,
  changePercent,
  conversionRate,
  parseAnalyticsRange,
  popularTimeHours,
} from "@/lib/analytics/summary";
import { eventForStepChange } from "@/lib/analytics/use-public-page-analytics";

const SERVICE_ID = "2f1c6a0e-9b7d-4c1e-8a55-0d6f3b2a9c11";

describe("parsePublicPageEventPayload", () => {
  it("accepts a known event and normalises campaign tags", () => {
    expect(
      parsePublicPageEventPayload({
        event: "service_selected",
        serviceId: SERVICE_ID.toUpperCase(),
        utmSource: " Instagram ",
        utmCampaign: "Fall-Promo",
        referrer: "https://l.instagram.com/?u=x",
      }),
    ).toEqual({
      event: "service_selected",
      serviceId: SERVICE_ID,
      referrer: "https://l.instagram.com/?u=x",
      utmSource: "instagram",
      utmMedium: undefined,
      utmCampaign: "fall-promo",
    });
  });

  it("rejects unknown events and non-objects", () => {
    expect(parsePublicPageEventPayload({ event: "purchase" })).toBeNull();
    expect(parsePublicPageEventPayload(null)).toBeNull();
    expect(parsePublicPageEventPayload([{ event: "page_view" }])).toBeNull();
    expect(parsePublicPageEventPayload("page_view")).toBeNull();
  });

  it("drops a service id that is not a uuid instead of rejecting the event", () => {
    expect(parsePublicPageEventPayload({ event: "page_view", serviceId: "svc-1" })?.serviceId)
      .toBeUndefined();
  });
});

describe("campaign helpers", () => {
  it("caps and blanks campaign values", () => {
    expect(normalizeCampaignValue("   ")).toBeUndefined();
    expect(normalizeCampaignValue(42)).toBeUndefined();
    expect(normalizeCampaignValue("x".repeat(150))).toHaveLength(100);
  });

  it("reads utm params from a query string", () => {
    expect(
      readCampaignParams(new URLSearchParams("utm_source=WhatsApp&utm_medium=social&x=1")),
    ).toEqual({ utmSource: "whatsapp", utmMedium: "social", utmCampaign: undefined });
  });

  it("keeps only the referrer host and ignores the site itself", () => {
    expect(readReferrerHost("https://www.Google.com/search?q=secret")).toBe("google.com");
    expect(readReferrerHost("https://haabcalendar.com/", "www.haabcalendar.com")).toBeUndefined();
    expect(readReferrerHost("javascript:alert(1)")).toBeUndefined();
    expect(readReferrerHost("not a url")).toBeUndefined();
  });

  it("builds a tagged campaign link", () => {
    expect(
      buildCampaignUrl("https://haabcalendar.com/professionals/ai-automation", {
        source: "Instagram",
        medium: "",
        campaign: "Fall Promo",
      }),
    ).toBe(
      "https://haabcalendar.com/professionals/ai-automation?utm_source=instagram&utm_campaign=fall-promo",
    );
  });
});

describe("summary helpers", () => {
  it("falls back to 30 days for unknown ranges", () => {
    expect(parseAnalyticsRange("7")).toBe(7);
    expect(parseAnalyticsRange("365")).toBe(30);
    expect(parseAnalyticsRange(null)).toBe(30);
  });

  it("returns null conversion when nothing was seen", () => {
    expect(conversionRate(1, 0)).toBeNull();
    expect(conversionRate(1, 3)).toBe(33.3);
  });
});

describe("period comparison and heatmap helpers", () => {
  it("compares with the previous window only when there is a baseline", () => {
    expect(changePercent(12, 10)).toBe(20);
    expect(changePercent(5, 10)).toBe(-50);
    expect(changePercent(5, 0)).toBeNull();
    expect(changePercent(5, undefined)).toBeNull();
  });

  it("shows a working day, widened to fit early and late bookings", () => {
    expect(popularTimeHours([])).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    const wide = popularTimeHours([
      { weekday: 1, hour: 7, bookings: 1 },
      { weekday: 5, hour: 20, bookings: 2 },
    ]);
    expect(wide[0]).toBe(7);
    expect(wide.at(-1)).toBe(20);
  });
});

describe("eventForStepChange", () => {
  it("maps forward moves to funnel events", () => {
    expect(eventForStepChange(1, 2)).toBe("service_selected");
    expect(eventForStepChange(2, 3)).toBe("slot_selected");
  });

  it("ignores backward moves and the success step", () => {
    expect(eventForStepChange(3, 2)).toBeNull();
    expect(eventForStepChange(2, 2)).toBeNull();
    expect(eventForStepChange(3, 4)).toBeNull();
  });
});
