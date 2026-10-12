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
    expect(html).not.toContain("<details");
  });

  describe("folded away above the list", () => {
    const render = (policy: "month" | "year" | "unknown", lang: "en" | "es" = "es") =>
      renderToStaticMarkup(
        <BookingRetentionNotice lang={lang} policy={policy} onOpenSettings={() => undefined} collapsible />,
      );

    it("is closed, and its one line says how long history is kept", () => {
      const html = render("month");
      const summary = html.slice(html.indexOf("<summary"), html.indexOf("</summary>"));

      expect(html).toMatch(/<details data-retention-notice="true" class="[^"]*bg-app-info-soft/);
      expect(html).not.toMatch(/<details[^>]* open/);
      expect(summary).toContain(dashboardCopy.es.retentionTitle);
      expect(summary).toContain(dashboardCopy.es.retentionKeptMonth);
      expect(summary).not.toContain(dashboardCopy.es.retentionMonth);
      expect(render("year", "en")).toContain(dashboardCopy.en.retentionKeptYear);
    });

    it("keeps the whole policy and the way to the setting inside", () => {
      const html = render("month");
      const body = html.slice(html.indexOf("</summary>"));

      expect(body).toContain(dashboardCopy.es.retentionMonth);
      expect(body).toContain(dashboardCopy.es.retentionDateHint);
      expect(body).toContain(dashboardCopy.es.retentionDefaultOff);
      expect(body).toMatch(new RegExp(`<button[^>]*>${dashboardCopy.es.retentionManage}</button>`));
    });

    it("opens by itself when the policy could not be verified", () => {
      const html = render("unknown");

      expect(html).toMatch(/<details[^>]* open/);
      expect(html).toContain(dashboardCopy.es.retentionKeptUnknown);
      expect(html).toContain(dashboardCopy.es.retentionUnknown);
    });
  });
});
