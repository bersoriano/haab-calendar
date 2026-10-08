"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { analyticsCopy, type AnalyticsCopy } from "@/components/provider/analytics-copy";
import { adminFieldClass, adminInsetClass, adminPanelClass } from "@/components/provider/adminGlass";
import { ActionButton, EmptyState, SectionTitle } from "@/components/ui";
import {
  ANALYTICS_RANGES,
  DEFAULT_ANALYTICS_RANGE,
  buildCampaignUrl,
  conversionRate,
  type AnalyticsRange,
  type AnalyticsSummary,
} from "@/lib/analytics/summary";
import type { ProviderEntitlements } from "@/lib/entitlements/resolve";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Tagged with the request it answers, so a stale answer reads as loading. */
type LoadState =
  | { key: string; status: "error" }
  | { key: string; status: "ready"; summary: AnalyticsSummary };

export type ProviderAnalyticsSurfaceProps = {
  lang: Lang;
  /** Path of the public booking page, e.g. `/professionals/ai-automation`. */
  publicUrl: string;
  integratedMode: boolean;
  /** Resolved server-side. Presentation only — the route re-checks. */
  entitlements?: ProviderEntitlements;
};

/**
 * The Analytics tab: visits, the booking funnel and campaign performance for
 * the provider's public page. Gated on the `analytics` entitlement here for
 * presentation; /api/provider/analytics is what actually enforces it.
 */
export function ProviderAnalyticsSurface({
  lang,
  publicUrl,
  integratedMode,
  entitlements,
}: ProviderAnalyticsSurfaceProps) {
  const t = analyticsCopy[lang];
  const enabled = Boolean(integratedMode && entitlements?.features.analytics?.enabled);

  if (!integratedMode) {
    return <EmptyState title={t.previewTitle} body={t.previewBody} />;
  }

  if (!enabled) {
    return <EmptyState title={t.premiumTitle} body={t.premiumBody} />;
  }

  return <AnalyticsDashboard t={t} lang={lang} publicUrl={publicUrl} />;
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
        const summary = (await response.json()) as AnalyticsSummary;
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
      ) : (
        <AnalyticsReport summary={state.summary} lang={lang} />
      )}

      <CampaignLinkBuilder t={t} publicUrl={publicUrl} />
    </div>
  );
}

/** Presentational: everything below the range picker, from one summary. */
export function AnalyticsReport({ summary, lang }: { summary: AnalyticsSummary; lang: Lang }) {
  const t = analyticsCopy[lang];
  const number = new Intl.NumberFormat(lang === "es" ? "es-MX" : "en-US");
  const { totals } = summary;
  const conversion = conversionRate(totals.bookingVisitors, totals.visitors);

  if (totals.views === 0 && totals.bookings === 0) {
    return <EmptyState title={t.emptyTitle} body={t.emptyBody} />;
  }

  const stats = [
    { label: t.visits, value: number.format(totals.views), detail: t.visitsDetail },
    { label: t.visitors, value: number.format(totals.visitors), detail: t.visitorsDetail },
    { label: t.bookings, value: number.format(totals.bookings), detail: t.bookingsDetail },
    {
      label: t.conversion,
      value: conversion === null ? t.none : `${conversion}%`,
      detail: t.conversionDetail,
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
          </div>
        ))}
      </div>

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
