import { MagnifyingGlass, QrCode, X } from "@phosphor-icons/react";

import { BookingCampaignBadge } from "@/components/booking/BookingCampaignBadge";
import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
import { adminFieldClass, adminInsetClass, adminPanelClass } from "@/components/provider/adminGlass";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { BookingRetentionNotice } from "@/components/provider/BookingRetentionSettings";
import type { BookingRetentionPolicy } from "@/lib/booking-retention";
import { ActionButton, EmptyState, ToneBadge } from "@/components/ui";
import { groupBookingsByDate } from "@/lib/booking-groups";
import type { BookingListSort, BookingListView } from "@/lib/booking-list";
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
  activeCount,
  archiveCount,
  view,
  onViewChange,
  sort,
  onSortChange,
  retentionPolicy,
  onOpenRetentionSettings,
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
  /** Bookings in the selected view, before search/status/type filtering. */
  totalCount: number;
  activeCount: number;
  archiveCount: number;
  view: BookingListView;
  onViewChange: (value: BookingListView) => void;
  sort: BookingListSort;
  onSortChange: (value: BookingListSort) => void;
  retentionPolicy?: BookingRetentionPolicy;
  onOpenRetentionSettings?: () => void;
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
      {retentionPolicy ? (
        <div className="mb-5">
          <BookingRetentionNotice lang={lang} policy={retentionPolicy} onOpenSettings={onOpenRetentionSettings} />
        </div>
      ) : null}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label={shell.bookingViewLabel} className="inline-flex self-start rounded-2xl bg-[var(--surface-soft)] p-1">
          {(["active", "archive"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => onViewChange(value)}
              className={cn("inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]", view === value ? "bg-[var(--surface-lowest)] text-[var(--primary)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]")}
            >
              {value === "active" ? shell.activeBookings : shell.archivedBookings}
              <span className="rounded-lg bg-[var(--accent-soft)] px-2 py-0.5 text-xs tabular-nums">{value === "active" ? activeCount : archiveCount}</span>
            </button>
          ))}
        </div>
        <p className="max-w-sm text-sm text-[var(--muted)]">{shell.archiveHint}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_160px_190px] xl:items-center">
        <label className="relative block sm:col-span-2 xl:col-span-1">
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
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as BookingListSort)}
          aria-label={shell.sortBookingsLabel}
          className={cn("min-h-12 min-w-0 sm:col-span-2 xl:col-span-1", adminFieldClass)}
        >
          <option value="closest">{shell.closestBookings}</option>
          <option value="sooner">{shell.soonerBookings}</option>
          <option value="latest">{shell.latestBookings}</option>
        </select>
        {onScan ? (
          <ActionButton tone="primary" className="justify-self-start sm:col-span-2 xl:col-span-4" onClick={onScan}>
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
            view === "archive" ? (
              <EmptyState title={shell.noArchivedBookingsTitle} body={shell.noArchivedBookingsBody} />
            ) : activeCount + archiveCount === 0 ? (
              <EmptyState title={shell.noBookingsYetTitle} body={shell.noBookingsYetBody} />
            ) : (
              <EmptyState title={shell.noActiveBookingsTitle} body={shell.noActiveBookingsBody} />
            )
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
                              disabled={cancelled || view === "archive"}
                              onClick={() => onReschedule(booking.id)}
                            >
                              {t.publicFlow.reschedule}
                            </ActionButton>
                          ) : null}
                          <ActionButton
                            tone="danger"
                            disabled={cancelled || view === "archive"}
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
