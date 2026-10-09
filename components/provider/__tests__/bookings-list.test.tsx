import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { BookingsList } from "@/components/provider/BookingsList";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import type { BookingRecord } from "@/lib/types";
import { getVerticalCopy } from "@/lib/vertical-copy";

const en = bookingTranslations.en;
const copy = getVerticalCopy("restaurant", "en");

function booking(overrides: Partial<BookingRecord>): BookingRecord {
  return {
    id: "b1",
    serviceId: "s1",
    serviceName: "Dinner",
    bookingType: "appointment",
    dateKey: "2026-10-08",
    startTime: "19:00",
    endTime: "21:00",
    clientName: "Ana Ruiz",
    clientEmail: "ana@example.com",
    clientPhone: "+52 55 0000 0000",
    notes: "",
    cost: "$40",
    status: "confirmed",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    manageToken: "token",
    ...overrides,
  };
}

const bookings = [
  booking({ id: "a", clientName: "Ana Ruiz", partySize: 4, dateOfBirth: "1990-05-01" }),
  booking({ id: "b", clientName: "Bo Diaz", dateKey: "2026-10-09", status: "cancelled" }),
  booking({ id: "c", clientName: "Cy Lee", dateKey: "2026-10-15", capacitySnapshot: "2 seats" }),
];

function render(props: Partial<Parameters<typeof BookingsList>[0]> = {}) {
  return renderToStaticMarkup(
    <BookingsList
      lang="en"
      copy={copy}
      bookings={bookings}
      totalCount={bookings.length}
      activeCount={bookings.length}
      archiveCount={0}
      view="active"
      onViewChange={() => undefined}
      sort="closest"
      onSortChange={() => undefined}
      todayKey="2026-10-08"
      search=""
      onSearchChange={() => undefined}
      status="all"
      onStatusChange={() => undefined}
      type="all"
      onTypeChange={() => undefined}
      onClearFilters={() => undefined}
      canReschedule={() => true}
      onReschedule={() => undefined}
      onCancel={() => undefined}
      {...props}
    />,
  );
}

describe("BookingsList", () => {
  it("labels every filter for assistive tech", () => {
    const html = render();

    expect(html).toContain(`aria-label="${copy.phrases.searchPlaceholder}"`);
    expect(html).toContain(`aria-label="${dashboardCopy.en.statusFilterLabel}"`);
    expect(html).toContain(`aria-label="${dashboardCopy.en.typeFilterLabel}"`);
  });

  it("groups bookings under date headings, naming today and tomorrow", () => {
    const html = render();

    expect(html).toContain(dashboardCopy.en.today);
    expect(html).toContain(dashboardCopy.en.tomorrow);
    expect(html.indexOf("Ana Ruiz")).toBeLessThan(html.indexOf("Bo Diaz"));
    expect(html.indexOf("Bo Diaz")).toBeLessThan(html.indexOf("Cy Lee"));
  });

  it("keeps every booking detail", () => {
    const html = render();

    for (const text of ["ana@example.com", "+52 55 0000 0000", "$40", "2 seats", en.publicFlow.dateOfBirth]) {
      expect(html).toContain(text);
    }
    expect(html).toContain(`4 ${en.admin.guestsSuffix}`);
  });

  it("disables actions on a cancelled booking", () => {
    const html = render({ bookings: [bookings[1]], totalCount: 1 });

    expect(html.match(/disabled=""/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("hides reschedule where the booking cannot move", () => {
    // Matched as a whole text node: the status filter also says "Rescheduled".
    expect(render()).toContain(`>${en.publicFlow.reschedule}<`);
    expect(render({ canReschedule: () => false })).not.toContain(`>${en.publicFlow.reschedule}<`);
  });

  it("counts results and offers to clear active filters", () => {
    const filtered = render({ bookings: [bookings[0]], status: "confirmed" });

    expect(filtered).toContain("1 of 3");
    expect(filtered).toContain(dashboardCopy.en.clearFilters);
    expect(render()).not.toContain(dashboardCopy.en.clearFilters);
  });

  it("tells an empty page apart from an empty search", () => {
    expect(render({ bookings: [], totalCount: 0, activeCount: 0 })).toContain(dashboardCopy.en.noBookingsYetTitle);

    const noMatch = render({ bookings: [], search: "zzz" });
    expect(noMatch).toContain(copy.phrases.noBookingsMatchTitle);
    expect(noMatch).not.toContain(dashboardCopy.en.noBookingsYetTitle);
  });

  it("offers the scanner only where it works", () => {
    expect(render()).not.toContain(en.admin.scanAppointment);
    expect(render({ onScan: () => undefined })).toContain(en.admin.scanAppointment);
  });

  it("exposes archive navigation and labeled date sorting in both languages", () => {
    for (const lang of ["en", "es"] as const) {
      const html = render({ lang, archiveCount: 5 });
      expect(html).toContain(`aria-label="${dashboardCopy[lang].sortBookingsLabel}"`);
      expect(html).toContain(`aria-pressed="true"`);
      expect(html).toContain(dashboardCopy[lang].archivedBookings);
      expect(html).toContain(`value="sooner"`);
      expect(html).toContain(`value="latest"`);
    }
  });

  it("distinguishes empty active and archive views from empty searches", () => {
    expect(render({ bookings: [], totalCount: 0, activeCount: 0, archiveCount: 3 })).toContain(dashboardCopy.en.noActiveBookingsTitle);
    expect(render({ bookings: [], totalCount: 0, view: "archive" })).toContain(dashboardCopy.en.noArchivedBookingsTitle);
  });

  it("disables booking mutations in archive", () => {
    const html = render({ view: "archive", bookings: [bookings[0]] });
    expect(html.match(/disabled=""/g)?.length).toBe(2);
  });

  it("shows saved history policy and a path to settings", () => {
    expect(render({ retentionPolicy: "month", onOpenRetentionSettings: () => {} })).toContain(dashboardCopy.en.retentionMonth);
    expect(render({ retentionPolicy: "year", onOpenRetentionSettings: () => {} })).toContain(dashboardCopy.en.retentionYear);
    expect(render({ retentionPolicy: "year", onOpenRetentionSettings: () => {} })).toContain(dashboardCopy.en.retentionManage);
  });
});
