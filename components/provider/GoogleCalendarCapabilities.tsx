"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert, Badge, Checkbox, Field, Switch } from "@/components/app-ui";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { Lang } from "@/lib/types";

/**
 * The two capabilities a provider switches on after connecting.
 *
 * Both are consequential in ways a toggle label cannot carry on its own, so
 * each says what it will actually do before it is switched on: which calendars
 * get read, and that a change made in Google will move an appointment a client
 * has already been told about.
 *
 * This component decides nothing. Every answer — whether the plan includes the
 * feature, whether a calendar may be read, what happened to a change — comes
 * from the server, and a refusal here is a display of the server's refusal.
 */

type BusySource = {
  id: string;
  calendarId: string;
  summary: string;
  enabled: boolean;
  lastRefreshedAt: string | null;
  lastErrorCode: string | null;
};

type Conflict = {
  id: string;
  conflictType: string;
  status: string;
  createdAt: string;
  bookingDate: string | null;
  bookingStartTime: string | null;
};

export type Capabilities = {
  busyBlockingEnabled: boolean;
  twoWayEnabled: boolean;
  deletionCancelsBooking: boolean;
  busyBlockingAvailable: boolean;
  twoWayAvailable: boolean;
  busySources: BusySource[];
  maxBusySources: number;
  conflicts: Conflict[];
};

type CalendarOption = { id: string; summary: string; primary: boolean };

type Admin = (typeof bookingTranslations)["en"]["admin"];

