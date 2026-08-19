"use client";

import { useCallback, useEffect, useState } from "react";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

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
    <div className="mt-4 grid gap-5 border-t border-[var(--line)] pt-4">
      {failed ? (
        <p className="text-xs font-medium text-rose-700" role="alert">
          {failed}
        </p>
      ) : null}

      {/* ── Busy blocking ─────────────────────────────────────────────── */}
      {capabilities.busyBlockingAvailable ? (
        <section className="grid gap-2">
          <h5 className="text-sm font-semibold text-[var(--ink)]">{t.googleBusyTitle}</h5>
          <p className="text-xs leading-5 text-[var(--muted)]">{t.googleBusyBody}</p>

          <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
            <input
              type="checkbox"
              disabled={busy}
              checked={capabilities.busyBlockingEnabled}
              onChange={(event) =>
                void save({ busyBlockingEnabled: event.target.checked })
              }
              className="size-4"
            />
            {t.googleBusyEnable}
          </label>

          {capabilities.busyBlockingEnabled ? (
            <div className="mt-1 grid gap-2">
              <p className="text-sm font-medium text-[var(--ink)]">{t.googleBusyChoose}</p>
              <p className="text-xs leading-5 text-[var(--muted)]">
                {t.googleBusyChooseHelp}
              </p>

              {calendars.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">{t.googleBusyNoCalendars}</p>
              ) : (
                <ul className="grid gap-1">
                  {calendars.map((calendar) => {
                    const checked = selected.has(calendar.id);
                    const source = capabilities.busySources.find(
                      (entry) => entry.calendarId === calendar.id,
                    );

                    return (
                      <li key={calendar.id}>
                        <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                          <input
                            type="checkbox"
                            // At the cap, the only allowed change is removal.
                            disabled={busy || (!checked && atLimit)}
                            checked={checked}
                            onChange={() => toggleCalendar(calendar.id)}
                            className="size-4"
                          />
                          <span>{calendar.summary}</span>
                          {source?.lastErrorCode ? (
                            <span className="text-xs font-medium text-amber-800">
                              {t.googleBusySourceFailed}
                            </span>
                          ) : null}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}

              <p
                className={cn(
                  "text-xs",
                  atLimit ? "font-medium text-amber-800" : "text-[var(--muted)]",
                )}
              >
                {t.googleBusyLimit}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── Two-way ───────────────────────────────────────────────────── */}
      {capabilities.twoWayAvailable ? (
        <section className="grid gap-2">
          <h5 className="text-sm font-semibold text-[var(--ink)]">{t.googleTwoWayTitle}</h5>
          <p className="text-xs leading-5 text-[var(--muted)]">{t.googleTwoWayBody}</p>

          <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
            <input
              type="checkbox"
              disabled={busy}
              checked={capabilities.twoWayEnabled}
              onChange={(event) => void save({ twoWayEnabled: event.target.checked })}
              className="size-4"
            />
            {t.googleTwoWayEnable}
          </label>

          {capabilities.twoWayEnabled ? (
            <div className="grid gap-1 pl-6">
              <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={capabilities.deletionCancelsBooking}
                  onChange={(event) =>
                    void save({ deletionCancelsBooking: event.target.checked })
                  }
                  className="size-4"
                />
                {t.googleTwoWayDeletion}
              </label>
              <p className="text-xs leading-5 text-[var(--muted)]">
                {t.googleTwoWayDeletionHelp}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── Conflicts ─────────────────────────────────────────────────── */}
      {capabilities.twoWayEnabled ? (
        <section className="grid gap-2">
          <h5 className="text-sm font-semibold text-[var(--ink)]">
            {t.googleConflictsTitle}
          </h5>
          <p className="text-xs leading-5 text-[var(--muted)]">{t.googleConflictsBody}</p>

          {capabilities.conflicts.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">{t.googleConflictsNone}</p>
          ) : (
            <ul className="grid gap-1">
              {capabilities.conflicts.map((conflict) => (
                <li
                  key={conflict.id}
                  className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]"
                >
                  <span className="font-medium text-[var(--ink)]">
                    {conflict.bookingDate ?? ""}
                    {conflict.bookingStartTime ? ` ${conflict.bookingStartTime}` : ""}
                  </span>
                  <span>{conflictLabel(conflict.conflictType, t)}</span>
                  {conflict.status === "repairing" ? (
                    <span className="text-amber-800">{t.googleConflictRepairing}</span>
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
