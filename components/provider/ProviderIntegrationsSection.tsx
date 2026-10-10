"use client";

import { useCallback, useEffect, useState } from "react";

import { GoogleLogo } from "@phosphor-icons/react";

import { Alert, Badge, Button, Card, CardHeader, ConfirmDialog } from "@/components/app-ui";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { GoogleCalendarCapabilities } from "@/components/provider/GoogleCalendarCapabilities";
import type { StatusTone } from "@/lib/format";
import { hasResolvedEntitlement, type ProviderEntitlements } from "@/lib/entitlements/resolve";
import type { FeatureKey } from "@/lib/entitlements/catalog";
import type { Lang } from "@/lib/types";

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
  className,
}: {
  entitlements?: ProviderEntitlements;
  integratedMode: boolean;
  demoEdit?: boolean;
  /** Extra classes for the card, from the host. */
  className?: string;
  lang?: Lang;
}) {
  const t = bookingTranslations[lang].admin;
  const shell = dashboardCopy[lang];
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
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

  const statusTones: Record<IntegrationAvailability, StatusTone> = {
    available: "success",
    premium_required: "warning",
    unavailable: "neutral",
    publish_required: "neutral",
  };

  return (
    <Card as="section" className={className}>
      <CardHeader title={t.integrationsTitle} description={t.integrationsBody} />
      <ul role="list" className="divide-y divide-app-border">
        {INTEGRATIONS.map((integration) => {
          const availability = resolveIntegrationAvailability({
            entitlements,
            integratedMode,
            featureKey: integration.featureKey,
          });

          return (
            <li key={integration.key} className="grid gap-4 px-4 py-5 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <GoogleLogo aria-hidden="true" size={20} weight="bold" className="text-app-fg-secondary" />
                <h3 className="text-sm font-semibold text-app-fg">{t.googleCalendarName}</h3>
                {/* Text, not only colour: the status has to survive a screen
                    reader and a monochrome display. */}
                <Badge tone={statusTones[availability]}>{statusLabels[availability]}</Badge>
                {availability === "available" ? (
                  <Badge tone={connection?.connected ? "success" : "neutral"} dot>
                    {connection?.connected ? t.googleConnected : t.integrationNotConnected}
                  </Badge>
                ) : null}
                {demoEdit ? <Badge tone="neutral">{t.integrationReadOnly}</Badge> : null}
              </div>
              <p className="text-sm text-app-fg-muted">{t.googleCalendarDescription}</p>
              {availability === "available" && !demoEdit ? (
                <div className="grid gap-4">
                  {failed ? (
                    <Alert tone="danger" role="alert">
                      {t.googleConnectionFailed}
                    </Alert>
                  ) : null}

                  {!connection ? (
                    <div>
                      <Button
                        // A real navigation, not a client-side route change: the
                        // target is a Route Handler that redirects to Google, and
                        // Link would try to render it as a page.
                        onClick={() => {
                          window.location.assign("/api/google/oauth/start");
                        }}
                        data-google-connect="/api/google/oauth/start"
                      >
                        {t.googleConnect}
                      </Button>
                    </div>
                  ) : null}

                  {connection && !connection.connected && calendars.length > 0 ? (
                    <div className="grid gap-2">
                      <p className="text-sm font-medium text-app-fg">{t.googleChooseCalendar}</p>
                      <p className="text-sm text-app-fg-muted">{t.googleChooseCalendarHelp}</p>
                      <ul role="list" className="flex flex-wrap gap-2">
                        {calendars.map((calendar) => (
                          <li key={calendar.id}>
                            <Button variant="secondary" disabled={busy} onClick={() => chooseCalendar(calendar.id)}>
                              {calendar.summary}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {connection?.connected ? (
                    <div className="flex flex-col gap-3 rounded-lg bg-app-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-app-fg-muted">
                        {t.googleWritesTo}{" "}
                        <span className="font-medium text-app-fg">{connection.calendarSummary}</span>
                      </p>
                      <Button variant="danger-plain" size="sm" disabled={busy} onClick={() => setConfirmDisconnect(true)}>
                        {t.googleDisconnect}
                      </Button>
                    </div>
                  ) : null}

                  {connection?.status === "needs_reauth" ? (
                    <Alert tone="warning">{t.googleNeedsReauth}</Alert>
                  ) : null}

                  {/* Only once there is a calendar to read from and write to:
                      neither capability means anything before that. */}
                  <GoogleCalendarCapabilities lang={lang} connected={Boolean(connection?.connected)} />
                </div>
              ) : (
                <div>
                  <Button variant="secondary" disabled>
                    {t.comingSoon}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={confirmDisconnect}
        title={shell.disconnectGoogleTitle}
        body={shell.disconnectGoogleBody}
        confirmLabel={t.googleDisconnect}
        cancelLabel={shell.keepConnected}
        closeLabel={shell.closeDialog}
        tone="danger"
        pending={busy}
        onConfirm={async () => {
          await disconnect();
          setConfirmDisconnect(false);
        }}
        onCancel={() => setConfirmDisconnect(false)}
      />
    </Card>
  );
}
