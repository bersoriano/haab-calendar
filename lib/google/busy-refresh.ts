import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hasEntitlement } from "@/lib/entitlements/server";
import type { GoogleCalendarClient } from "@/lib/google/calendar-client";
import {
  createClientForConnection,
  getConnection,
  type GoogleConnectionRow,
} from "@/lib/google/connections";
import { logger, type Logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Refreshing a provider's cached busy time from Google.
 *
 * The horizon is bounded and the write is generational: intervals for a source
 * are written under a fresh generation, and only once every one has landed does
 * that generation become the authoritative one. Availability therefore never
 * reads a half-written refresh, and a failed refresh leaves the previous
 * snapshot exactly as it was — stale is a state the caller can reason about,
 * whereas partial is not.
 */

/** Starts slightly in the past so an in-progress meeting still blocks. */
const HORIZON_PAST_HOURS = 24;
const DEFAULT_HORIZON_DAYS = 90;
/** Google will accept more, but nothing here books a year out. */
const MAX_HORIZON_DAYS = 365;

export type BusySourceRow = {
  id: string;
  provider_id: string;
  connection_id: string;
  connection_generation: string;
  calendar_id: string;
  enabled: boolean;
};

export type BusyRefreshSummary = {
  refreshed: number;
  intervals: number;
  failedSources: number;
  skipped?: string;
};

export function busyHorizon(now: Date, days = DEFAULT_HORIZON_DAYS) {
  const bounded = Math.min(Math.max(days, 1), MAX_HORIZON_DAYS);

  return {
    timeMin: new Date(now.getTime() - HORIZON_PAST_HOURS * 3_600_000).toISOString(),
    timeMax: new Date(now.getTime() + bounded * 86_400_000).toISOString(),
  };
}

/**
 * Refreshes every enabled source for one provider.
 *
 * All sources go in one FreeBusy request — Google accepts up to fifty calendars
 * and the selection cap is far below that, so a provider costs one call however
 * many calendars they picked. A burst of notifications therefore cannot turn
 * into a burst of requests.
 */
export async function refreshProviderBusySnapshot(
  input: {
    providerId: string;
    client?: SupabaseClient;
    createClient?: (connection: GoogleConnectionRow) => Promise<GoogleCalendarClient>;
    now?: Date;
    horizonDays?: number;
    logger?: Logger;
  },
): Promise<BusyRefreshSummary> {
  const admin = input.client ?? createAdminClient();
  const now = input.now ?? new Date();
  const log = (input.logger ?? logger).child({ providerId: input.providerId });
  const summary: BusyRefreshSummary = { refreshed: 0, intervals: 0, failedSources: 0 };

  const connection = await getConnection(input.providerId, admin);

  if (!connection || connection.status !== "connected") {
    return { ...summary, skipped: "no_active_connection" };
  }

  // Re-resolved here rather than trusted from whatever queued this: a paused
  // entitlement must stop reading the provider's calendar immediately, not at
  // the next UI render.
  const entitled = await hasEntitlement(
    input.providerId,
    "google_calendar_busy_blocking",
    admin,
  );

  if (!entitled) {
    return { ...summary, skipped: "not_entitled" };
  }

  const { data: sources, error } = await admin
    .from("provider_google_calendar_busy_sources")
    .select("id, provider_id, connection_id, connection_generation, calendar_id, enabled")
    .eq("provider_id", input.providerId)
    .eq("connection_generation", connection.connection_generation)
    .eq("enabled", true)
    .returns<BusySourceRow[]>();

  if (error) {
    throw new Error("Could not load Google busy sources.");
  }

  // The calendar Haab writes to is never its own busy source. Haab's events on
  // it are Haab's bookings, and those are already enforced by the booking
  // layer; counting them again would make a service with room for two look
  // full after one, and would let a booking block its own reschedule.
  const readable = (sources ?? []).filter(
    (source) => source.calendar_id !== connection.target_calendar_id,
  );

  if (!readable.length) {
    return { ...summary, skipped: "no_sources" };
  }

  log.info("google.busy.refresh_started", { sources: readable.length });

  const google =
    (await input.createClient?.(connection)) ??
    (await createClientForConnection(connection, { client: admin }));

  const { timeMin, timeMax } = busyHorizon(now, input.horizonDays);

  const result = await google.queryFreeBusy({
    timeMin,
    timeMax,
    calendarIds: readable.map((source) => source.calendar_id),
  });

  for (const source of readable) {
    const failure = result.errorsByCalendar[source.calendar_id];

    if (failure) {
      // One calendar failing must not discard the others, and must not quietly
      // read as "free" — the source keeps its previous snapshot and is marked so
      // the provider can see it needs attention.
      summary.failedSources += 1;

      await admin
        .from("provider_google_calendar_busy_sources")
        .update({ last_error_code: failure.slice(0, 64) })
        .eq("id", source.id);

      log.warn("google.busy.refresh_failed", { errorCode: failure });
      continue;
    }

    const generation = randomUUID();
    const intervals = (result.busyByCalendar[source.calendar_id] ?? [])
      .filter((slot) => Date.parse(slot.end) > Date.parse(slot.start))
      .map((slot) => ({
        provider_id: source.provider_id,
        busy_source_id: source.id,
        snapshot_generation: generation,
        starts_at: slot.start,
        ends_at: slot.end,
        refreshed_at: now.toISOString(),
      }));

    if (intervals.length > 0) {
      const { error: insertError } = await admin
        .from("provider_google_calendar_busy_intervals")
        .insert(intervals);

      if (insertError) {
        // Nothing was activated, so the old snapshot still stands.
        summary.failedSources += 1;
        log.error("google.busy.refresh_failed", { errorCode: "interval_write_failed" });
        continue;
      }
    }

    // Only now does the new generation become the one availability reads, and
    // the superseded rows go in the same statement.
    const { error: activateError } = await admin.rpc("activate_google_busy_snapshot", {
      p_busy_source_id: source.id,
      p_snapshot_generation: generation,
    });

    if (activateError) {
      summary.failedSources += 1;
      log.error("google.busy.refresh_failed", { errorCode: "activate_failed" });
      continue;
    }

    summary.refreshed += 1;
    summary.intervals += intervals.length;
  }

  log.info("google.busy.refresh_completed", {
    refreshed: summary.refreshed,
    intervals: summary.intervals,
    failedSources: summary.failedSources,
  });

  return summary;
}

/**
 * The busy intervals availability should treat as authoritative right now.
 *
 * Reads only the generation each source has activated, so a refresh in flight
 * is invisible until it is complete.
 */
export async function loadActiveBusyIntervals(
  input: { providerId: string; from: string; to: string; client?: SupabaseClient },
): Promise<{
  intervals: Array<{ startsAt: string; endsAt: string }>;
  oldestRefreshedAt: string | null;
  sourceCount: number;
}> {
  const admin = input.client ?? createAdminClient();

  const { data: sources, error: sourcesError } = await admin
    .from("provider_google_calendar_busy_sources")
    .select("id, active_snapshot_generation, last_refreshed_at")
    .eq("provider_id", input.providerId)
    .eq("enabled", true)
    .returns<
      Array<{
        id: string;
        active_snapshot_generation: string | null;
        last_refreshed_at: string | null;
      }>
    >();

  if (sourcesError) {
    throw new Error("Could not load Google busy sources.");
  }

  const active = (sources ?? []).filter((source) => source.active_snapshot_generation);

  if (active.length === 0) {
    return { intervals: [], oldestRefreshedAt: null, sourceCount: 0 };
  }

  const { data: rows, error } = await admin
    .from("provider_google_calendar_busy_intervals")
    .select("starts_at, ends_at, snapshot_generation, busy_source_id")
    .eq("provider_id", input.providerId)
    // Half-open overlap, expressed as the database sees it.
    .lt("starts_at", input.to)
    .gt("ends_at", input.from)
    .returns<
      Array<{
        starts_at: string;
        ends_at: string;
        snapshot_generation: string;
        busy_source_id: string;
      }>
    >();

  if (error) {
    throw new Error("Could not load Google busy intervals.");
  }

  const activeGenerations = new Map(
    active.map((source) => [source.id, source.active_snapshot_generation]),
  );

  const intervals = (rows ?? [])
    .filter((row) => activeGenerations.get(row.busy_source_id) === row.snapshot_generation)
    .map((row) => ({ startsAt: row.starts_at, endsAt: row.ends_at }));

  // The *oldest* source decides freshness: availability is only as trustworthy
  // as the least recently refreshed calendar feeding it.
  const refreshedTimes = active
    .map((source) => source.last_refreshed_at)
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    intervals,
    oldestRefreshedAt: refreshedTimes[0] ?? null,
    sourceCount: active.length,
  };
}
