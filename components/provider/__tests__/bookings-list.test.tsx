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
  it("puts its headings directly under the page's h1", () => {
    // The section has no h2 of its own: group and empty-state headings are h2s.
    expect(render()).not.toContain("<h3");
    expect(render({ bookings: [] })).toMatch(/<h2[^>]*>/);
    expect(render({ bookings: [] })).not.toContain("<h3");
  });

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

  it("offers no actions on a cancelled booking", () => {
    const html = render({ bookings: [bookings[1]], totalCount: 1 });

    expect(html).not.toContain(`>${en.common.cancel}<`);
    expect(html).not.toContain(`>${en.publicFlow.reschedule}<`);
    expect(html).toContain(en.admin.cancelled);
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

  it("points to matches in the other view while a search or filter is on", () => {
    const found = render({ search: "jose", bookings: [], otherViewMatches: 2 });
    expect(found).toMatch(/<button[^>]*>(?:(?!<\/button>).)*2 more in Archive/);

    const fromArchive = render({ view: "archive", status: "cancelled", otherViewMatches: 1 });
    expect(fromArchive).toMatch(/<button[^>]*>(?:(?!<\/button>).)*1 more in Active/);

    // Nothing to point at, or nothing being searched: no pointer.
    expect(render({ search: "jose", otherViewMatches: 0 })).not.toContain("more in");
    expect(render({ otherViewMatches: 3 })).not.toContain("more in");
    expect(render({ lang: "es", search: "jose", otherViewMatches: 2 })).toContain("2 más en Archivo");
  });

  describe("review flag", () => {
    const review = {
      filter: "all" as const,
      onFilterChange: () => undefined,
      pendingIds: new Set<string>(),
      onToggle: () => undefined,
    };
    const seenAt = "2026-10-08T09:00:00.000Z";
    const mixed = [
      booking({ id: "new", clientName: "Ana Ruiz" }),
      booking({ id: "seen", clientName: "Bo Diaz", reviewedAt: seenAt }),
    ];
    /** One booking's row, so a button is read against the right client. */
    const rowOf = (html: string, name: string) => html.match(new RegExp(`<li[^>]*>(?:(?!</li>)[\\s\\S])*${name}(?:(?!</li>)[\\s\\S])*</li>`))?.[0] ?? "";

    it("is absent where bookings are not reviewed", () => {
      const html = render({ bookings: mixed });

      expect(html).not.toContain("Mark as seen");
      expect(html).not.toContain("Mark as new");
      expect(html).not.toContain(dashboardCopy.en.review.filterLabel);
    });

    it("badges a new booking and offers to mark it as seen", () => {
      const row = rowOf(render({ bookings: mixed, review }), "Ana Ruiz");

      expect(row).toMatch(/<span[^>]*>(?:<span[^>]*><\/span>)?New<\/span>/);
      expect(row).toContain("Mark as seen");
      expect(row).not.toContain("Mark as new");
    });

    it("drops the badge once seen and offers to mark it as new again", () => {
      const row = rowOf(render({ bookings: mixed, review }), "Bo Diaz");

      expect(row).not.toMatch(/>New</);
      expect(row).toContain("Mark as new");
      expect(row).not.toContain("Mark as seen");
    });

    it("lets a new booking be marked as seen even when cancelled, past or archived", () => {
      const archived = rowOf(render({ bookings: mixed, review, view: "archive" }), "Ana Ruiz");
      expect(archived).toContain("Mark as seen");
      expect(archived).not.toContain(en.publicFlow.reschedule);

      const cancelled = rowOf(
        render({ bookings: [booking({ id: "x", clientName: "Cy Lee", status: "cancelled" })], review }),
        "Cy Lee",
      );
      expect(cancelled).toContain("Mark as seen");

      const past = rowOf(
        render({ bookings: [booking({ id: "p", clientName: "Di Mar", dateKey: "2026-10-07" })], review }),
        "Di Mar",
      );
      expect(past).toContain("Mark as seen");
    });

    it("does not let a cancelled or past booking go back to new", () => {
      const seen = (overrides: Parameters<typeof booking>[0]) =>
        rowOf(render({ bookings: [booking({ clientName: "Di Mar", reviewedAt: seenAt, ...overrides })], review }), "Di Mar");

      // Today (the list's todayKey is 2026-10-08) and later can.
      expect(seen({ dateKey: "2026-10-08" })).toContain("Mark as new");
      expect(seen({ dateKey: "2026-10-09" })).toContain("Mark as new");
      expect(seen({ dateKey: "2026-10-07" })).not.toContain("Mark as");
      expect(seen({ dateKey: "2026-10-09", status: "cancelled" })).not.toContain("Mark as");
    });

    it("shows a flag being saved as busy", () => {
      const row = rowOf(render({ bookings: mixed, review: { ...review, pendingIds: new Set(["new"]) } }), "Ana Ruiz");
      expect(row).toMatch(/<button[^>]*disabled=""[^>]*>(?:(?!<\/button>)[\s\S])*Mark as seen/);
    });

    it("filters by new or seen, and counts that as a filter to clear", () => {
      const html = render({ bookings: mixed, review: { ...review, filter: "new" } });

      expect(html).toMatch(
        new RegExp(`<select[^>]*aria-label="${dashboardCopy.en.review.filterLabel}"[^>]*>(?:(?!</select>)[\\s\\S])*<option value="new" selected="">New</option>`),
      );
      expect(html).toContain(dashboardCopy.en.clearFilters);
      expect(render({ bookings: mixed, review })).not.toContain(dashboardCopy.en.clearFilters);
    });

    it("is worded in Spanish", () => {
      const html = render({ bookings: mixed, review, lang: "es" });

      expect(html).toContain("Marcar como revisado");
      expect(html).toContain("Sin revisar");
      expect(html).not.toContain("Mark as seen");
    });
  });

  describe("row layout", () => {
    /** The action slots of one row, in order: what each holds, or "" when empty. */
    const slotsOf = (html: string, name: string) => {
      const row = html.match(new RegExp(`<li[^>]*>(?:(?!</li>)[\\s\\S])*${name}(?:(?!</li>)[\\s\\S])*</li>`))?.[0] ?? "";
      return [...row.matchAll(/<div data-slot="([a-z]+)"[^>]*>((?:(?!<\/div>)[\s\S])*)<\/div>/g)].map(
        ([, slot, content]) => `${slot}:${content.replace(/<[^>]+>/g, "").trim()}`,
      );
    };
    const review = {
      filter: "all" as const,
      onFilterChange: () => undefined,
      pendingIds: new Set<string>(),
      onToggle: () => undefined,
    };

    it("gives every row the same action slots, in the same order, whatever it can do", () => {
      const html = render({
        review,
        bookings: [
          booking({ id: "1", clientName: "Ana Ruiz" }),
          booking({ id: "2", clientName: "Bo Diaz", status: "cancelled", reviewedAt: "2026-10-08T09:00:00.000Z" }),
          booking({ id: "3", clientName: "Cy Lee", dateKey: "2026-10-07", reviewedAt: "2026-10-08T09:00:00.000Z" }),
        ],
        canReschedule: (candidate) => candidate.id !== "3",
      });

      expect(slotsOf(html, "Ana Ruiz")).toEqual(["review:Mark as seen", "reschedule:Reschedule", "cancel:Cancel"]);
      // Nothing to do on a cancelled booking that was already seen: the slots stay, empty.
      expect(slotsOf(html, "Bo Diaz")).toEqual(["review:", "reschedule:", "cancel:"]);
      expect(slotsOf(html, "Cy Lee")).toEqual(["review:", "reschedule:", "cancel:Cancel"]);
    });

    it("keeps the slots where bookings are not reviewed, with the first one empty", () => {
      expect(slotsOf(render(), "Ana Ruiz")).toEqual(["review:", "reschedule:Reschedule", "cancel:Cancel"]);
    });

    it("shares one set of columns across every row and date group", () => {
      const html = render();
      const table = html.match(/<div class="([^"]*grid-cols-\[8\.5rem[^"]*)"/)?.[1] ?? "";

      // One grid for the whole list; groups, lists and rows only borrow its columns.
      expect(table).toContain("auto_auto_auto");
      expect(html.match(/grid-cols-\[8\.5rem/g)).toHaveLength(1);
      for (const row of html.match(/<li[^>]*>/g) ?? []) {
        expect(row).toContain("grid-cols-subgrid");
      }
    });

    it("hides an empty slot where rows stack, so it leaves no gap", () => {
      const html = render({ bookings: [booking({ id: "2", clientName: "Bo Diaz", status: "cancelled" })] });
      const row = html.match(/<li[\s\S]*?<\/li>/)?.[0] ?? "";

      for (const slot of row.match(/<div data-slot="[a-z]+"[^>]*>/g) ?? []) {
        expect(slot).toMatch(/@max-\[[a-z0-9]+\]:hidden/);
      }
    });
  });

  it("leaves scanning to its own section", () => {
    expect(render()).not.toContain(en.admin.scanAppointment);
  });

  it("exposes archive navigation and labeled date sorting in both languages", () => {
    for (const lang of ["en", "es"] as const) {
      const html = render({ lang, archiveCount: 5 });
      expect(html).toContain(`aria-label="${dashboardCopy[lang].sortBookingsLabel}"`);
      expect(html).toMatch(/role="radio"[^>]*aria-checked="true"|aria-checked="true"[^>]*role="radio"/);
      expect(html).toContain(dashboardCopy[lang].archivedBookings);
      expect(html).toContain(`value="sooner"`);
      expect(html).toContain(`value="latest"`);
    }
  });

  it("distinguishes empty active and archive views from empty searches", () => {
    expect(render({ bookings: [], totalCount: 0, activeCount: 0, archiveCount: 3 })).toContain(dashboardCopy.en.noActiveBookingsTitle);
    expect(render({ bookings: [], totalCount: 0, view: "archive" })).toContain(dashboardCopy.en.noArchivedBookingsTitle);
  });

  it("offers no booking mutations in the archive", () => {
    const html = render({ view: "archive", bookings: [bookings[0]] });
    expect(html).not.toContain(`>${en.common.cancel}<`);
    expect(html).not.toContain(`>${en.publicFlow.reschedule}<`);
  });

  it("labels each day group with a sticky heading", () => {
    const html = render();
    // A group, not a landmark per day: long lists would flood landmark navigation.
    expect(html).toMatch(/<div role="group" aria-labelledby="bookings-2026-10-08"[^>]*><h2[^>]*id="bookings-2026-10-08"[^>]*sticky/);
  });

  it("shows saved history policy and a path to settings", () => {
    expect(render({ retentionPolicy: "month", onOpenRetentionSettings: () => {} })).toContain(dashboardCopy.en.retentionMonth);
    expect(render({ retentionPolicy: "year", onOpenRetentionSettings: () => {} })).toContain(dashboardCopy.en.retentionYear);
    expect(render({ retentionPolicy: "year", onOpenRetentionSettings: () => {} })).toContain(dashboardCopy.en.retentionManage);
  });
});
