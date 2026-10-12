import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BookingsMonth } from "@/components/provider/BookingsMonth";
import type { BookingRecord, BookingStatus, Lang } from "@/lib/types";
import { getVerticalCopy } from "@/lib/vertical-copy";

function booking(
  dateKey: string,
  startTime: string | undefined,
  status: BookingStatus = "confirmed",
): BookingRecord {
  return {
    id: `${dateKey}-${startTime ?? "day"}-${status}`,
    serviceId: "s1",
    serviceName: "Checkup",
    bookingType: startTime ? "appointment" : "full-day",
    dateKey,
    startTime,
    clientName: "Ana Ruiz",
    clientEmail: "ana@example.invalid",
    clientPhone: "555 0100",
    notes: "",
    cost: "",
    status,
    createdAt: "2026-10-01T00:00:00.000Z",
  } as BookingRecord;
}

const bookings = [
  ...["09:00", "10:00", "11:00", "12:00", "13:00"].map((time) => booking("2026-10-13", time)),
  booking("2026-10-14", "09:30"),
  booking("2026-10-14", "16:00", "cancelled"),
  booking("2026-11-02", "09:00"),
];

function render(lang: Lang = "en") {
  return renderToStaticMarkup(
    <BookingsMonth
      lang={lang}
      copy={getVerticalCopy("healthcare", lang)}
      bookings={bookings}
      todayKey="2026-10-12"
    />,
  );
}

function cell(html: string, dateKey: string) {
  const found = html.match(new RegExp(`<td[^>]*data-date="${dateKey}"[\\s\\S]*?</td>`));
  if (!found) throw new Error(`no cell for ${dateKey}`);
  return found[0];
}

describe("BookingsMonth", () => {
  it("opens on today's month and counts its bookings in the vertical's words", () => {
    const html = render();

    expect(html).toContain("October 2026");
    expect(html).toContain("6 appointments in October 2026");
    expect(render("es")).toContain("6 citas en octubre de 2026");
  });

  it("is a table of weeks under their weekdays, named by the month", () => {
    const html = render();

    expect(html).toMatch(/<table[^>]*aria-labelledby="bookings-month-label"/);
    expect(html.match(/<th scope="col"/g)).toHaveLength(7);
    expect(html.match(/<td /g)).toHaveLength(35);
  });

  it("marks today", () => {
    const html = render();

    expect(cell(html, "2026-10-12")).toContain('aria-current="date"');
    expect(html.match(/aria-current="date"/g)).toHaveLength(1);
  });

  it("says how many bookings a day holds, and shades it for how full it is", () => {
    const html = render();

    expect(cell(html, "2026-10-13")).toContain('data-level="4"');
    expect(cell(html, "2026-10-13")).toMatch(/data-count[^>]*>5<span class="sr-only"> appointments<\/span>/);
    expect(cell(html, "2026-10-14")).toContain('data-level="1"');
    expect(cell(html, "2026-10-14")).toMatch(/data-count[^>]*>1<span class="sr-only"> appointment<\/span>/);
  });

  it("leaves an empty day unshaded and uncounted", () => {
    const empty = cell(render(), "2026-10-12");

    expect(empty).toContain('data-level="0"');
    expect(empty).not.toContain("data-count");
  });

  it("names the first bookings of a day and counts the rest", () => {
    const busy = cell(render(), "2026-10-13");

    expect(busy).toContain("9:00 AM");
    expect(busy).toContain("11:00 AM");
    expect(busy).not.toContain("12:00 PM");
    expect(busy).toContain("+2 more");
    expect(busy).toContain("Checkup");
  });

  it("does not count a cancelled booking", () => {
    expect(cell(render(), "2026-10-14")).not.toContain("4:00 PM");
  });

  it("names each day in full for a screen reader", () => {
    expect(cell(render(), "2026-10-13")).toContain("Tuesday, October 13, 2026");
  });

  it("is for reading: a day cannot be pressed, and nothing books, moves or cancels", () => {
    const html = render();
    const grid = html.slice(html.indexOf("<table"));

    expect(grid).not.toContain("<button");
    expect(grid).not.toContain("<a ");
    // The only controls turn the month.
    expect(html.match(/<button/g)).toHaveLength(3);
    for (const label of ["Previous", "Today", "Next"]) {
      expect(html).toContain(label);
    }
  });
});
