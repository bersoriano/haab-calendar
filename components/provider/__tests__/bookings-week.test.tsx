import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BookingsWeek } from "@/components/provider/BookingsWeek";
import type { BookingRecord, BookingStatus, Lang } from "@/lib/types";
import { getVerticalCopy } from "@/lib/vertical-copy";

function booking(
  dateKey: string,
  startTime: string | undefined,
  overrides: Partial<BookingRecord> = {},
): BookingRecord {
  const status: BookingStatus = overrides.status ?? "confirmed";

  return {
    id: `${dateKey}-${startTime ?? "day"}-${status}`,
    serviceId: "s1",
    serviceName: "Checkup",
    bookingType: startTime ? "appointment" : "full-day",
    dateKey,
    startTime,
    endTime: startTime ? `${startTime.slice(0, 2)}:30` : undefined,
    clientName: "Ana Ruiz",
    clientEmail: "ana@example.invalid",
    clientPhone: "555 0100",
    notes: "",
    cost: "",
    status,
    createdAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  } as BookingRecord;
}

// Today is Monday October 12, in the week of Sunday the 11th to Saturday the 17th.
const bookings = [
  booking("2026-10-13", "15:00", { clientName: "Luis Ortega" }),
  booking("2026-10-13", "09:00"),
  booking("2026-10-14", undefined, { serviceName: "Retreat" }),
  booking("2026-10-14", "16:00", { status: "cancelled", clientName: "Cancelled Client" }),
  booking("2026-10-20", "09:00", { clientName: "Next Week" }),
];

function render(lang: Lang = "en") {
  return renderToStaticMarkup(
    <BookingsWeek
      lang={lang}
      copy={getVerticalCopy("healthcare", lang)}
      bookings={bookings}
      todayKey="2026-10-12"
    />,
  );
}

function day(html: string, dateKey: string) {
  const found = html.match(new RegExp(`<li[^>]*data-date="${dateKey}"[\\s\\S]*?(?=<li[^>]*data-date=|</ol>)`));
  if (!found) throw new Error(`no day for ${dateKey}`);
  return found[0];
}

describe("BookingsWeek", () => {
  it("opens on today's week, named by the days it runs between", () => {
    const html = render();

    expect(html).toMatch(/<h2 id="bookings-week-label"[^>]*>Oct 11\s–\s17, 2026<\/h2>/);
    expect(html).toContain('data-week-start="2026-10-11"');
    expect(render("es")).toMatch(/<h2 id="bookings-week-label"[^>]*>11–17 oct 2026<\/h2>/);
  });

  it("counts the week's bookings in the vertical's words", () => {
    expect(render()).toContain("3 appointments in the week of Oct 11");
    expect(render("es")).toContain("3 citas en la semana del 11 oct");
  });

  it("lists the seven days, named by the week, and marks today", () => {
    const html = render();

    expect(html).toMatch(/<ol[^>]*aria-labelledby="bookings-week-label"/);
    expect(html.match(/data-date="/g)).toHaveLength(7);
    expect(day(html, "2026-10-12")).toContain('aria-current="date"');
    expect(html.match(/aria-current="date"/g)).toHaveLength(1);
  });

  it("names each day in full for a screen reader", () => {
    expect(day(render(), "2026-10-13")).toContain("Tuesday, October 13, 2026");
  });

  it("shows every booking of a day, earliest first, with its time, client and service", () => {
    const tuesday = day(render(), "2026-10-13");

    expect(tuesday).toMatch(/data-count[^>]*>2<span class="sr-only"> appointments<\/span>/);
    expect(tuesday).toContain("9:00 – 9:30 AM");
    expect(tuesday).toContain("3:00 – 3:30 PM");
    expect(tuesday.indexOf("Ana Ruiz")).toBeLessThan(tuesday.indexOf("Luis Ortega"));
    expect(tuesday).toContain("Checkup");
  });

  it("says a full-day booking takes the day", () => {
    const wednesday = day(render(), "2026-10-14");

    expect(wednesday).toContain("Full Day");
    expect(wednesday).toContain("Retreat");
  });

  it("leaves out cancelled bookings and the bookings of other weeks", () => {
    const html = render();

    expect(html).not.toContain("Cancelled Client");
    expect(html).not.toContain("Next Week");
    expect(day(html, "2026-10-14")).toMatch(/data-count[^>]*>1</);
  });

  it("says so when a day has nothing booked", () => {
    const monday = day(render(), "2026-10-12");

    expect(monday).toContain("Nothing booked");
    expect(monday).not.toContain("data-count");
    expect(day(render("es"), "2026-10-12")).toContain("Sin nada agendado");
  });

  it("is for reading: a day cannot be pressed, and nothing books, moves or cancels", () => {
    const html = render();
    const days = html.slice(html.indexOf("<ol"));

    expect(days).not.toContain("<button");
    expect(days).not.toContain("<a ");
    // The only controls turn the week.
    expect(html.match(/<button/g)).toHaveLength(3);
  });
});
