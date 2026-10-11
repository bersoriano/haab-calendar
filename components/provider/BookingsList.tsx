"use client";

import { ArrowRight, CalendarBlank, Check, MagnifyingGlass, X } from "@phosphor-icons/react";

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
import { canMarkBookingAsNew, isNewBooking, type BookingReviewFilter } from "@/lib/booking-review";
import {
  bookingStatusBadgeTone,
  bookingTypeBadgeTone,
  formatDateLabel,
  formatDateOfBirth,
  formatTimeRange,
  getBookingStatusLabel,
  getBookingTypeLabel,
  formatCost,
} from "@/lib/format";
import type { BookingRecord, BookingStatus, BookingType, Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { VerticalCopy } from "@/lib/vertical-copy";

/**
 * Every booking, searchable and filterable, grouped by day. Presentational:
 * filter state and every action live with the caller.
 */
/**
 * Rows are set as a table once the list is wide enough: time, client, service,
 * then one column per action. The columns belong to the list, and every date
 * group and row borrows them (subgrid), so a name, a service or a button sits
 * at the same place on every row, whatever that row's status or actions.
 * Narrower than that, a row stacks and its actions run in one line. Columns
 * are spaced by padding inside the cells, not by a gap, so a column no row
 * uses takes no room: the time column is 7rem of text plus that padding.
 *
 * The switch follows the list's own width, not the window's: the same list
 * sits beside a sidebar or alone. Three actions need more room than two; the
 * two widths are the list's inside a 1024px and a 1280px window with the
 * dashboard's sidebar open.
 */
const TABLE = {
  two: {
    grid: "@[40rem]:grid @[40rem]:grid-cols-[8.5rem_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto]",
    borrow: "@[40rem]:col-span-full @[40rem]:grid @[40rem]:grid-cols-subgrid",
    row: "@[40rem]:col-span-full @[40rem]:grid-cols-subgrid @[40rem]:items-start @[40rem]:gap-0",
    cell: "@[40rem]:pr-6",
    actions: "@[40rem]:contents",
    actionsEmpty: "@max-[40rem]:hidden",
    slot: "@[40rem]:pl-2",
    slotEmpty: "@max-[40rem]:hidden",
  },
  three: {
    grid: "@[54rem]:grid @[54rem]:grid-cols-[8.5rem_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto]",
    borrow: "@[54rem]:col-span-full @[54rem]:grid @[54rem]:grid-cols-subgrid",
    row: "@[54rem]:col-span-full @[54rem]:grid-cols-subgrid @[54rem]:items-start @[54rem]:gap-0",
    cell: "@[54rem]:pr-6",
    actions: "@[54rem]:contents",
    actionsEmpty: "@max-[54rem]:hidden",
    slot: "@[54rem]:pl-2",
    slotEmpty: "@max-[54rem]:hidden",
  },
} as const;

export function BookingsList({
  lang,
  copy,
  bookings,
  totalCount,
  activeCount,
  archiveCount,
  otherViewMatches = 0,
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
  review,
}: {
  lang: Lang;
  copy: VerticalCopy;
  /** Already filtered and sorted. */
  bookings: BookingRecord[];
  /** Bookings in the selected view, before search/status/type filtering. */
  totalCount: number;
  activeCount: number;
  archiveCount: number;
  /** What the current search and filters find in the view not shown. */
  otherViewMatches?: number;
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
  /** Present only where bookings are reviewed: the new/seen flag, its filter and its toggle. */
  review?: {
    filter: BookingReviewFilter;
    onFilterChange: (value: BookingReviewFilter) => void;
    /** Bookings whose flag is being saved. */
    pendingIds: ReadonlySet<string>;
    onToggle: (bookingId: string) => void;
  };
}) {
  const t = bookingTranslations[lang];
  const shell = dashboardCopy[lang];
  const filtersActive =
    search.trim() !== "" || status !== "all" || type !== "all" || (review ? review.filter !== "all" : false);
  const groups = groupBookingsByDate(bookings, todayKey);
  const readOnly = view === "archive";
  const table = review ? TABLE.three : TABLE.two;

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
    <Card as="section" className="@container">
      <div className="grid gap-4 border-b border-app-border px-4 py-4 sm:px-6">
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

        {retentionPolicy ? (
          <BookingRetentionNotice lang={lang} policy={retentionPolicy} onOpenSettings={onOpenRetentionSettings} />
        ) : null}

        <div
          className={cn(
            "grid grid-cols-1 gap-3 sm:grid-cols-2",
            // Four selects leave no room for the search beside them: it takes its own row.
            review ? "xl:grid-cols-4" : "xl:grid-cols-[minmax(0,1fr)_repeat(3,11rem)]",
          )}
        >
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={copy.phrases.searchPlaceholder}
            aria-label={copy.phrases.searchPlaceholder}
            leadingAddon={<MagnifyingGlass aria-hidden="true" size={16} />}
            className={review ? "sm:col-span-2 xl:col-span-4" : "sm:col-span-2 xl:col-span-1"}
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
          {review ? (
            <Select
              value={review.filter}
              onChange={(event) => review.onFilterChange(event.target.value as BookingReviewFilter)}
              aria-label={shell.review.filterLabel}
            >
              <option value="all">{shell.review.filterAll}</option>
              <option value="new">{shell.review.filterNew}</option>
              <option value="seen">{shell.review.filterSeen}</option>
            </Select>
          ) : null}
          <Select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as BookingListSort)}
            aria-label={shell.sortBookingsLabel}
            // Three selects leave the sort alone on its row; four pair up.
            className={review ? undefined : "sm:col-span-2 xl:col-span-1"}
          >
            <option value="closest">{shell.closestBookings}</option>
            <option value="sooner">{shell.soonerBookings}</option>
            <option value="latest">{shell.latestBookings}</option>
          </Select>
        </div>

        <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 text-sm text-app-fg-muted">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p aria-live="polite">
              {fillTemplate(shell.resultsCount, {
                shown: String(bookings.length),
                total: String(totalCount),
              })}
            </p>
            {/* A search only lists one view; say when the other one holds matches too. */}
            {filtersActive && otherViewMatches > 0 ? (
              <Button
                variant="plain"
                size="sm"
                onClick={() => onViewChange(readOnly ? "active" : "archive")}
              >
                {fillTemplate(shell.otherViewMatches, {
                  count: String(otherViewMatches),
                  view: readOnly ? shell.activeBookings : shell.archivedBookings,
                })}
                <ArrowRight aria-hidden="true" size={16} />
              </Button>
            ) : null}
          </div>
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
          {/* The section has no h2 of its own; its headings sit under the page h1. */}
          <EmptyState
            variant="dashed"
            headingLevel={2}
            icon={<CalendarBlank aria-hidden="true" size={32} />}
            {...emptyState()}
          />
        </div>
      ) : (
        <div className={table.grid}>
          {groups.map((group) => {
            const headingId = `bookings-${group.dateKey}`;
            const dateLabel = formatDateLabel(group.dateKey, lang);

            return (
              <div key={group.dateKey} role="group" aria-labelledby={headingId} className={table.borrow}>
                <StackedListHeading id={headingId} level={2} className="col-span-full">
                  {group.relative ? (
                    <>
                      <span className="text-app-accent">{shell[group.relative]}</span>
                      <span aria-hidden="true"> · </span>
                    </>
                  ) : null}
                  {dateLabel}
                </StackedListHeading>
                <StackedList className={table.borrow}>
                  {group.items.map((booking) => {
                    const cancelled = booking.status === "cancelled";
                    const actionable = !cancelled && !readOnly;
                    const isNew = review ? isNewBooking(booking) : false;
                    // A new booking can always be marked as seen; only a live one, today or later, can go back.
                    const reviewAction = !review
                      ? null
                      : isNew
                        ? "seen"
                        : canMarkBookingAsNew(booking, todayKey)
                          ? "new"
                          : null;
                    const slots = [
                      {
                        id: "review",
                        action:
                          review && reviewAction ? (
                            <Button
                              variant={reviewAction === "seen" ? "secondary" : "plain"}
                              size="sm"
                              loading={review.pendingIds.has(booking.id)}
                              onClick={() => review.onToggle(booking.id)}
                              leadingIcon={
                                reviewAction === "seen" ? <Check aria-hidden="true" size={16} /> : undefined
                              }
                            >
                              {reviewAction === "seen" ? shell.review.markSeen : shell.review.markNew}
                            </Button>
                          ) : null,
                      },
                      {
                        id: "reschedule",
                        action:
                          actionable && canReschedule(booking) ? (
                            <Button variant="secondary" size="sm" onClick={() => onReschedule(booking.id)}>
                              {t.publicFlow.reschedule}
                            </Button>
                          ) : null,
                      },
                      {
                        id: "cancel",
                        action: actionable ? (
                          <Button variant="danger-plain" size="sm" onClick={() => onCancel(booking.id)}>
                            {t.common.cancel}
                          </Button>
                        ) : null,
                      },
                    ];

                    return (
                      <li
                        key={booking.id}
                        className={cn(
                          "grid gap-3 px-4 py-4 sm:px-6",
                          table.row,
                          cancelled && "text-app-fg-muted",
                        )}
                      >
                        <p className={cn("text-sm font-semibold text-app-fg tabular-nums", table.cell)}>
                          {formatTimeRange(booking.startTime, booking.endTime, lang)}
                        </p>
                        <div className={cn("min-w-0", table.cell)}>
                          <p
                            className={cn(
                              "flex flex-wrap items-center gap-2 font-semibold",
                              cancelled ? "text-app-fg-muted" : "text-app-fg",
                            )}
                          >
                            {booking.clientName}
                            {isNew ? (
                              <Badge tone="accent" dot>
                                {shell.review.newBadge}
                              </Badge>
                            ) : null}
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
                        <div className={cn("min-w-0", table.cell)}>
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
                            {formatCost(booking.cost, lang) ? (
                              <span>
                                {t.publicFlow.total}: {formatCost(booking.cost, lang)}
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
                        {/* Always the same three slots in the same order: an action a row
                            lacks leaves its slot empty instead of pulling the others over. */}
                        <div
                          className={cn(
                            "flex flex-wrap gap-2",
                            table.actions,
                            slots.every((slot) => !slot.action) && table.actionsEmpty,
                          )}
                        >
                          {slots.map((slot) => (
                            <div
                              key={slot.id}
                              data-slot={slot.id}
                              className={cn(table.slot, !slot.action && table.slotEmpty)}
                            >
                              {slot.action}
                            </div>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </StackedList>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
