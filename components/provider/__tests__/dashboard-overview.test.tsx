import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { DashboardOverview } from "@/components/provider/DashboardOverview";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import type { NextStep } from "@/lib/dashboard-overview";
import type { BookingRecord } from "@/lib/types";
import { getVerticalCopy } from "@/lib/vertical-copy";

const en = bookingTranslations.en;

const booking: BookingRecord = {
  id: "b1",
  serviceId: "s1",
  serviceName: "Consultation",
  bookingType: "appointment",
  dateKey: "2026-10-09",
  startTime: "10:00",
  endTime: "10:30",
  clientName: "Ana Ruiz",
  clientEmail: "ana@example.com",
  clientPhone: "+52 55 0000 0000",
  notes: "",
  capacitySnapshot: "1 person",
  cost: "$40",
  status: "confirmed",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  manageToken: "token",
};

function render(
  props: Partial<Parameters<typeof DashboardOverview>[0]> = {},
) {
  return renderToStaticMarkup(
    <DashboardOverview
      lang="en"
      copy={getVerticalCopy("healthcare", "en")}
      stats={{ upcoming: 1, services: 2, confirmed: 3, total: 9 }}
      upcomingBookings={[booking]}
      canReschedule={() => true}
      onReschedule={() => undefined}
      onCancel={() => undefined}
      onSeeAllBookings={() => undefined}
      publicUrl="/doctors/ana"
      copiedLink={false}
      onCopyLink={() => undefined}
      nextSteps={[]}
      onGoToSection={() => undefined}
      {...props}
    />,
  );
}

describe("DashboardOverview", () => {
  it("shows the four numbers", () => {
    const html = render();

    expect(html).toContain(en.admin.upcoming7Days);
    expect(html).toContain(">9<");
    expect(html).toContain(en.admin.allTimeEveryStatus);
  });

  it("keeps every detail of an upcoming booking", () => {
    const html = render();

    for (const text of ["Ana Ruiz", "Consultation", "1 person", "$40"]) {
      expect(html).toContain(text);
    }
    expect(html).toContain(en.publicFlow.reschedule);
    expect(html).toContain(en.common.cancel);
  });

  it("hides reschedule where the booking cannot move", () => {
    expect(render({ canReschedule: () => false })).not.toContain(en.publicFlow.reschedule);
  });

  it("says when nothing is coming up", () => {
    const copy = getVerticalCopy("healthcare", "en");
    expect(render({ upcomingBookings: [] })).toContain(copy.phrases.upcomingEmptyTitle);
  });

  it("puts the booking page one click away", () => {
    const html = render();

    expect(html).toContain(dashboardCopy.en.bookingPageTitle);
    expect(html).toContain('href="/doctors/ana"');
    expect(html).toContain(en.publicFlow.copyLink);
    expect(html).toContain(dashboardCopy.en.pageLive);
  });

  describe("new bookings", () => {
    const professional = getVerticalCopy("professional", "en");

    it("announces how many are new, with a way to review them", () => {
      const html = render({ copy: professional, newBookings: { count: 3, onReview: () => undefined } });

      expect(html).toContain("3 new appointments");
      expect(html).toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*Review/);
      expect(render({ copy: professional, newBookings: { count: 1, onReview: () => undefined } })).toContain(
        "1 new appointment<",
      );
    });

    it("says nothing when none are new, or where bookings are not reviewed", () => {
      expect(render({ copy: professional, newBookings: { count: 0, onReview: () => undefined } })).not.toContain(
        "new appointment",
      );
      expect(render()).not.toContain("new appointment");
    });

    it("badges the upcoming bookings that are still new", () => {
      const newBookings = { count: 1, onReview: () => undefined };

      expect(render({ newBookings })).toMatch(/>New<\/span>/);
      expect(
        render({ newBookings, upcomingBookings: [{ ...booking, reviewedAt: "2026-10-08T09:00:00.000Z" }] }),
      ).not.toMatch(/>New<\/span>/);
      // Without review, an unreviewed booking is just a booking.
      expect(render()).not.toMatch(/>New<\/span>/);
    });

    it("is worded in Spanish", () => {
      const html = render({
        lang: "es",
        copy: getVerticalCopy("professional", "es"),
        newBookings: { count: 2, onReview: () => undefined },
      });

      expect(html).toContain("2 citas sin revisar");
      expect(html).toContain("Revisar");
    });
  });

  it("shows no checklist when nothing is missing", () => {
    expect(render()).not.toContain(dashboardCopy.en.nextStepsTitle);
  });

  it("lists what is missing, with a way to fix what the owner can fix", () => {
    const steps: NextStep[] = [
      { id: "add-service", section: "services" },
      { id: "publishing-off" },
    ];
    const html = render({ nextSteps: steps, publishingEnabled: false });

    expect(html).toContain(dashboardCopy.en.nextStepsTitle);
    expect(html).toContain(dashboardCopy.en.nextSteps["add-service"].cta);
    expect(html).toContain(
      dashboardCopy.en.nextSteps["publishing-off"].title.replaceAll("'", "&#x27;"),
    );
    expect(html).toContain(dashboardCopy.en.publishingOff);
  });

  it("is written in the owner's workspace language", () => {
    const html = render({ lang: "es", copy: getVerticalCopy("healthcare", "es") });

    expect(html).toContain(bookingTranslations.es.admin.upcoming7Days);
    expect(html).toContain(dashboardCopy.es.bookingPageTitle);
    expect(html).not.toContain(dashboardCopy.en.bookingPageTitle);
  });

  it("links the upcoming and services stats to their sections", () => {
    const html = render();
    expect(html).toMatch(/<a[^>]*href="\/dashboard\/bookings"[^>]*>View all<span class="sr-only"> /);
    expect(html).toMatch(/<a[^>]*href="\/dashboard\/services"[^>]*>View all<span class="sr-only"> /);
  });

  it("copies the booking link from a named button beside the URL", () => {
    const html = render();
    expect(html).toMatch(new RegExp(`<button[^>]*aria-label="${en.publicFlow.copyLink}"`));
    expect(html).toContain('value="/doctors/ana"');
    expect(html).toMatch(/readonly=""/i);
  });

  /**
   * A draft kept in the browser: nothing is live, its link is a 404, and the
   * bookings section is not offered, so nothing here may point at either.
   */
  describe("for a draft that is not published", () => {
    const draft = { onPreview: () => undefined };

    it("says the page is not published and offers the preview, not the link", () => {
      const html = render({ draft });

      expect(html).toContain(dashboardCopy.en.pageDraft);
      expect(html).not.toContain(dashboardCopy.en.pageLive);
      expect(html).toContain("/doctors/ana");
      expect(html).toMatch(/<button[^>]*>Preview booking page<\/button>/);
      expect(html).not.toContain('href="/doctors/ana"');
      expect(html).not.toContain(en.publicFlow.copyLink);
    });

    it("does not lead to the bookings section", () => {
      const html = render({ draft });

      expect(html).not.toContain('href="/dashboard/bookings"');
      expect(html).not.toContain(dashboardCopy.en.seeAll);
      // The sections a draft does offer keep their links.
      expect(html).toContain('href="/dashboard/services"');
    });

    it("keeps both for a published page", () => {
      const html = render();

      expect(html).toContain('href="/dashboard/bookings"');
      expect(html).toContain(dashboardCopy.en.seeAll);
      expect(html).toContain('href="/doctors/ana"');
    });
  });
});
