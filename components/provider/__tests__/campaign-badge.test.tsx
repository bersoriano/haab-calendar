import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CampaignBadge } from "@/components/provider/CampaignBadge";
import { BookingRetentionNotice } from "@/components/provider/BookingRetentionSettings";
import { dashboardCopy } from "@/components/provider/dashboard-copy";

describe("CampaignBadge", () => {
  it("shows where the client came from on the app badge", () => {
    const html = renderToStaticMarkup(
      <CampaignBadge campaign={{ source: "instagram", campaign: "fall" }} lang="en" />,
    );
    expect(html).toContain("via instagram · fall");
    expect(html).toContain("bg-app-info-soft");
    expect(html).toContain('title="utm_source=instagram · utm_campaign=fall"');
  });

  it("renders nothing without a campaign", () => {
    expect(renderToStaticMarkup(<CampaignBadge lang="en" />)).toBe("");
    expect(renderToStaticMarkup(<CampaignBadge campaign={{}} lang="en" />)).toBe("");
  });
});

describe("BookingRetentionNotice", () => {
  it("is an info alert with a way to the setting", () => {
    const html = renderToStaticMarkup(
      <BookingRetentionNotice lang="es" policy="month" onOpenSettings={() => undefined} />,
    );
    expect(html).toContain("bg-app-info-soft");
    expect(html).toContain(dashboardCopy.es.retentionMonth);
    expect(html).toContain(dashboardCopy.es.retentionDefaultOff);
    expect(html).toMatch(new RegExp(`<button[^>]*>${dashboardCopy.es.retentionManage}</button>`));
  });
});
