import { ArrowRight, ArrowSquareOut, Check, Copy } from "@phosphor-icons/react";

import { BookingCampaignBadge } from "@/components/booking/BookingCampaignBadge";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { adminInsetClass, adminPanelClass } from "@/components/provider/adminGlass";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { ActionButton, EmptyState, SectionTitle, ToneBadge, buttonClasses } from "@/components/ui";
import type { NextStep } from "@/lib/dashboard-overview";
import {
  bookingTypeTone,
  formatDateLabel,
  formatTimeRange,
  getBookingStatusLabel,
  getBookingTypeLabel,
  statusTone,
} from "@/lib/format";
import type { AdminTab, BookingRecord, Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { VerticalCopy } from "@/lib/vertical-copy";

export type OverviewStats = {
  upcoming: number;
  services: number;
  confirmed: number;
  total: number;
};

/**
 * The dashboard's first screen: the numbers, what is coming up this week, the
 * booking page itself, and — only when something is missing — what to do
 * next. Presentational; every action goes back out through a callback.
 */
export function DashboardOverview({
  lang,
  copy,
  stats,
  upcomingBookings,
  canReschedule,
  onReschedule,
  onCancel,
  onSeeAllBookings,
  publicUrl,
  copiedLink,
  onCopyLink,
  publishingEnabled,
  nextSteps,
  onGoToSection,
}: {
  lang: Lang;
  copy: VerticalCopy;
  stats: OverviewStats;
  upcomingBookings: BookingRecord[];
  canReschedule: (booking: BookingRecord) => boolean;
  onReschedule: (bookingId: string) => void;
  onCancel: (bookingId: string) => void;
  onSeeAllBookings: () => void;
  publicUrl: string;
  copiedLink: boolean;
  onCopyLink: () => void;
  /** Undefined means unknown; only an explicit false reads as off. */
  publishingEnabled?: boolean;
  nextSteps: NextStep[];
  onGoToSection: (section: AdminTab) => void;
}) {
  const t = bookingTranslations[lang];
  const shell = dashboardCopy[lang];
  const publishingOff = publishingEnabled === false;

  const tiles = [
    { label: t.admin.upcoming7Days, value: stats.upcoming, detail: copy.phrases.bookingsSoonDetail },
    { label: copy.Services, value: stats.services, detail: copy.phrases.servicesStatDetail },
    { label: t.admin.confirmed, value: stats.confirmed, detail: copy.phrases.activeBookingsDetail },
    {
      label: copy.phrases.totalBookingsLabel,
      value: stats.total,
      detail: t.admin.allTimeEveryStatus,
    },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className={cn(adminInsetClass, "p-4 sm:p-5")}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] sm:text-xs">
              {tile.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--ink)] sm:mt-3 sm:text-3xl">
              {tile.value}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)] sm:mt-2 sm:text-sm">
              {tile.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className={cn(adminPanelClass, "p-5 sm:p-6")}>
          <SectionTitle
            title={copy.phrases.upcomingTitle}
            action={
              <button
                type="button"
                onClick={onSeeAllBookings}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                {shell.seeAll}
                <ArrowRight aria-hidden="true" size={16} />
              </button>
            }
          />
          <div className="mt-5 grid gap-3">
            {upcomingBookings.length === 0 ? (
              <EmptyState
                title={copy.phrases.upcomingEmptyTitle}
                body={copy.phrases.upcomingEmptyBody}
              />
            ) : (
              upcomingBookings.map((booking) => (
                <article
                  key={booking.id}
                  className={cn(
                    adminInsetClass,
                    "flex flex-col gap-4 p-4 sm:flex-row sm:items-start",
                  )}
                >
                  <div className="shrink-0 sm:w-36">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {formatDateLabel(booking.dateKey, lang)}
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--muted)]">
                      {booking.bookingType === "full-day"
                        ? getBookingTypeLabel("full-day", lang)
                        : formatTimeRange(booking.startTime, booking.endTime, lang)}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-[var(--ink)]">
                        {booking.clientName}
                      </p>
                      <ToneBadge tone={bookingTypeTone(booking.bookingType)}>
                        {getBookingTypeLabel(booking.bookingType, lang)}
                      </ToneBadge>
                      <ToneBadge tone={statusTone(booking.status)}>
                        {getBookingStatusLabel(booking.status, lang)}
                      </ToneBadge>
                      <BookingCampaignBadge campaign={booking.campaign} lang={lang} />
                    </div>
                    <p className="mt-1 text-sm font-medium text-[var(--ink)]">
                      {booking.serviceName}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--muted)]">
                      <span>
                        {booking.capacitySnapshot
                          ? `${t.publicFlow.capacity}: ${booking.capacitySnapshot}`
                          : t.admin.capacityNotSet}
                      </span>
                      <span>
                        {booking.cost ? `${t.publicFlow.total}: ${booking.cost}` : t.admin.totalNotSet}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {canReschedule(booking) ? (
                      <ActionButton tone="ghost" onClick={() => onReschedule(booking.id)}>
                        {t.publicFlow.reschedule}
                      </ActionButton>
                    ) : null}
                    <ActionButton tone="danger" onClick={() => onCancel(booking.id)}>
                      {t.common.cancel}
                    </ActionButton>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="grid gap-6">
          <section className={cn(adminPanelClass, "p-5 sm:p-6")}>
            <SectionTitle title={shell.bookingPageTitle} />
            <p className="mt-3 flex items-center gap-2 text-sm text-[var(--muted)]">
              <span
                aria-hidden="true"
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  publishingOff ? "bg-[var(--danger-strong)]" : "bg-[var(--teal)]",
                )}
              />
              {publishingOff ? shell.publishingOff : shell.pageLive}
            </p>
            <p className="mt-3 break-all rounded-2xl bg-[var(--surface-soft)] px-3 py-2 font-mono text-sm text-[var(--ink)]">
              {publicUrl}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton tone="secondary" onClick={onCopyLink}>
                <span className="inline-flex items-center gap-2">
                  {copiedLink ? (
                    <Check aria-hidden="true" size={16} />
                  ) : (
                    <Copy aria-hidden="true" size={16} />
                  )}
                  {copiedLink ? t.publicFlow.copied : t.publicFlow.copyLink}
                </span>
              </ActionButton>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("ghost", "gap-2")}
              >
                <ArrowSquareOut aria-hidden="true" size={16} />
                {t.admin.viewPublicPage}
              </a>
            </div>
          </section>

          {nextSteps.length > 0 ? (
            <section className={cn(adminPanelClass, "p-5 sm:p-6")}>
              <SectionTitle title={shell.nextStepsTitle} />
              <ol className="mt-4 grid gap-3">
                {nextSteps.map((step) => {
                  const stepCopy = shell.nextSteps[step.id];
                  const section = step.section;

                  return (
                    <li key={step.id} className={cn(adminInsetClass, "p-4")}>
                      <p className="text-sm font-semibold text-[var(--ink)]">{stepCopy.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{stepCopy.body}</p>
                      {section && stepCopy.cta ? (
                        <ActionButton
                          tone="primary"
                          className="mt-3"
                          onClick={() => onGoToSection(section)}
                        >
                          {stepCopy.cta}
                        </ActionButton>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
