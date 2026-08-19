"use client";

import { useCallback, useEffect, useState } from "react";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { adminInsetClass } from "@/components/provider/adminGlass";
import { GoogleCalendarCapabilities } from "@/components/provider/GoogleCalendarCapabilities";
import { SectionTitle } from "@/components/ui";
import { hasResolvedEntitlement, type ProviderEntitlements } from "@/lib/entitlements/resolve";
import type { FeatureKey } from "@/lib/entitlements/catalog";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * What an integration's card is allowed to say about itself.
 *
 * `unavailable` is the answer whenever entitlements could not be resolved: an
 * unknown answer about paid access is a no, never a yes.
 */
export type IntegrationAvailability =
  | "available"
  | "premium_required"
  | "unavailable"
  | "publish_required";

type Integration = {
  key: "google_calendar";
  featureKey: FeatureKey;
};

const INTEGRATIONS: readonly Integration[] = [
  { key: "google_calendar", featureKey: "google_calendar_sync" },
];

export function resolveIntegrationAvailability(input: {
  entitlements?: ProviderEntitlements;
  integratedMode: boolean;
  featureKey: FeatureKey;
}): IntegrationAvailability {
  // A browser-owned draft has no provider to hold an entitlement, so there is
  // nothing to connect to yet.
  if (!input.integratedMode) {
    return "publish_required";
  }

  if (!input.entitlements) {
    return "unavailable";
  }

  return hasResolvedEntitlement(input.entitlements, input.featureKey)
    ? "available"
    : "premium_required";
}

/**
 * The integrations Haab can work with, and whether this provider may use them.
 *
 * Display only: eligibility comes from the resolved snapshot the server passed
 * down, and nothing here talks to Google or to Supabase. When a connection flow
 * is built it will re-authenticate the owner and re-resolve the entitlement
 * server-side — this card's answer is never the authorization.
 */
type ConnectionView = {
  connected: boolean;
  status: "connected" | "needs_reauth" | "paused" | "disconnected";
  accountEmail: string | null;
  calendarSummary: string | null;
};

type CalendarOption = { id: string; summary: string; primary: boolean };

