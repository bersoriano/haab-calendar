"use client";

import { ArrowRight, CalendarBlank, Check, Copy } from "@phosphor-icons/react";
import type { MouseEvent } from "react";

import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  IconButton,
  Input,
  StackedList,
  StackedListItem,
  Stat,
  StatGroup,
} from "@/components/app-ui";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { CampaignBadge } from "@/components/provider/CampaignBadge";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { getWeekdayShortFormatter } from "@/lib/constants";
import type { NextStep } from "@/lib/dashboard-overview";
import { pathForSection } from "@/lib/dashboard-routes";
import { parseDateKey } from "@/lib/date";
import {
  bookingStatusBadgeTone,
  bookingTypeBadgeTone,
  formatTimeRange,
  getBookingStatusLabel,
  getBookingTypeLabel,
} from "@/lib/format";
import { shouldInterceptNavClick } from "@/lib/nav-click";
import type { AdminTab, BookingRecord, Lang } from "@/lib/types";
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

  /** Real links; a plain click stays in the app without a page load. */
  function sectionLink(section: AdminTab) {
    return {
      href: pathForSection(section),
      linkLabel: shell.viewAll,
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        if (
          shouldInterceptNavClick({
            button: event.button,
            metaKey: event.metaKey,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            defaultPrevented: event.defaultPrevented,
            target: event.currentTarget.target,
          })
        ) {
          event.preventDefault();
          onGoToSection(section);
        }
      },
    };
  }

  return (
    <div className="grid gap-6">
      <StatGroup columns={4}>
        <Stat
          label={t.admin.upcoming7Days}
          value={stats.upcoming}
          detail={copy.phrases.bookingsSoonDetail}
          {...sectionLink("bookings")}
        />
        <Stat
          label={copy.Services}
          value={stats.services}
          detail={copy.phrases.servicesStatDetail}
          {...sectionLink("services")}
        />
        <Stat label={t.admin.confirmed} value={stats.confirmed} detail={copy.phrases.activeBookingsDetail} />
        <Stat label={copy.phrases.totalBookingsLabel} value={stats.total} detail={t.admin.allTimeEveryStatus} />
      </StatGroup>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card as="section">
          <CardHeader
            title={copy.phrases.upcomingTitle}
            actions={
              <Button
                variant="plain"
                size="sm"
                onClick={onSeeAllBookings}
                className="flex-row-reverse"
                leadingIcon={<ArrowRight aria-hidden="true" size={16} />}
              >
                {shell.seeAll}
              </Button>
            }
          />
          {upcomingBookings.length === 0 ? (
            <EmptyState
              icon={<CalendarBlank aria-hidden="true" size={32} />}
              title={copy.phrases.upcomingEmptyTitle}
              body={copy.phrases.upcomingEmptyBody}
            />
          ) : (
            <StackedList>
              {upcomingBookings.map((booking) => {
                const date = parseDateKey(booking.dateKey);

                return (
                  <StackedListItem
                    key={booking.id}
                    leading={
                      <div className="grid size-12 place-items-center rounded-lg bg-app-subtle text-center leading-none">
                        <span className="text-[0.65rem] font-semibold uppercase text-app-fg-muted">
                          {getWeekdayShortFormatter(lang).format(date)}
                        </span>
                        <span className="text-lg font-semibold text-app-fg tabular-nums">{date.getDate()}</span>
                      </div>
                    }
                    trailing={
                      <>
                        {canReschedule(booking) ? (
                          <Button variant="secondary" size="sm" onClick={() => onReschedule(booking.id)}>
                            {t.publicFlow.reschedule}
                          </Button>
                        ) : null}
                        <Button variant="danger-plain" size="sm" onClick={() => onCancel(booking.id)}>
                          {t.common.cancel}
                        </Button>
                      </>
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-app-fg">{booking.clientName}</p>
                      <Badge tone={bookingTypeBadgeTone(booking.bookingType)}>
                        {getBookingTypeLabel(booking.bookingType, lang)}
                      </Badge>
                      <Badge tone={bookingStatusBadgeTone(booking.status)}>
                        {getBookingStatusLabel(booking.status, lang)}
                      </Badge>
                      <CampaignBadge campaign={booking.campaign} lang={lang} />
                    </div>
                    <p className="mt-1 text-sm text-app-fg-secondary">
                      {booking.bookingType === "full-day"
                        ? getBookingTypeLabel("full-day", lang)
                        : formatTimeRange(booking.startTime, booking.endTime, lang)}
                      {" · "}
                      {booking.serviceName}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-app-fg-muted">
                      <span>
                        {booking.capacitySnapshot
                          ? `${t.publicFlow.capacity}: ${booking.capacitySnapshot}`
                          : t.admin.capacityNotSet}
                      </span>
                      <span>
                        {booking.cost ? `${t.publicFlow.total}: ${booking.cost}` : t.admin.totalNotSet}
                      </span>
                    </p>
                  </StackedListItem>
                );
              })}
            </StackedList>
          )}
        </Card>

        <aside className="grid gap-6">
          <Card as="section">
            <CardHeader
              title={shell.bookingPageTitle}
              actions={
                <Badge tone={publishingOff ? "danger" : "success"} dot>
                  {publishingOff ? shell.publishingOff : shell.pageLive}
                </Badge>
              }
            />
            <CardBody className="grid gap-4">
              <Input
                readOnly
                value={publicUrl}
                aria-label={shell.bookingPageTitle}
                className="font-mono"
                trailingAddon={
                  <IconButton
                    label={copiedLink ? t.publicFlow.copied : t.publicFlow.copyLink}
                    icon={
                      copiedLink ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />
                    }
                    size="sm"
                    onClick={onCopyLink}
                  />
                }
              />
              <ButtonLink href={publicUrl} external newTabLabel={shell.opensInNewTab} variant="secondary">
                {t.admin.viewPublicPage}
              </ButtonLink>
            </CardBody>
          </Card>

          {nextSteps.length > 0 ? (
            <Card as="section">
              <CardHeader title={shell.nextStepsTitle} />
              <StackedList>
                {nextSteps.map((step) => {
                  const stepCopy = shell.nextSteps[step.id];
                  const section = step.section;

                  return (
                    <StackedListItem key={step.id} className="sm:flex-col sm:items-start">
                      <p className="text-sm font-semibold text-app-fg">{stepCopy.title}</p>
                      <p className="mt-1 text-sm text-app-fg-muted">{stepCopy.body}</p>
                      {section && stepCopy.cta ? (
                        <Button variant="soft" size="sm" className="mt-3" onClick={() => onGoToSection(section)}>
                          {stepCopy.cta}
                        </Button>
                      ) : null}
                    </StackedListItem>
                  );
                })}
              </StackedList>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
