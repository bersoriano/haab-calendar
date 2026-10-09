import { MagnifyingGlass, QrCode, X } from "@phosphor-icons/react";

import { BookingCampaignBadge } from "@/components/booking/BookingCampaignBadge";
import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
import { adminFieldClass, adminInsetClass, adminPanelClass } from "@/components/provider/adminGlass";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { ActionButton, EmptyState, ToneBadge } from "@/components/ui";
import { groupBookingsByDate } from "@/lib/booking-groups";
import {
  bookingTypeTone,
  formatDateLabel,
  formatDateOfBirth,
  formatTimeRange,
  getBookingStatusLabel,
  getBookingTypeLabel,
  statusTone,
} from "@/lib/format";
import type { BookingRecord, BookingStatus, BookingType, Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { VerticalCopy } from "@/lib/vertical-copy";

/**
 * Every booking, searchable and filterable, grouped by day. Presentational:
 * filter state and every action live with the caller.
 */
export function BookingsList({
  lang,
  copy,
  bookings,
  totalCount,
  todayKey,
  search,
  onSearchChange,
  status,
  onStatusChange,
  type,
  onTypeChange,
  onClearFilters,
  canReschedule,
  onReschedule,
  onCancel,
  onScan,
}: {
  lang: Lang;
  copy: VerticalCopy;
  /** Already filtered and sorted. */
  bookings: BookingRecord[];
  /** Every booking, before filtering — tells "none yet" from "no matches". */
  totalCount: number;
  todayKey: string;
  search: string;
  onSearchChange: (value: string) => void;
  status: "all" | BookingStatus;
  onStatusChange: (value: "all" | BookingStatus) => void;
  type: "all" | BookingType;
  onTypeChange: (value: "all" | BookingType) => void;
  onClearFilters: () => void;
  canReschedule: (booking: BookingRecord) => boolean;
  onReschedule: (bookingId: string) => void;
  onCancel: (bookingId: string) => void;
  /** Present only where the appointment scanner works. */
  onScan?: () => void;
}) {
  const t = bookingTranslations[lang];
  const shell = dashboardCopy[lang];
  const filtersActive = search.trim() !== "" || status !== "all" || type !== "all";
  const groups = groupBookingsByDate(bookings, todayKey);

  return (
    <section className={cn(adminPanelClass, "p-4 sm:p-6")}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px_auto] lg:items-center">
        <label className="relative col-span-2 block lg:col-span-1">
          <MagnifyingGlass
            aria-hidden="true"
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={copy.phrases.searchPlaceholder}
            aria-label={copy.phrases.searchPlaceholder}
            className={cn("min-h-12 w-full !pl-11", adminFieldClass)}
          />
        </label>
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value as "all" | BookingStatus)}
          aria-label={shell.statusFilterLabel}
          className={cn("min-h-12 min-w-0", adminFieldClass)}
        >
          <option value="all">{t.admin.allStatuses}</option>
          <option value="confirmed">{t.admin.confirmed}</option>
          <option value="rescheduled">{t.admin.rescheduled}</option>
          <option value="cancelled">{t.admin.cancelled}</option>
        </select>
        <select
          value={type}
          onChange={(event) => onTypeChange(event.target.value as "all" | BookingType)}
          aria-label={shell.typeFilterLabel}
          className={cn("min-h-12 min-w-0", adminFieldClass)}
        >
          <option value="all">{t.admin.allTypes}</option>
          <option value="appointment">{t.admin.appointments}</option>
          <option value="full-day">{getBookingTypeLabel("full-day", lang)}</option>
        </select>
        {onScan ? (
          <ActionButton tone="primary" className="col-span-2 lg:col-span-1" onClick={onScan}>
            <span className="inline-flex items-center gap-2">
              <QrCode aria-hidden="true" size={18} />
              {t.admin.scanAppointment}
            </span>
          </ActionButton>
        ) : null}
      </div>

      <div className="mt-4 flex min-h-11 flex-wrap items-center justify-between gap-2 text-sm text-[var(--muted)]">
        <p aria-live="polite">
          {fillTemplate(shell.resultsCount, {
            shown: String(bookings.length),
            total: String(totalCount),
          })}
        </p>
        {filtersActive ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 font-semibold text-[var(--primary)] transition hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <X aria-hidden="true" size={16} />
            {shell.clearFilters}
          </button>
        ) : null}
      </div>

      <div className="mt-2 grid gap-6">
        {bookings.length === 0 ? (
          totalCount === 0 ? (
            <EmptyState title={shell.noBookingsYetTitle} body={shell.noBookingsYetBody} />
          ) : (
            <EmptyState title={copy.phrases.noBookingsMatchTitle} body={t.admin.tryBroaderSearch} />
          )
        ) : (
          groups.map((group) => {
            const headingId = `bookings-${group.dateKey}`;
            const dateLabel = formatDateLabel(group.dateKey, lang);

            return (
              <section key={group.dateKey} aria-labelledby={headingId}>
                <h3
                  id={headingId}
                  className="flex items-baseline gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
                >
                  {group.relative ? (
                    <>
                      <span className="text-[var(--primary)]">{shell[group.relative]}</span>
                      <span aria-hidden="true">·</span>
                    </>
                  ) : null}
                  <span>{dateLabel}</span>
                </h3>
                <ul className="mt-3 grid gap-3">
                  {group.items.map((booking) => {
                    const cancelled = booking.status === "cancelled";

                    return (
                      <li
                        key={booking.id}
                        className={cn(
                          adminInsetClass,
                          "flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5",
                          cancelled && "opacity-60",
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-semibold text-[var(--ink)]">
                              {booking.clientName}
                            </h4>
                            <ToneBadge tone={bookingTypeTone(booking.bookingType)}>
                              {getBookingTypeLabel(booking.bookingType, lang)}
                            </ToneBadge>
                            <ToneBadge tone={statusTone(booking.status)}>
                              {getBookingStatusLabel(booking.status, lang)}
                            </ToneBadge>
                            <BookingCampaignBadge campaign={booking.campaign} lang={lang} />
                          </div>
                          <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                            {formatTimeRange(booking.startTime, booking.endTime, lang)} ·{" "}
                            {booking.serviceName}
                            {typeof booking.partySize === "number"
                              ? ` · ${booking.partySize} ${t.admin.guestsSuffix}`
                              : ""}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
                            <span className="break-all">{booking.clientEmail}</span>
                            <span>{booking.clientPhone}</span>
                            {booking.dateOfBirth ? (
                              <span>
                                {t.publicFlow.dateOfBirth}:{" "}
                                {formatDateOfBirth(booking.dateOfBirth, lang)}
                              </span>
                            ) : null}
                            {booking.capacitySnapshot ? (
                              <span>
                                {t.publicFlow.capacity}: {booking.capacitySnapshot}
                              </span>
                            ) : null}
                            {booking.cost ? (
                              <span>
                                {t.publicFlow.total}: {booking.cost}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {canReschedule(booking) ? (
                            <ActionButton
                              tone="ghost"
                              disabled={cancelled}
                              onClick={() => onReschedule(booking.id)}
                            >
                              {t.publicFlow.reschedule}
                            </ActionButton>
                          ) : null}
                          <ActionButton
                            tone="danger"
                            disabled={cancelled}
                            onClick={() => onCancel(booking.id)}
                          >
                            {t.common.cancel}
                          </ActionButton>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}