export function GoogleCalendarCapabilities({
  lang = "en",
  connected,
}: {
  lang?: Lang;
  connected: boolean;
}) {
  const t = bookingTranslations[lang].admin;
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!connected) return;

    try {
      const response = await fetch("/api/google/capabilities");
      if (!response.ok) return;

      const body = (await response.json()) as {
        capabilities?: Capabilities | null;
        calendars?: CalendarOption[];
      };

      setCapabilities(body.capabilities ?? null);
      setCalendars(body.calendars ?? []);
    } catch {
      setFailed(t.googleSaveFailed);
    }
  }, [connected, t.googleSaveFailed]);

  useEffect(() => {
    // Deferred so the effect does not set state in the same tick it runs in.
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) void load();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [load]);

  async function save(update: Record<string, unknown>) {
    setBusy(true);
    setFailed(null);

    try {
      const response = await fetch("/api/google/capabilities", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(update),
      });

      const body = (await response.json()) as {
        capabilities?: Capabilities;
        userMessage?: string;
      };

      if (!response.ok) {
        // The server's own words: it knows whether this was a plan, a
        // prerequisite, or a calendar it will not read.
        setFailed(body.userMessage ?? t.googleSaveFailed);
        return;
      }

      setCapabilities(body.capabilities ?? null);
    } catch {
      setFailed(t.googleSaveFailed);
    } finally {
      setBusy(false);
    }
  }

  if (!connected || !capabilities) {
    return null;
  }

  const selected = new Set(
    capabilities.busySources.filter((source) => source.enabled).map((s) => s.calendarId),
  );

  function toggleCalendar(calendarId: string) {
    const next = new Set(selected);

    if (next.has(calendarId)) {
      next.delete(calendarId);
    } else {
      next.add(calendarId);
    }

    void save({ busyCalendarIds: Array.from(next) });
  }

  const atLimit = selected.size >= capabilities.maxBusySources;

  return (
    <div className="grid gap-5 border-t border-app-border pt-4">
      {failed ? (
        <Alert tone="danger" role="alert">
          {failed}
        </Alert>
      ) : null}

      {/* ── Busy blocking ─────────────────────────────────────────────── */}
      {capabilities.busyBlockingAvailable ? (
        <section className="grid gap-3">
          <div>
            <h4 className="text-sm font-semibold text-app-fg">{t.googleBusyTitle}</h4>
            <p className="mt-1 text-sm text-app-fg-muted">{t.googleBusyBody}</p>
          </div>

          <Field label={t.googleBusyEnable} inline>
            <Switch
              disabled={busy}
              checked={capabilities.busyBlockingEnabled}
              onChange={(event) => void save({ busyBlockingEnabled: event.target.checked })}
            />
          </Field>

          {capabilities.busyBlockingEnabled ? (
            <div className="grid gap-2 rounded-lg bg-app-subtle p-4">
              <p className="text-sm font-medium text-app-fg">{t.googleBusyChoose}</p>
              <p className="text-sm text-app-fg-muted">{t.googleBusyChooseHelp}</p>

              {calendars.length === 0 ? (
                <p className="text-sm text-app-fg-muted">{t.googleBusyNoCalendars}</p>
              ) : (
                <ul role="list" className="grid gap-1">
                  {calendars.map((calendar) => {
                    const checked = selected.has(calendar.id);
                    const source = capabilities.busySources.find((entry) => entry.calendarId === calendar.id);

                    return (
                      <li key={calendar.id} className="flex flex-wrap items-center gap-2">
                        <Field label={calendar.summary} inline>
                          <Checkbox
                            // At the cap, the only allowed change is removal.
                            disabled={busy || (!checked && atLimit)}
                            checked={checked}
                            onChange={() => toggleCalendar(calendar.id)}
                          />
                        </Field>
                        {source?.lastErrorCode ? (
                          <Badge tone="warning">{t.googleBusySourceFailed}</Badge>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className={atLimit ? "text-sm font-medium text-app-warning-fg" : "text-sm text-app-fg-muted"}>
                {t.googleBusyLimit}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── Two-way ───────────────────────────────────────────────────── */}
      {capabilities.twoWayAvailable ? (
        <section className="grid gap-3">
          <div>
            <h4 className="text-sm font-semibold text-app-fg">{t.googleTwoWayTitle}</h4>
            <p className="mt-1 text-sm text-app-fg-muted">{t.googleTwoWayBody}</p>
          </div>

          <Field label={t.googleTwoWayEnable} inline>
            <Switch
              disabled={busy}
              checked={capabilities.twoWayEnabled}
              onChange={(event) => void save({ twoWayEnabled: event.target.checked })}
            />
          </Field>

          {capabilities.twoWayEnabled ? (
            <Field label={t.googleTwoWayDeletion} description={t.googleTwoWayDeletionHelp} inline className="pl-14">
              <Switch
                disabled={busy}
                checked={capabilities.deletionCancelsBooking}
                onChange={(event) => void save({ deletionCancelsBooking: event.target.checked })}
              />
            </Field>
          ) : null}
        </section>
      ) : null}

      {/* ── Conflicts ─────────────────────────────────────────────────── */}
      {capabilities.twoWayEnabled ? (
        <section className="grid gap-2">
          <div>
            <h4 className="text-sm font-semibold text-app-fg">{t.googleConflictsTitle}</h4>
            <p className="mt-1 text-sm text-app-fg-muted">{t.googleConflictsBody}</p>
          </div>

          {capabilities.conflicts.length === 0 ? (
            <p className="text-sm text-app-fg-muted">{t.googleConflictsNone}</p>
          ) : (
            <ul role="list" className="divide-y divide-app-border rounded-lg ring-1 ring-app-border">
              {capabilities.conflicts.map((conflict) => (
                <li key={conflict.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm text-app-fg-muted">
                  <span className="font-medium text-app-fg tabular-nums">
                    {conflict.bookingDate ?? ""}
                    {conflict.bookingStartTime ? ` ${conflict.bookingStartTime}` : ""}
                  </span>
                  <span>{conflictLabel(conflict.conflictType, t)}</span>
                  {conflict.status === "repairing" ? (
                    <Badge tone="warning">{t.googleConflictRepairing}</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

/**
 * A conflict code, as a sentence a provider can act on.
 *
 * Only the codes with a distinct thing to say get their own line; the rest
 * share one honest sentence rather than being rendered as a database value.
 */
function conflictLabel(conflictType: string, t: Admin): string {
  switch (conflictType) {
    case "duration_changed":
      return t.googleConflictDuration;
    case "haab_booking_overlap":
    case "capacity_conflict":
    case "outside_business_hours":
    case "google_busy_overlap":
      return t.googleConflictOccupied;
    case "deletion_not_allowed":
      return t.googleConflictDeletion;
    default:
      return t.googleConflictOther;
  }
}
