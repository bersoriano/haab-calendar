"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";

import { Badge, Button, Card, IconButton, Select } from "@/components/app-ui";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { getBookingTypeLabel } from "@/lib/format";
import type { BookingType, Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { VerticalCopy } from "@/lib/vertical-copy";

export type AdminCalendarDay = {
  dateKey: string;
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
  /** Open for a new booking of the selected service. */
  open: boolean;
  bookings: { id: string; type: BookingType; label: string; serviceName: string }[];
};

/** Chips shown per day from `sm`; the rest collapse into "+N". */
const VISIBLE_CHIPS = 3;

/**
 * The dashboard's month view: every booking by day, and open days that start
 * a booking for the selected service. Presentational; the module computes
 * the month and owns every action.
 */
export function AdminCalendar({
  lang,
  copy,
  monthLabel,
  weekdayLabels,
  weeks,
  services,
  selectedServiceId,
  onServiceChange,
  onPrevious,
  onToday,
  onNext,
  onOpenDay,
}: {
  lang: Lang;
  copy: VerticalCopy;
  monthLabel: string;
  weekdayLabels: string[];
  weeks: AdminCalendarDay[][];
  services: { id: string; name: string }[];
  selectedServiceId: string;
  onServiceChange: (id: string) => void;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
  onOpenDay: (dateKey: string) => void;
}) {
  const t = bookingTranslations[lang];

  return (
    <Card as="section">
      <div className="grid gap-3 border-b border-app-border px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg ring-1 ring-app-border-strong">
              <IconButton
                label={t.publicFlow.previous}
                icon={<CaretLeft aria-hidden="true" size={16} />}
                onClick={onPrevious}
                className="rounded-r-none"
              />
              <Button variant="plain" onClick={onToday} className="rounded-none border-x border-app-border-strong">
                {t.publicFlow.today}
              </Button>
              <IconButton
                label={t.publicFlow.next}
                icon={<CaretRight aria-hidden="true" size={16} />}
                onClick={onNext}
                className="rounded-l-none"
              />
            </div>
            <h2 aria-live="polite" className="text-base font-semibold capitalize text-app-fg sm:text-lg">
              {monthLabel}
            </h2>
          </div>
          {services.length > 0 ? (
            <Select
              value={selectedServiceId}
              onChange={(event) => onServiceChange(event.target.value)}
              aria-label={t.admin.newBookingPrefix}
              className="lg:w-72"
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {t.admin.newBookingPrefix}: {service.name}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-app-fg-muted">
          <p>{copy.phrases.addBookingHint}</p>
          <div className="flex flex-wrap gap-3 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full bg-app-accent" />
              {getBookingTypeLabel("appointment", lang)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full bg-app-full-day" />
              {getBookingTypeLabel("full-day", lang)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full bg-app-accent-soft ring-1 ring-app-accent" />
              {t.publicFlow.open}
            </span>
          </div>
        </div>
      </div>

      <div className="p-2 sm:p-4">
        <div className="overflow-hidden rounded-lg ring-1 ring-app-border">
          <div className="grid grid-cols-7 gap-px border-b border-app-border bg-app-border text-center text-xs font-semibold text-app-fg-secondary">
            {weekdayLabels.map((label) => (
              <p key={label} className="bg-app-subtle py-2">
                {label}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-app-border">
            {weeks.flat().map((day) => {
              const hidden = Math.max(0, day.bookings.length - VISIBLE_CHIPS);

              return (
                <button
                  key={day.dateKey}
                  type="button"
                  data-date={day.dateKey}
                  aria-current={day.isToday ? "date" : undefined}
                  disabled={!day.open}
                  onClick={() => onOpenDay(day.dateKey)}
                  className={cn(
                    "flex min-h-16 min-w-0 flex-col p-1 text-left transition-colors focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent sm:min-h-28 sm:p-2",
                    day.open
                      ? "cursor-pointer bg-app-accent-soft hover:bg-app-accent-soft-hover"
                      : cn("cursor-default", day.inMonth ? "bg-app-surface" : "bg-app-subtle text-app-fg-muted"),
                  )}
                >
                  <span className="flex items-start justify-between gap-1">
                    <span
                      className={cn(
                        "grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums sm:size-7 sm:text-sm",
                        day.isToday ? "bg-app-accent text-app-on-accent" : day.inMonth ? "text-app-fg" : "",
                      )}
                    >
                      {day.dayOfMonth}
                    </span>
                    {day.open ? (
                      <span className="hidden sm:inline-flex">
                        <Badge tone="accent">{t.publicFlow.open}</Badge>
                      </span>
                    ) : null}
                  </span>
                  {/* Chips from sm; dots on phones, with the text kept for screen readers. */}
                  <span className="mt-1 flex flex-wrap gap-1 sm:mt-2 sm:grid sm:gap-1">
                    {day.bookings.slice(0, VISIBLE_CHIPS).map((booking) => (
                      <span
                        key={booking.id}
                        className="flex min-w-0 items-center gap-1.5 sm:rounded-md sm:bg-app-subtle sm:px-1.5 sm:py-1 sm:text-xs"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            booking.type === "full-day" ? "bg-app-full-day" : "bg-app-accent",
                          )}
                        />
                        <span className="sr-only font-semibold text-app-fg sm:not-sr-only">{booking.label}</span>
                        <span className="sr-only truncate text-app-fg-muted sm:not-sr-only">
                          {booking.serviceName}
                        </span>
                      </span>
                    ))}
                    {hidden > 0 ? (
                      <span className="text-[0.65rem] font-semibold leading-none text-app-fg-muted sm:text-xs">
                        +{hidden}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
