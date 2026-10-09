"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { analyticsCopy, type AnalyticsCopy } from "@/components/provider/analytics-copy";
import { adminFieldClass, adminInsetClass, adminPanelClass } from "@/components/provider/adminGlass";
import { ActionButton, Alert, EmptyState, SectionTitle } from "@/components/ui";
import {
  ANALYTICS_RANGES,
  DEFAULT_ANALYTICS_RANGE,
  buildCampaignUrl,
  changePercent,
  conversionRate,
  popularTimeHours,
  isAnalyticsTeaser,
  type AnalyticsBookingHealth,
  type AnalyticsPopularTime,
  type AnalyticsRange,
  type AnalyticsResponse,
  type AnalyticsSummary,
  type AnalyticsTeaser,
} from "@/lib/analytics/summary";
import type { ProviderEntitlements } from "@/lib/entitlements/resolve";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Tagged with the request it answers, so a stale answer reads as loading. */
type LoadState =
  | { key: string; status: "error" }
  | { key: string; status: "ready"; summary: AnalyticsResponse };

export type ProviderAnalyticsSurfaceProps = {
  lang: Lang;
  /** Path of the public booking page, e.g. `/professionals/ai-automation`. */
  publicUrl: string;
  integratedMode: boolean;
  /** Resolved server-side. Presentation only — the route re-checks. */
  entitlements?: ProviderEntitlements;
  /** How a Stripe Checkout the provider just left ended. */
  checkoutResult?: "success" | "cancelled";
};

/**
 * The Analytics tab: visits, the booking funnel and campaign performance for
 * the provider's public page. Free plans get their visit totals and an upgrade
 * offer; /api/provider/analytics decides which, from the entitlement.
 */
export function ProviderAnalyticsSurface({
  lang,
  publicUrl,
  integratedMode,
  entitlements,
  checkoutResult,
}: ProviderAnalyticsSurfaceProps) {
  const t = analyticsCopy[lang];

  if (!integratedMode) {
    return <EmptyState title={t.previewTitle} body={t.previewBody} />;
  }

  // Premium is granted by Stripe's webhook, which can land after the redirect.
  // Until the page is reloaded with the new entitlement, say so plainly.
  const awaitingPremium =
    checkoutResult === "success" && !entitlements?.features.analytics?.enabled;

  return (
    <div className="space-y-6">
      {checkoutResult ? (
        <CheckoutResultBanner t={t} result={checkoutResult} awaitingPremium={awaitingPremium} />
      ) : null}
      <AnalyticsDashboard t={t} lang={lang} publicUrl={publicUrl} />
    </div>
  );
}

function CheckoutResultBanner({
  t,
  result,
  awaitingPremium,
}: {
  t: AnalyticsCopy;
  result: "success" | "cancelled";
  awaitingPremium: boolean;
}) {
  if (result === "cancelled") {
    return <Alert tone="neutral">{t.checkoutCancelled}</Alert>;
  }

  return (
    <Alert
      tone="success"
      role="status"
      actions={
        awaitingPremium ? (
          <ActionButton onClick={() => window.location.reload()}>{t.checkoutRefresh}</ActionButton>
        ) : undefined
      }
    >
      {awaitingPremium ? t.checkoutPending : t.checkoutSucceeded}
    </Alert>
  );
}

