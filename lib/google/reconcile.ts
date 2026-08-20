import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { GoogleCalendarClient } from "@/lib/google/calendar-client";
import { getDeploymentNamespace } from "@/lib/google/config";
import {
  createClientForConnection,
  getConnection,
  type GoogleConnectionRow,
} from "@/lib/google/connections";
import { buildEventTimes } from "@/lib/google/event-time";
import { buildManagedEventProperties, managedEventId } from "@/lib/google/ids";
import { projectManagedEvent } from "@/lib/google/project-event";
import { logger, type Logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Writing the bookings that already existed when a provider connected.
 *
 * The outbox only carries changes, so a booking made before the connection
 * produced a terminal `skipped` that will never be replayed. This fills that
 * gap — and it is why those skips are safe to leave alone.
 *
 * It is a durable job rather than work done inside the request that selects the
 * calendar. A provider with a year of bookings would otherwise have waited on
 * hundreds of Google calls, and an earlier version simply stopped after 200 and
 * declared itself finished, silently losing everything past that.
 *
 * The cursor is `(date, id)`. A date alone is not unique, and a non-unique
 * cursor either repeats a page forever or steps over bookings that share a date.
 */

/** Bounded so one invocation stays well inside a serverless time limit. */
const PAGE_SIZE = 50;
const MAX_PAGES_PER_RUN = 6;
const MAX_ATTEMPTS = 5;

type BookingRow = {
  id: string;
  provider_id: string;
  service_name: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  integration_version: number;
};

type JobRow = {
  id: string;
  provider_id: string;
  connection_id: string;
  connection_generation: string;
  status: string;
  cursor_date: string | null;
  cursor_booking_id: string | null;
  considered_count: number;
  written_count: number;
  skipped_count: number;
  failed_count: number;
  attempt_count: number;
  lease_token: string;
};

export type ReconcileRunSummary = {
  claimed: boolean;
  completed: boolean;
  considered: number;
  written: number;
  skipped: number;
  failed: number;
};

/**
 * Queues a reconciliation for this connection generation.
 *
 * Idempotent per generation: selecting a calendar twice, or an entitlement
 * being restored twice, leaves one job rather than two racing ones.
 */
export async function enqueueReconciliation(
  input: { providerId: string; connectionId: string; connectionGeneration: string },
  client?: SupabaseClient,
): Promise<void> {
  const admin = client ?? createAdminClient();

  const { error } = await admin.from("provider_google_reconciliation_jobs").upsert(
    {
      provider_id: input.providerId,
      connection_id: input.connectionId,
      connection_generation: input.connectionGeneration,
      status: "pending",
      available_at: new Date().toISOString(),
      cursor_date: null,
      cursor_booking_id: null,
      considered_count: 0,
      written_count: 0,
      skipped_count: 0,
      failed_count: 0,
      attempt_count: 0,
      completed_at: null,
      last_error_code: null,
    },
    { onConflict: "provider_id,connection_generation" },
  );

  if (error) {
    throw new Error("Could not queue Google reconciliation.");
  }

  logger.info("google.reconcile.enqueued", { providerId: input.providerId });
}

async function releaseJob(
  admin: SupabaseClient,
  job: JobRow,
  patch: Record<string, unknown>,
) {
  await admin
    .from("provider_google_reconciliation_jobs")
    .update({
      lease_token: null,
      leased_by: null,
      lease_expires_at: null,
      ...patch,
    })
    .eq("id", job.id)
    .eq("lease_token", job.lease_token);
}

/**
 * Claims one reconciliation job and works through a bounded number of pages.
 *
 * Returning without finishing is normal: the cursor is saved, the job goes back
 * to pending, and the next invocation resumes exactly where this one stopped.
 * `completed_at` is set only when a page comes back short with no failure in
 * the run, which is the only proof that every eligible booking was written.
 */
export async function runGoogleReconciliationWorker(
  options: {
    client?: SupabaseClient;
    createClient?: (connection: GoogleConnectionRow) => Promise<GoogleCalendarClient>;
    now?: Date;
    workerId?: string;
    logger?: Logger;
  } = {},
): Promise<ReconcileRunSummary> {
  const admin = options.client ?? createAdminClient();
  const workerId = options.workerId ?? `google-reconcile-${randomUUID()}`;
  const log = (options.logger ?? logger).child({ workerId });

  const summary: ReconcileRunSummary = {
    claimed: false,
    completed: false,
    considered: 0,
    written: 0,
    skipped: 0,
    failed: 0,
  };

  const { data: job, error: claimError } = await admin.rpc(
    "claim_google_reconciliation_job",
    { p_worker_id: workerId, p_lease_seconds: 120 },
  );

  if (claimError) {
    throw new Error("Could not claim a Google reconciliation job.");
  }

  // PostgREST renders a composite-returning function as an object even when the
  // function returned SQL NULL, so "no job" arrives as a row of nulls rather
  // than as null. The id is what actually distinguishes the two.
  const claimed = job as JobRow | null;

  if (!claimed?.id) {
    return summary;
  }
  summary.claimed = true;
  const jobLog = log.child({ providerId: claimed.provider_id });
  jobLog.info("google.reconcile.started", { attemptCount: claimed.attempt_count });

  try {
    const connection = await getConnection(claimed.provider_id, admin);

    // A reconnect since this job was queued makes it obsolete. Finishing it
    // would write against a grant nobody asked for.
    if (
      !connection ||
      connection.connection_generation !== claimed.connection_generation ||
      connection.status !== "connected" ||
      !connection.target_calendar_id
    ) {
      await releaseJob(admin, claimed, {
        status: "completed",
        completed_at: new Date().toISOString(),
        last_error_code: "connection_superseded",
      });

      return { ...summary, completed: true };
    }

    const { data: provider } = await admin
      .from("providers")
      .select("id, timezone")
      .eq("id", claimed.provider_id)
      .maybeSingle<{ id: string; timezone: string | null }>();

    if (!provider?.timezone) {
      await releaseJob(admin, claimed, {
        status: "dead_letter",
        completed_at: new Date().toISOString(),
        last_error_code: "provider_timezone_missing",
      });

      return summary;
    }

    const google =
      (await options.createClient?.(connection)) ??
      (await createClientForConnection(connection, { client: admin }));

    const namespace = getDeploymentNamespace();
    const from = (options.now ?? new Date()).toISOString().slice(0, 10);

    let cursorDate = claimed.cursor_date;
    let cursorId = claimed.cursor_booking_id;
    let exhausted = false;
    let stalled = false;

    for (let page = 0; page < MAX_PAGES_PER_RUN; page += 1) {
      let query = admin
        .from("bookings")
        .select(
          "id, provider_id, service_name, date, start_time, end_time, status, integration_version",
        )
        .eq("provider_id", claimed.provider_id)
        .gte("date", from)
        .neq("status", "cancelled");

      if (cursorDate && cursorId) {
        // Keyset pagination on the same (date, id) the ordering uses. An offset
        // would drift as rows change underneath it.
        query = query.or(
          `date.gt.${cursorDate},and(date.eq.${cursorDate},id.gt.${cursorId})`,
        );
      }

      const { data: bookings, error } = await query
        .order("date", { ascending: true })
        .order("id", { ascending: true })
        .limit(PAGE_SIZE)
        .returns<BookingRow[]>();

      if (error) {
        throw new Error("Could not read bookings to reconcile.");
      }

      const rows = bookings ?? [];

      for (const booking of rows) {
        summary.considered += 1;

        const eventId = managedEventId({
          namespace,
          providerId: booking.provider_id,
          bookingId: booking.id,
        });

        try {
          const { data: mapping } = await admin
            .from("provider_google_calendar_event_mappings")
            .select("last_projected_booking_version")
            .eq("booking_id", booking.id)
            .eq("connection_generation", connection.connection_generation)
            .maybeSingle<{ last_projected_booking_version: number }>();

          if (
            mapping &&
            mapping.last_projected_booking_version >= booking.integration_version
          ) {
            summary.skipped += 1;
          } else {
            const result = await projectManagedEvent({
              client: google,
              calendarId: connection.target_calendar_id,
              eventId,
              bookingId: booking.id,
              owner: { namespace, providerId: booking.provider_id },
              body: {
                summary: booking.service_name,
                ...buildEventTimes({
                  date: booking.date,
                  startTime: booking.start_time,
                  endTime: booking.end_time,
                  providerTimeZone: provider.timezone,
                }),
                privateProperties: buildManagedEventProperties({
                  namespace,
                  providerId: booking.provider_id,
                  bookingId: booking.id,
                  bookingVersion: booking.integration_version,
                }),
              },
            });

            if (result.outcome === "collision") {
              summary.failed += 1;
            } else {
              const { error: mappingError } = await admin
                .from("provider_google_calendar_event_mappings")
                .upsert(
                  {
                    provider_id: booking.provider_id,
                    connection_id: connection.id,
                    connection_generation: connection.connection_generation,
                    booking_id: booking.id,
                    google_calendar_id: connection.target_calendar_id,
                    google_event_id: eventId,
                    google_event_etag:
                      "event" in result ? (result.event.etag ?? null) : null,
                    google_event_status: "confirmed",
                    last_projected_booking_version: booking.integration_version,
                    last_projected_at: new Date().toISOString(),
                  },
                  { onConflict: "booking_id,connection_generation" },
                );

              // An unrecorded mapping is not a write: the next run would have
              // no way to tell this booking was already projected.
              if (mappingError) {
                throw new Error("Could not record the projected event.");
              }

              summary.written += 1;
            }
          }
        } catch {
          // Nothing re-queues a finished job, so the only retry is this cursor
          // staying on the last success. Stop rather than step over the miss.
          summary.failed += 1;
          stalled = true;
          break;
        }

        // Advanced per booking, not per page: a crash mid-page resumes after
        // the last booking actually handled rather than redoing the page.
        cursorDate = booking.date;
        cursorId = booking.id;
      }

      jobLog.info("google.reconcile.page", {
        considered: rows.length,
        written: summary.written,
      });

      if (stalled) break;

      if (rows.length < PAGE_SIZE) {
        // Short page: there is nothing after it.
        exhausted = true;
        break;
      }
    }

    const totals = {
      considered_count: claimed.considered_count + summary.considered,
      written_count: claimed.written_count + summary.written,
      skipped_count: claimed.skipped_count + summary.skipped,
      failed_count: claimed.failed_count + summary.failed,
      cursor_date: cursorDate,
      cursor_booking_id: cursorId,
    };

    if (exhausted) {
      await releaseJob(admin, claimed, {
        ...totals,
        status: "completed",
        completed_at: new Date().toISOString(),
        last_error_code: null,
      });

      await admin
        .from("provider_google_calendar_connections")
        .update({ reconciled_at: new Date().toISOString() })
        .eq("id", connection.id);

      jobLog.info("google.reconcile.completed", {
        considered: totals.considered_count,
        written: totals.written_count,
      });

      return { ...summary, completed: true };
    }

    // More to do. Back to pending with the cursor saved.
    await releaseJob(admin, claimed, {
      ...totals,
      status: "pending",
      available_at: new Date().toISOString(),
    });

    return summary;
  } catch (error) {
    const exhaustedAttempts = claimed.attempt_count >= MAX_ATTEMPTS;

    await releaseJob(admin, claimed, {
      status: exhaustedAttempts ? "dead_letter" : "failed",
      ...(exhaustedAttempts ? { completed_at: new Date().toISOString() } : {}),
      // Backoff, so a persistent failure does not spin every minute.
      available_at: new Date(Date.now() + 60_000 * claimed.attempt_count).toISOString(),
      last_error_code: error instanceof Error ? "reconcile_failed" : "unknown",
    });

    jobLog.error("google.reconcile.failed", {
      attemptCount: claimed.attempt_count,
      outcome: exhaustedAttempts ? "dead_letter" : "retry",
    });

    return summary;
  }
}
