"use client";

import { CalendarBlank, MagnifyingGlass, QrCode, X } from "@phosphor-icons/react";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  SegmentedControl,
  Select,
  StackedList,
  StackedListHeading,
} from "@/components/app-ui";
import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
import { BookingRetentionNotice } from "@/components/provider/BookingRetentionSettings";
import { CampaignBadge } from "@/components/provider/CampaignBadge";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import type { BookingRetentionPolicy } from "@/lib/booking-retention";
import { groupBookingsByDate } from "@/lib/booking-groups";
import type { BookingListSort, BookingListView } from "@/lib/booking-list";
import {
  bookingStatusBadgeTone,
  bookingTypeBadgeTone,
  formatDateLabel,
  formatDateOfBirth,
  formatTimeRange,
  getBookingStatusLabel,
  getBookingTypeLabel,
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
  const readOnly = view === "archive";

  function emptyState() {
    if (totalCount > 0) {
      return { title: copy.phrases.noBookingsMatchTitle, body: t.admin.tryBroaderSearch };
    }
    if (view === "archive") {
      return { title: shell.noArchivedBookingsTitle, body: shell.noArchivedBookingsBody };
    }
    if (activeCount + archiveCount === 0) {
      return { title: shell.noBookingsYetTitle, body: shell.noBookingsYetBody };
    }
    return { title: shell.noActiveBookingsTitle, body: shell.noActiveBookingsBody };
  }

  return (
    <Card as="section">
      <div className="grid gap-4 border-b border-app-border px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <SegmentedControl
              ariaLabel={shell.bookingViewLabel}
              value={view}
              onChange={onViewChange}
              options={[
                { value: "active", label: shell.activeBookings, count: activeCount },
                { value: "archive", label: shell.archivedBookings, count: archiveCount },
              ]}
              className="self-start"
            />
            <p className="text-sm text-app-fg-muted">{shell.archiveHint}</p>
          </div>
          {onScan ? (
            <Button onClick={onScan} leadingIcon={<QrCode aria-hidden="true" size={18} />} className="self-start">
              {t.admin.scanAppointment}
            </Button>
          ) : null}
        </div>

        {retentionPolicy ? (
          <BookingRetentionNotice lang={lang} policy={retentionPolicy} onOpenSettings={onOpenRetentionSettings} />
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_repeat(3,11rem)]">
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={copy.phrases.searchPlaceholder}
            aria-label={copy.phrases.searchPlaceholder}
            leadingAddon={<MagnifyingGlass aria-hidden="true" size={16} />}
            className="sm:col-span-2 xl:col-span-1"
          />
          <Select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as "all" | BookingStatus)}
            aria-label={shell.statusFilterLabel}
          >
            <option value="all">{t.admin.allStatuses}</option>
            <option value="confirmed">{t.admin.confirmed}</option>
            <option value="rescheduled">{t.admin.rescheduled}</option>
            <option value="cancelled">{t.admin.cancelled}</option>
          </Select>
          <Select
            value={type}
            onChange={(event) => onTypeChange(event.target.value as "all" | BookingType)}
            aria-label={shell.typeFilterLabel}
          >
            <option value="all">{t.admin.allTypes}</option>
            <option value="appointment">{t.admin.appointments}</option>
            <option value="full-day">{getBookingTypeLabel("full-day", lang)}</option>
          </Select>
          <Select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as BookingListSort)}
            aria-label={shell.sortBookingsLabel}
            className="sm:col-span-2 xl:col-span-1"
          >
            <option value="closest">{shell.closestBookings}</option>
            <option value="sooner">{shell.soonerBookings}</option>
            <option value="latest">{shell.latestBookings}</option>
          </Select>
        </div>

        <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 text-sm text-app-fg-muted">
          <p aria-live="polite">
            {fillTemplate(shell.resultsCount, {
              shown: String(bookings.length),
              total: String(totalCount),
            })}
          </p>
          {filtersActive ? (
            <Button
              variant="plain"
              size="sm"
              onClick={onClearFilters}
              leadingIcon={<X aria-hidden="true" size={16} />}
            >
              {shell.clearFilters}
            </Button>
          ) : null}
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="p-4 sm:p-6">
          <EmptyState
            variant="dashed"
            icon={<CalendarBlank aria-hidden="true" size={32} />}
            {...emptyState()}
          />
        </div>
      ) : (
        groups.map((group) => {
          const headingId = `bookings-${group.dateKey}`;
          const dateLabel = formatDateLabel(group.dateKey, lang);

          return (
            <section key={group.dateKey} aria-labelledby={headingId}>
              <StackedListHeading id={headingId}>
                {group.relative ? (
                  <>
                    <span className="text-app-accent">{shell[group.relative]}</span>
                    <span aria-hidden="true"> · </span>
                  </>
                ) : null}
                {dateLabel}
              </StackedListHeading>
              <StackedList>
                {group.items.map((booking) => {
                  const cancelled = booking.status === "cancelled";
                  const actionable = !cancelled && !readOnly;

                  return (
                    <li
                      key={booking.id}
                      className={cn(
                        "grid gap-3 px-4 py-4 sm:px-6 lg:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-start lg:gap-6",
                        cancelled && "text-app-fg-muted",
                      )}
                    >
                      <p className="text-sm font-semibold text-app-fg tabular-nums">
                        {formatTimeRange(booking.startTime, booking.endTime, lang)}
                      </p>
                      <div className="min-w-0">
                        <p className={cn("font-semibold", cancelled ? "text-app-fg-muted" : "text-app-fg")}>
                          {booking.clientName}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-app-fg-muted">
                          <span className="break-all">{booking.clientEmail}</span>
                          <span>{booking.clientPhone}</span>
                          {booking.dateOfBirth ? (
                            <span>
                              {t.publicFlow.dateOfBirth}: {formatDateOfBirth(booking.dateOfBirth, lang)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-app-fg-secondary">
                          {booking.serviceName}
                          {typeof booking.partySize === "number"
                            ? ` · ${booking.partySize} ${t.admin.guestsSuffix}`
                            : ""}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-app-fg-muted">
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
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge tone={bookingTypeBadgeTone(booking.bookingType)}>
                            {getBookingTypeLabel(booking.bookingType, lang)}
                          </Badge>
                          <Badge tone={bookingStatusBadgeTone(booking.status)}>
                            {getBookingStatusLabel(booking.status, lang)}
                          </Badge>
                          <CampaignBadge campaign={booking.campaign} lang={lang} />
                        </div>
                      </div>
                      {actionable ? (
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          {canReschedule(booking) ? (
                            <Button variant="secondary" size="sm" onClick={() => onReschedule(booking.id)}>
                              {t.publicFlow.reschedule}
                            </Button>
                          ) : null}
                          <Button variant="danger-plain" size="sm" onClick={() => onCancel(booking.id)}>
                            {t.common.cancel}
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </StackedList>
            </section>
          );
        })
      )}
    </Card>
  );
}
