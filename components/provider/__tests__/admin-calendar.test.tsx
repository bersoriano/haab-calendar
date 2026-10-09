import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { AdminCalendar, type AdminCalendarDay } from "@/components/provider/AdminCalendar";
import { getVerticalCopy } from "@/lib/vertical-copy";

const en = bookingTranslations.en;
const noop = () => undefined;

function day(dateKey: string, overrides: Partial<AdminCalendarDay> = {}): AdminCalendarDay {
  return {
    dateKey,
    dayOfMonth: Number(dateKey.slice(-2)),
    inMonth: true,
    isToday: false,
    open: false,
    bookings: [],
    ...overrides,
  };
}

const busy = Array.from({ length: 5 }, (_, index) => ({
  id: `b${index}`,
  type: "appointment" as const,
  label: `${9 + index}:00 AM`,
  serviceName: "Checkup",
}));

const week = [
  day("2026-10-11", { inMonth: true }),
  day("2026-10-12", { isToday: true, open: true }),
  day("2026-10-13", { bookings: busy }),
  day("2026-10-14"),
  day("2026-10-15"),
  day("2026-10-16"),
  day("2026-10-17"),
];

function render() {
  return renderToStaticMarkup(
    <AdminCalendar
      lang="en"
      copy={getVerticalCopy("healthcare", "en")}
      monthLabel="October 2026"
      weekdayLabels={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}
      weeks={[week]}
      services={[{ id: "s1", name: "Checkup" }]}
      selectedServiceId="s1"
      onServiceChange={noop}
      onPrevious={noop}
      onToday={noop}
      onNext={noop}
      onOpenDay={noop}
    />,
  );
}

describe("AdminCalendar", () => {
  const html = render();

  it("names the month and the weekdays", () => {
    expect(html).toMatch(/<h2[^>]*aria-live="polite"[^>]*>October 2026<\/h2>/);
    for (const label of ["Sun", "Mon", "Sat"]) expect(html).toContain(`>${label}<`);
  });

  it("only lets open days start a booking", () => {
    const buttons = html.match(/<button[^>]*data-date="[^"]+"[^>]*>/g) ?? [];
    expect(buttons).toHaveLength(7);
    expect(buttons.filter((tag) => !tag.includes("disabled"))).toHaveLength(1);
    expect(html).toContain(en.publicFlow.open);
  });

  it("marks today", () => {
    expect(html).toMatch(/data-date="2026-10-12"[^>]*aria-current="date"|aria-current="date"[^>]*data-date="2026-10-12"/);
  });

  it("shows three bookings and a count for the rest", () => {
    expect(html.match(/>(9|10|11|12|13):00 AM</g)).toHaveLength(3);
    expect(html).not.toContain(">12:00 AM<");
    expect(html).not.toContain(">13:00 AM<");
    expect(html).toContain('+2<span class="sr-only"> more</span>');
  });

  it("labels the new-booking service picker", () => {
    expect(html).toContain(`aria-label="${en.admin.newBookingPrefix}"`);
  });
});
