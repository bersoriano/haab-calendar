"use client";

import { useState } from "react";

import { Card } from "@/components/app-ui";
import { fillTemplate } from "@/components/booking/i18n/translations";
import { BookingsPeriodHeader } from "@/components/provider/BookingsPeriodHeader";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { buildBookingWeek } from "@/lib/booking-week";
import { getCompactDateFormatter, getWeekdayShortFormatter } from "@/lib/constants";
import { addDays, parseDateKey } from "@/lib/date";
import {
  formatCompactTimeRange,
  formatDateLabel,
  formatDateRangeLabel,
  formatTimeLabel,
} from "@/lib/format";
import type { BookingRecord, Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { VerticalCopy } from "@/lib/vertical-copy";

/**
 * The bookings as a week: every booking of each day, in order. For reading
 * only — nothing here books, moves or cancels; the list does that.
 *
 * Seven columns need room. The switch follows the view's own width, not the
 * window's, as the list's does: narrower than that, the days stack.
 */
export function BookingsWeek({
  lang,
  copy,
  bookings,
  todayKey,
}: {
  lang: Lang;
  copy: VerticalCopy;
  /** Every booking; the week leaves out the cancelled ones. */
  bookings: readonly BookingRecord[];
  todayKey: string;
}) {
  const shell = dashboardCopy[lang];
  // Null follows today, so the week turns over with the calendar.
  const [chosenWeek, setChosenWeek] = useState<Date | null>(null);
  const anchor = chosenWeek ?? parseDateKey(todayKey);
  const week = buildBookingWeek(bookings, anchor, todayKey);
  const firstDay = week.days[0].dateKey;
  const weekdayFormatter = getWeekdayShortFormatter(lang);
  const noun = (count: number) => (count === 1 ? copy.booking : copy.bookings);

  return (
    <Card as="section" className="@container">
      <BookingsPeriodHeader
        lang={lang}
        label={formatDateRangeLabel(firstDay, week.days[6].dateKey, lang)}
        labelId="bookings-week-label"
        onPrevious={() => setChosenWeek(addDays(anchor, -7))}
        onToday={() => setChosenWeek(null)}
        onNext={() => setChosenWeek(addDays(anchor, 7))}
      >
        <p aria-live="polite" data-week-total>
          {fillTemplate(shell.weekTotal, {
            count: String(week.total),
            noun: noun(week.total),
            date: getCompactDateFormatter(lang).format(parseDateKey(firstDay)),
          })}
        </p>
      </BookingsPeriodHeader>

      <ol
        aria-labelledby="bookings-week-label"
        data-week-start={firstDay}
        className="divide-y divide-app-border @[54rem]:grid @[54rem]:grid-cols-7 @[54rem]:divide-x @[54rem]:divide-y-0"
      >
        {week.days.map((day) => {
          const count = day.bookings.length;

          return (
            <li
              key={day.dateKey}
              data-date={day.dateKey}
              aria-current={day.isToday ? "date" : undefined}
              className="min-w-0 px-4 py-3 sm:px-6 @[54rem]:min-h-72 @[54rem]:px-2 @[54rem]:py-3"
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold text-app-fg-secondary">
                <span aria-hidden="true" className="capitalize">
                  {weekdayFormatter.format(parseDateKey(day.dateKey))}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-7 place-items-center rounded-full tabular-nums",
                    day.isToday ? "bg-app-accent text-app-on-accent" : "text-app-fg",
                  )}
                >
                  {day.dayOfMonth}
                </span>
                {/* The weekday and number alone say nothing of the month to a screen reader. */}
                <span className="sr-only">{formatDateLabel(day.dateKey, lang)}</span>
                {count > 0 ? (
                  <span
                    data-count
                    className="ml-auto rounded-md bg-app-surface px-1.5 py-0.5 text-xs tabular-nums text-app-fg ring-1 ring-inset ring-app-border"
                  >
                    {count}
                    <span className="sr-only"> {noun(count)}</span>
                  </span>
                ) : null}
              </h3>
              {count === 0 ? (
                <p className="mt-2 text-sm text-app-fg-muted">{shell.weekFreeDay}</p>
              ) : (
                <ul className="mt-2 grid gap-1.5">
                  {day.bookings.map((booking) => (
                    <li
                      key={booking.id}
                      className="min-w-0 rounded-md bg-app-accent-soft px-2 py-1.5 text-sm @max-[54rem]:flex @max-[54rem]:flex-wrap @max-[54rem]:gap-x-3 @[54rem]:text-xs"
                    >
                      {/* A column has room for when a booking starts; a stacked day, for when it ends too. */}
                      <p className="font-semibold tabular-nums text-app-fg">
                        <span className="@[54rem]:hidden">
                          {formatCompactTimeRange(booking.startTime, booking.endTime, lang) ||
                            formatTimeLabel(booking.startTime, lang)}
                        </span>
                        <span className="@max-[54rem]:hidden">{formatTimeLabel(booking.startTime, lang)}</span>
                      </p>
                      <p className="truncate font-medium text-app-fg-secondary">{booking.clientName}</p>
                      <p className="truncate text-app-fg-secondary">{booking.serviceName}</p>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