function AnalyticsDashboard({
  t,
  lang,
  publicUrl,
}: {
  t: AnalyticsCopy;
  lang: Lang;
  publicUrl: string;
}) {
  const [range, setRange] = useState<AnalyticsRange>(DEFAULT_ANALYTICS_RANGE);
  const [loaded, setLoaded] = useState<LoadState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${range}:${reloadKey}`;
  const state = loaded?.key === requestKey ? loaded : null;

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/provider/analytics?range=${range}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`analytics ${response.status}`);
        }
        const summary = (await response.json()) as AnalyticsResponse;
        setLoaded({ key: requestKey, status: "ready", summary });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error("provider_analytics_load_failed", error);
          setLoaded({ key: requestKey, status: "error" });
        }
      });

    return () => controller.abort();
  }, [range, requestKey]);

  return (
    <div className="space-y-6">
      <div className={cn(adminPanelClass, "p-6")}>
        <SectionTitle
          title={t.title}
          body={t.body}
          action={
            <div className="flex gap-2" role="group" aria-label={t.title}>
              {ANALYTICS_RANGES.map((days) => (
                <button
                  key={days}
                  type="button"
                  aria-pressed={range === days}
                  onClick={() => setRange(days)}
                  className={cn(
                    "min-h-11 rounded-2xl px-4 text-sm font-semibold transition",
                    range === days
                      ? "bg-[var(--ink)] text-[var(--background)]"
                      : "bg-[var(--panel-tint-72)] text-[var(--muted)] ring-1 ring-[rgba(193,198,214,0.18)] hover:text-[var(--ink)]",
                  )}
                >
                  {t.rangeLabel(days)}
                </button>
              ))}
            </div>
          }
        />
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{t.privacyNote}</p>
      </div>

      {!state ? (
        <p className="text-sm text-[var(--muted)]" role="status">
          {t.loading}
        </p>
      ) : state.status === "error" ? (
        <EmptyState
          title={t.loadFailed}
          body=""
          action={
            <ActionButton onClick={() => setReloadKey((key) => key + 1)}>{t.retry}</ActionButton>
          }
        />
      ) : isAnalyticsTeaser(state.summary) ? (
        <AnalyticsTeaserReport teaser={state.summary} lang={lang} />
      ) : (
        <AnalyticsReport summary={state.summary} lang={lang} />
      )}

      <CampaignLinkBuilder t={t} publicUrl={publicUrl} />
    </div>
  );
}

/**
 * A believable report to sit behind the blur. Made up on purpose: the real
 * funnel and campaigns never reach a free plan's browser.
 */
const SAMPLE_SUMMARY: AnalyticsSummary = {
  range: 30,
  timeZone: "UTC",
  totals: { views: 412, visitors: 318, serviceSelected: 141, slotSelected: 77, bookings: 38, bookingVisitors: 36 },
  daily: Array.from({ length: 30 }, (_, index) => ({
    day: `sample-${index}`,
    views: 6 + ((index * 7) % 13),
    visitors: 5 + ((index * 5) % 9),
    bookings: index % 3 === 0 ? 2 : 1,
  })),
  campaigns: [
    { source: "instagram", medium: "social", campaign: "spring", views: 188, visitors: 150, bookings: 19 },
    { source: "whatsapp", medium: "message", campaign: "clients", views: 96, visitors: 71, bookings: 11 },
    { source: null, medium: null, campaign: null, views: 128, visitors: 97, bookings: 8 },
  ],
  referrers: [{ host: "instagram.com", views: 160, bookings: 17 }],
  services: [{ serviceId: "sample", name: "—", selections: 141, bookings: 38 }],
  devices: [],
};

export function AnalyticsTeaserReport({ teaser, lang }: { teaser: AnalyticsTeaser; lang: Lang }) {
  const t = analyticsCopy[lang];
  const number = new Intl.NumberFormat(lang === "es" ? "es-MX" : "en-US");
  const stats = [
    { label: t.visits, value: number.format(teaser.totals.views), detail: t.visitsDetail },
    { label: t.visitors, value: number.format(teaser.totals.visitors), detail: t.visitorsDetail },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {stats.map((stat) => (
          <div key={stat.label} className={cn(adminInsetClass, "p-5")}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              {stat.label}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--ink)]">
              {stat.value}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">{stat.detail}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <div
          aria-hidden="true"
          inert
          className="pointer-events-none max-h-[520px] select-none overflow-hidden opacity-60 blur-[6px]"
        >
          <AnalyticsReport summary={SAMPLE_SUMMARY} lang={lang} />
        </div>
        <div className="absolute inset-0 flex items-start justify-center px-4 pt-16">
          <UpgradeCard t={t} />
        </div>
      </div>
    </div>
  );
}

function UpgradeCard({ t }: { t: AnalyticsCopy }) {
  const [status, setStatus] = useState<"idle" | "pending" | "unavailable" | "error">("idle");

  const startCheckout = useCallback(async () => {
    setStatus("pending");
    try {
      const response = await fetch("/api/provider/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ returnTab: "analytics" }),
      });
      if (response.status === 503) {
        setStatus("unavailable");
        return;
      }
      const body = (await response.json()) as { url?: string };
      if (!response.ok || !body.url) {
        throw new Error(`checkout ${response.status}`);
      }
      window.location.assign(body.url);
    } catch (error) {
      console.error("billing_checkout_start_failed", error);
      setStatus("error");
    }
  }, []);

  return (
    <div className={cn(adminPanelClass, "w-full max-w-md p-6 text-center")}>
      <h4 className="text-lg font-semibold text-[var(--ink)]">{t.premiumTitle}</h4>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.premiumBody}</p>
      <ul className="mt-4 space-y-1.5 text-left text-sm text-[var(--ink)]">
        {t.premiumBenefits.map((benefit) => (
          <li key={benefit} className="flex gap-2">
            <span aria-hidden="true" className="text-[var(--primary)]">✓</span>
            {benefit}
          </li>
        ))}
      </ul>
      <ActionButton
        tone="primary"
        className="mt-5 w-full"
        disabled={status === "pending"}
        onClick={startCheckout}
      >
        {status === "pending" ? t.upgradePending : t.upgradeCta}
      </ActionButton>
      {status === "unavailable" ? (
        <p className="mt-3 text-sm text-[var(--muted)]">{t.upgradeUnavailable}</p>
      ) : null}
      {status === "error" ? (
        <p className="mt-3 text-sm text-[var(--danger-strong)]">{t.upgradeFailed}</p>
      ) : null}
    </div>
  );
}

/** Presentational: everything below the range picker, from one summary. */
export function AnalyticsReport({ summary, lang }: { summary: AnalyticsSummary; lang: Lang }) {
  const t = analyticsCopy[lang];
  const number = new Intl.NumberFormat(lang === "es" ? "es-MX" : "en-US");
  const { totals } = summary;
  const conversion = conversionRate(totals.bookingVisitors, totals.visitors);

  if (totals.views === 0 && totals.bookings === 0 && !totals.cancelledBookings) {
    return <EmptyState title={t.emptyTitle} body={t.emptyBody} />;
  }

  const previous = summary.previousTotals;
  const previousConversion = previous
    ? conversionRate(previous.bookingVisitors, previous.visitors)
    : null;
  const percentDelta = (current: number, before: number | undefined) => {
    const change = changePercent(current, before);
    return change === null ? null : { value: change, label: t.vsPrevious(change, summary.range) };
  };

  const stats = [
    {
      label: t.visits,
      value: number.format(totals.views),
      detail: t.visitsDetail,
      delta: percentDelta(totals.views, previous?.views),
    },
    {
      label: t.visitors,
      value: number.format(totals.visitors),
      detail: t.visitorsDetail,
      delta: percentDelta(totals.visitors, previous?.visitors),
    },
    {
      label: t.bookings,
      value: number.format(totals.bookings),
      detail: totals.cancelledBookings
        ? t.bookingsCancelledDetail(totals.cancelledBookings)
        : t.bookingsDetail,
      delta: percentDelta(totals.bookings, previous?.bookings),
    },
    {
      label: t.conversion,
      value: conversion === null ? t.none : `${conversion}%`,
      detail: t.conversionDetail,
      // Percentage points, not percent of a percent: 10% to 12% is "+2 pts".
      delta:
        conversion === null || previousConversion === null
          ? null
          : {
              value: Math.round((conversion - previousConversion) * 10) / 10,
              label: t.vsPreviousPoints(
                Math.round((conversion - previousConversion) * 10) / 10,
                summary.range,
              ),
            },
    },
  ];

  const funnel = [totals.visitors, totals.serviceSelected, totals.slotSelected, totals.bookingVisitors];
  const maxDaily = Math.max(1, ...summary.daily.map((day) => day.views));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className={cn(adminInsetClass, "p-5")}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              {stat.label}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--ink)]">
              {stat.value}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">{stat.detail}</p>
            {stat.delta ? (
              <p
                className={cn(
                  "mt-1 text-xs font-semibold",
                  stat.delta.value > 0 && "text-[var(--success-strong)]",
                  stat.delta.value < 0 && "text-[var(--danger-strong)]",
                  stat.delta.value === 0 && "text-[var(--muted)]",
                )}
              >
                {stat.delta.label}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {summary.bookingHealth || summary.popularTimes ? (
        <div className="grid items-start gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          {summary.bookingHealth ? (
            <BookingHealthPanel health={summary.bookingHealth} lang={lang} />
          ) : null}
          {summary.popularTimes ? (
            <PopularTimesPanel times={summary.popularTimes} lang={lang} />
          ) : null}
        </div>
      ) : null}

      <div className={cn(adminPanelClass, "p-6")}>
        <SectionTitle title={t.dailyTitle} />
        <div className="mt-3 flex gap-4 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-sm bg-[var(--primary)] opacity-35" />
            {t.dailyLegendVisits}
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-sm bg-[var(--primary)]" />
            {t.dailyLegendBookings}
          </span>
        </div>
        <div className="mt-4 flex h-40 items-end gap-[2px]" role="img" aria-label={t.dailyTitle}>
          {summary.daily.map((day) => (
            <div
              key={day.day}
              className="relative flex h-full min-w-0 flex-1 items-end"
              title={`${day.day}: ${day.views} ${t.visits.toLowerCase()}, ${day.bookings} ${t.bookings.toLowerCase()}`}
            >
              <div
                className="w-full rounded-t-[3px] bg-[var(--primary)] opacity-35"
                style={{ height: `${(day.views / maxDaily) * 100}%` }}
              />
              {day.bookings > 0 ? (
                <div
                  className="absolute inset-x-0 bottom-0 rounded-t-[3px] bg-[var(--primary)]"
                  style={{ height: `${(Math.min(day.bookings, day.views || day.bookings) / maxDaily) * 100}%` }}
                />
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-[var(--muted)]">
          <span>{summary.daily[0]?.day}</span>
          <span>{summary.daily.at(-1)?.day}</span>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className={cn(adminPanelClass, "p-6")}>
          <SectionTitle title={t.funnelTitle} body={t.funnelBody} />
          <ol className="mt-5 space-y-3">
            {t.funnelSteps.map((label, index) => {
              const value = funnel[index] ?? 0;
              const share = conversionRate(value, funnel[0] ?? 0) ?? 0;
              return (
                <li key={label}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-[var(--ink)]">{label}</span>
                    <span className="text-[var(--muted)]">
                      {number.format(value)} · {share}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 rounded-full bg-[var(--panel-mute-88)]">
                    <div
                      className="h-full rounded-full bg-[var(--primary)]"
                      style={{ width: `${Math.min(share, 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className={cn(adminPanelClass, "p-6")}>
          <SectionTitle title={t.servicesTitle} />
          <ul className="mt-5 divide-y divide-[var(--line)]">
            {summary.services.length === 0 ? (
              <li className="py-2 text-sm text-[var(--muted)]">{t.none}</li>
            ) : (
              summary.services.map((service) => (
                <li key={service.serviceId} className="flex justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0 truncate font-medium text-[var(--ink)]">{service.name}</span>
                  <span className="shrink-0 text-[var(--muted)]">
                    {number.format(service.selections)} {t.selections} ·{" "}
                    {number.format(service.bookings)} {t.bookings.toLowerCase()}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className={cn(adminPanelClass, "p-6")}>
        <SectionTitle title={t.campaignsTitle} body={t.campaignsBody} />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                {t.campaignColumns.map((column, index) => (
                  <th key={column} className={cn("pb-2 font-semibold", index > 2 && "text-right")}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {summary.campaigns.map((row) => {
                const untagged = !row.source && !row.medium && !row.campaign;
                return (
                  <tr key={`${row.source}|${row.medium}|${row.campaign}`}>
                    {untagged ? (
                      <td className="py-2.5 text-[var(--muted)]" colSpan={3}>
                        {t.direct}
                      </td>
                    ) : (
                      <>
                        <td className="py-2.5 font-medium text-[var(--ink)]">{row.source ?? t.none}</td>
                        <td className="py-2.5 text-[var(--muted)]">{row.medium ?? t.none}</td>
                        <td className="py-2.5 text-[var(--muted)]">{row.campaign ?? t.none}</td>
                      </>
                    )}
                    <td className="py-2.5 text-right">{number.format(row.views)}</td>
                    <td className="py-2.5 text-right font-semibold text-[var(--ink)]">
                      {number.format(row.bookings)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {summary.referrers.length > 0 ? (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-[var(--ink)]">{t.referrersTitle}</h4>
            <ul className="mt-2 flex flex-wrap gap-2">
              {summary.referrers.map((referrer) => (
                <li
                  key={referrer.host}
                  className="rounded-full bg-[var(--panel-mute-88)] px-3 py-1 text-xs text-[var(--muted)]"
                >
                  <span className="font-medium text-[var(--ink)]">{referrer.host}</span> ·{" "}
                  {number.format(referrer.views)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// The origin never changes while the page is open; the server render has none.
const subscribeToNothing = () => () => undefined;
const readOrigin = () => window.location.origin;
const readNoOrigin = () => "";

function BookingHealthPanel({
  health,
  lang,
}: {
  health: AnalyticsBookingHealth;
  lang: Lang;
}) {
  const t = analyticsCopy[lang];
  const rows = [
    { label: t.healthCancellation, count: health.cancelled },
    { label: t.healthReschedule, count: health.rescheduled },
  ];

  return (
    <div className={cn(adminPanelClass, "p-6")}>
      <SectionTitle title={t.healthTitle} body={t.healthBody} />
      <p className="mt-5 text-sm text-[var(--muted)]">
        {t.healthCreated}:{" "}
        <span className="font-semibold text-[var(--ink)]">{health.created}</span>
      </p>
      <dl className="mt-4 space-y-3">
        {rows.map((row) => {
          const rate = conversionRate(row.count, health.created);
          return (
            <div key={row.label}>
              <div className="flex justify-between text-sm">
                <dt className="font-medium text-[var(--ink)]">{row.label}</dt>
                <dd className="text-[var(--muted)]">
                  {rate === null ? t.none : `${rate}%`} · {t.healthOf(row.count, health.created)}
                </dd>
              </div>
              <div className="mt-1.5 h-2.5 rounded-full bg-[var(--panel-mute-88)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)]"
                  style={{ width: `${Math.min(rate ?? 0, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function formatHour(hour: number, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", {
    hour: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, 0, 5, hour)));
}

export function PopularTimesPanel({
  times,
  lang,
}: {
  times: readonly AnalyticsPopularTime[];
  lang: Lang;
}) {
  const t = analyticsCopy[lang];

  if (times.length === 0) {
    return (
      <div className={cn(adminPanelClass, "p-6")}>
        <SectionTitle title={t.timesTitle} body={t.timesBody} />
        <p className="mt-5 text-sm text-[var(--muted)]">{t.timesEmpty}</p>
      </div>
    );
  }

  const hours = popularTimeHours(times);
  const counts = new Map(times.map((time) => [`${time.weekday}:${time.hour}`, time.bookings]));
  const max = Math.max(...times.map((time) => time.bookings));

  return (
    <div className={cn(adminPanelClass, "p-6")}>
      <SectionTitle title={t.timesTitle} body={t.timesBody} />
      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-separate border-spacing-[3px] text-xs">
          <thead>
            <tr>
              <th className="w-10" />
              {hours.map((hour) => (
                <th key={hour} scope="col" className="font-medium text-[var(--muted)]">
                  {hour % 3 === 0 ? formatHour(hour, lang) : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.weekdaysShort.map((weekday, index) => (
              <tr key={weekday}>
                <th scope="row" className="pr-2 text-left font-medium text-[var(--muted)]">
                  {weekday}
                </th>
                {hours.map((hour) => {
                  const count = counts.get(`${index + 1}:${hour}`) ?? 0;
                  const label = t.timesCell(weekday, formatHour(hour, lang), count);
                  return (
                    <td
                      key={hour}
                      title={label}
                      aria-label={label}
                      className="h-6 min-w-5 rounded-[4px] bg-[var(--panel-mute-88)]"
                    >
                      {count > 0 ? (
                        <div
                          className="h-full w-full rounded-[4px] bg-[var(--primary)]"
                          style={{ opacity: 0.2 + 0.8 * (count / max) }}
                        />
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
  );
}

function CampaignLinkBuilder({ t, publicUrl }: { t: AnalyticsCopy; publicUrl: string }) {
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(subscribeToNothing, readOrigin, readNoOrigin);

  const link = origin ? buildCampaignUrl(`${origin}${publicUrl}`, { source, medium, campaign }) : "";

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [link]);

  const fields = [
    { label: t.builderSource, placeholder: t.builderSourcePlaceholder, value: source, set: setSource },
    { label: t.builderMedium, placeholder: t.builderMediumPlaceholder, value: medium, set: setMedium },
    {
      label: t.builderCampaign,
      placeholder: t.builderCampaignPlaceholder,
      value: campaign,
      set: setCampaign,
    },
  ];

  return (
    <div className={cn(adminPanelClass, "p-6")}>
      <SectionTitle title={t.builderTitle} body={t.builderBody} />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {fields.map((field) => (
          <label key={field.label} className="block text-sm font-medium text-[var(--ink)]">
            {field.label}
            <input
              className={cn(adminFieldClass, "mt-2 w-full")}
              value={field.value}
              maxLength={100}
              placeholder={field.placeholder}
              onChange={(event) => field.set(event.target.value)}
            />
          </label>
        ))}
      </div>
      <div className={cn(adminInsetClass, "mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center")}>
        <code className="min-w-0 flex-1 break-all text-sm text-[var(--ink)]">{link}</code>
        <ActionButton tone="primary" disabled={!link} onClick={copyLink}>
          {copied ? t.copied : t.copy}
        </ActionButton>
      </div>
    </div>
  );
}
