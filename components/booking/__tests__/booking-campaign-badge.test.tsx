import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  BookingCampaignBadge,
  formatBookingCampaign,
} from "@/components/booking/BookingCampaignBadge";

describe("formatBookingCampaign", () => {
  it("prefers source and campaign", () => {
    expect(
      formatBookingCampaign({ source: "instagram", medium: "social", campaign: "fall" }, "en"),
    ).toBe("via instagram · fall");
  });

  it("falls back to medium, then to the referring site", () => {
    expect(formatBookingCampaign({ source: "newsletter", medium: "email" }, "es")).toBe(
      "vía newsletter · email",
    );
    expect(formatBookingCampaign({ referrerHost: "google.com" }, "en")).toBe("via google.com");
    expect(formatBookingCampaign({}, "en")).toBeNull();
  });
});

describe("BookingCampaignBadge", () => {
  it("renders nothing for an untagged booking", () => {
    expect(renderToStaticMarkup(<BookingCampaignBadge lang="en" />)).toBe("");
  });

  it("shows the full tags on hover", () => {
    const html = renderToStaticMarkup(
      <BookingCampaignBadge lang="en" campaign={{ source: "instagram", campaign: "fall" }} />,
    );
    expect(html).toContain("via instagram · fall");
    expect(html).toContain("utm_source=instagram · utm_campaign=fall");
  });
});