export function ProviderIntegrationsSection({
  entitlements,
  integratedMode,
  demoEdit = false,
  lang = "en",
}: {
  entitlements?: ProviderEntitlements;
  integratedMode: boolean;
  demoEdit?: boolean;
  lang?: Lang;
}) {
  const t = bookingTranslations[lang].admin;
  const [connection, setConnection] = useState<ConnectionView | null>(null);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const googleAvailable =
    integratedMode &&
    Boolean(entitlements) &&
    hasResolvedEntitlement(entitlements!, "google_calendar_sync");

  const load = useCallback(async () => {
    // Only asked for when the provider could act on the answer: an unentitled
    // or standalone workspace has nothing to connect.
    if (!googleAvailable || demoEdit) return;

    try {
      const response = await fetch("/api/google/connection");
      if (!response.ok) return;

      const body = (await response.json()) as {
        connection?: ConnectionView | null;
        calendars?: CalendarOption[];
      };
      setConnection(body.connection ?? null);
      setCalendars(body.calendars ?? []);
    } catch {
      setFailed(true);
    }
  }, [demoEdit, googleAvailable]);

  useEffect(() => {
    // Deferred rather than called inline: an effect that sets state during the
    // same tick makes React render twice for nothing.
    let cancelled = false;

    const timer = setTimeout(() => {
      if (!cancelled) void load();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [load]);

  async function chooseCalendar(calendarId: string) {
    setBusy(true);
    setFailed(false);

    try {
      const response = await fetch("/api/google/connection", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ calendarId }),
      });

      if (!response.ok) throw new Error("failed");
      await load();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setFailed(false);

    try {
      const response = await fetch("/api/google/connection", { method: "DELETE" });

      // Checked before clearing anything: a failed disconnect that still
      // emptied the UI would tell the provider their calendar was released
      // when it was not.
      if (!response.ok) throw new Error("failed");

      setConnection(null);
      setCalendars([]);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const statusLabels: Record<IntegrationAvailability, string> = {
    available: t.integrationAvailable,
    premium_required: t.integrationPremiumRequired,
    unavailable: t.integrationUnavailable,
    publish_required: t.integrationPublishRequired,
  };

  const statusTones: Record<IntegrationAvailability, string> = {
    available: "bg-emerald-100 text-emerald-800",
    premium_required: "bg-amber-100 text-amber-900",
    unavailable: "bg-slate-100 text-slate-700",
    publish_required: "bg-slate-100 text-slate-700",
  };

  return (
    <section className="mt-6 border-t border-[var(--line)] pt-6">
      <SectionTitle title={t.integrationsTitle} body={t.integrationsBody} />
      <ul className="mt-4 grid gap-3">
        {INTEGRATIONS.map((integration) => {
          const availability = resolveIntegrationAvailability({
            entitlements,
            integratedMode,
            featureKey: integration.featureKey,
          });

          return (
            <li key={integration.key} className={cn(adminInsetClass, "p-5")}>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold text-[var(--ink)]">
                  {t.googleCalendarName}
                </h4>
                {/* Text, not only colour: the status has to survive a screen
                    reader and a monochrome display. */}
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-1 text-[11px] font-semibold",
                    statusTones[availability],
                  )}
                >
                  {statusLabels[availability]}
                </span>
                {availability === "available" ? (
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-1 text-[11px] font-semibold",
                      connection?.connected
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-700",
                    )}
                  >
                    {connection?.connected ? t.googleConnected : t.integrationNotConnected}
                  </span>
                ) : null}
                {demoEdit ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                    {t.integrationReadOnly}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {t.googleCalendarDescription}
              </p>
              {availability === "available" && !demoEdit ? (
                <div className="mt-3 grid gap-3">
                  {failed ? (
                    <p className="text-xs font-medium text-rose-700" role="alert">
                      {t.googleConnectionFailed}
                    </p>
                  ) : null}

                  {!connection ? (
                    <button
                      type="button"
                      // A real navigation, not a client-side route change: the
                      // target is a Route Handler that redirects to Google, and
                      // Link would try to render it as a page.
                      onClick={() => {
                        window.location.assign("/api/google/oauth/start");
                      }}
                      data-google-connect="/api/google/oauth/start"
                      className="inline-flex min-h-11 w-fit items-center rounded-2xl bg-[var(--ink)] px-4 text-sm font-semibold text-white"
                    >
                      {t.googleConnect}
                    </button>
                  ) : null}

                  {connection && !connection.connected && calendars.length > 0 ? (
                    <div className="grid gap-2">
                      <p className="text-sm font-medium text-[var(--ink)]">
                        {t.googleChooseCalendar}
                      </p>
                      <p className="text-xs leading-5 text-[var(--muted)]">
                        {t.googleChooseCalendarHelp}
                      </p>
                      <ul className="grid gap-2">
                        {calendars.map((calendar) => (
                          <li key={calendar.id}>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => chooseCalendar(calendar.id)}
                              className="inline-flex min-h-11 items-center rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] disabled:cursor-wait disabled:opacity-60"
                            >
                              {calendar.summary}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {connection?.connected ? (
                    <div className="grid gap-2">
                      <p className="text-sm text-[var(--muted)]">
                        {t.googleWritesTo}{" "}
                        <span className="font-medium text-[var(--ink)]">
                          {connection.calendarSummary}
                        </span>
                      </p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={disconnect}
                        className="inline-flex min-h-11 w-fit items-center rounded-2xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 disabled:cursor-wait disabled:opacity-60"
                      >
                        {t.googleDisconnect}
                      </button>
                    </div>
                  ) : null}

                  {connection?.status === "needs_reauth" ? (
                    <p className="text-xs font-medium text-amber-800">
                      {t.googleNeedsReauth}
                    </p>
                  ) : null}

                  {/* Only once there is a calendar to read from and write to:
                      neither capability means anything before that. */}
                  <GoogleCalendarCapabilities
                    lang={lang}
                    connected={Boolean(connection?.connected)}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-3 inline-flex min-h-11 items-center rounded-2xl border border-[var(--line)] bg-[var(--surface-lowest)] px-4 text-sm font-semibold text-[var(--muted)] disabled:cursor-not-allowed"
                >
                  {t.comingSoon}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
