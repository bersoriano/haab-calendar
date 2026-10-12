"use client";

import { useState } from "react";

import { Card } from "@/components/app-ui";
import { fillTemplate } from "@/components/booking/i18n/translations";
import { BookingsPeriodHeader } from "@/components/provider/BookingsPeriodHeader";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { buildBookingMonth, type BookingMonthLevel } from "@/lib/booking-month";
import { getWeekdayShortFormatter } from "@/lib/constants";
import { parseDateKey, shiftMonth } from "@/lib/date";
import { formatDateLabel, formatMonthLabel, formatTimeLabel } from "@/lib/format";
import type { BookingRecord, Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { VerticalCopy } from "@/lib/vertical-copy";

/** Bookings named per day from `sm`; the rest collapse into "+N". */
const VISIBLE_BOOKINGS = 3;

/** A day's shade: the fuller the day, the deeper. The count beside it says the same in words. */
const LEVEL_SHADE: Record<BookingMonthLevel, string> = {
  0: "bg-app-surface",
  1: "bg-app-accent/8",
  2: "bg-app-accent/16",
  3: "bg-app-accent/26",
  4: "bg-app-accent/38",
};

const LEVELS: BookingMonthLevel[] = [0, 1, 2, 3, 4];

/**
 * The bookings as a month: how full each day is, at a glance. For reading
 * only — nothing here books, moves or cancels; the list does that.
 */
export function BookingsMonth({
  lang,
  copy,
  bookings,
  todayKey,
}: {
  lang: Lang;
  copy: VerticalCopy;
  /** Every booking; the month leaves out the cancelled ones. */
  bookings: readonly BookingRecord[];
  todayKey: string;
}) {
  const shell = dashboardCopy[lang];
  // Null follows today, so the month turns over with the calendar.
  const [chosenMonth, setChosenMonth] = useState<Date | null>(null);
  const anchor = chosenMonth ?? parseDateKey(todayKey);
  const month = buildBookingMonth(bookings, anchor, todayKey);
  const monthLabel = formatMonthLabel(anchor, lang);
  const weekdayFormatter = getWeekdayShortFormatter(lang);
  const noun = (count: number) => (count === 1 ? copy.booking : copy.bookings);

  return (
    <Card as="section">
      <BookingsPeriodHeader
        lang={lang}
        label={monthLabel}
        labelId="bookings-month-label"
        labelClassName="capitalize"
        onPrevious={() => setChosenMonth(shiftMonth(anchor, -1))}
        onToday={() => setChosenMonth(null)}
        onNext={() => setChosenMonth(shiftMonth(anchor, 1))}
      >
        <p aria-live="polite" data-month-total>
          {fillTemplate(shell.monthTotal, {
            count: String(month.total),
            noun: noun(month.total),
            month: monthLabel,
          })}
        </p>
        <p className="flex items-center gap-1.5 text-xs">
          {shell.monthLess}
          <span aria-hidden="true" className="flex gap-0.5">
            {LEVELS.map((level) => (
              <span
                key={level}
                className={cn("size-3 rounded-sm ring-1 ring-inset ring-app-border", LEVEL_SHADE[level])}
              />
            ))}
          </span>
          {shell.monthMore}
        </p>
      </BookingsPeriodHeader>

      <div className="p-2 sm:p-4">
        <div className="overflow-hidden rounded-lg ring-1 ring-app-border">
          <table aria-labelledby="bookings-month-label" className="w-full table-fixed border-collapse">
            <thead>
              <tr>
                {month.weeks[0].map((day) => (
                  <th
                    key={day.dateKey}
                    scope="col"
                    className="border-b border-app-border bg-app-subtle py-2 text-center text-xs font-semibold capitalize text-app-fg-secondary"
                  >
                    {weekdayFormatter.format(parseDateKey(day.dateKey))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {month.weeks.map((week) => (
                <tr key={week[0].dateKey}>
                  {week.map((day) => {
                    const count = day.bookings.length;
                    const hidden = Math.max(0, count - VISIBLE_BOOKINGS);

                    return (
                      <td
                        key={day.dateKey}
                        data-date={day.dateKey}
                        data-level={day.level}
                        aria-current={day.isToday ? "date" : undefined}
                        className={cn(
                          "h-16 border border-app-border p-1 align-top first:border-l-0 last:border-r-0 sm:h-28 sm:p-2",
                          day.inMonth ? LEVEL_SHADE[day.level] : "bg-app-subtle text-app-fg-muted",
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span
                            className={cn(
                              "grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums sm:size-7 sm:text-sm",
                              day.isToday ? "bg-app-accent text-app-on-accent" : day.inMonth ? "text-app-fg" : "",
                            )}
                          >
                            {/* The number alone says nothing of the month to a screen reader. */}
                            <span aria-hidden="true">{day.dayOfMonth}</span>
                            <span className="sr-only">{formatDateLabel(day.dateKey, lang)}</span>
                          </span>
                          {count > 0 ? (
                            <span
                              data-count
                              className="rounded-md bg-app-surface px-1.5 py-0.5 text-xs font-semibold tabular-nums text-app-fg ring-1 ring-inset ring-app-border"
                            >
                              {count}
                              <span className="sr-only"> {noun(count)}</span>
                            </span>
                          ) : null}
                        </div>
                        {count > 0 ? (
                          <ul className="mt-1 hidden gap-0.5 px-1.5 text-xs text-app-fg-secondary sm:grid">
                            {day.bookings.slice(0, VISIBLE_BOOKINGS).map((booking) => (
                              <li key={booking.id} className="truncate">
                                <span className="font-semibold tabular-nums text-app-fg">
                                  {formatTimeLabel(booking.startTime, lang)}
                                </span>{" "}
                                {booking.serviceName}
                              </li>
                            ))}
                            {hidden > 0 ? (
                              <li className="font-semibold">
                                {fillTemplate(shell.monthMoreBookings, { count: String(hidden) })}
                              </li>
                            ) : null}
                          </ul>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
