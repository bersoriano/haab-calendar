import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hasEntitlement } from "@/lib/entitlements/server";
import {
  EVENTS_QUERY_VERSION,
  GoogleApiError,
  type GoogleCalendarClient,
  type GoogleEvent,
} from "@/lib/google/calendar-client";
import { getDeploymentNamespace } from "@/lib/google/config";
import {
  createClientForConnection,
  getConnection,
  type GoogleConnectionRow,
} from "@/lib/google/connections";
import { isHaabManagedEvent, readManagedEventProperties } from "@/lib/google/ids";
import { logger, type Logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Reading changes back from the target calendar.
 *
 * Fetching is separated from applying. This module's whole job is to get
 * Google's version of events into staging rows; deciding what any of it means
 * for a booking happens later, in a worker that never talks to Google. That
 * separation is what lets a failed apply retry without re-fetching, and keeps a
 * network call out of a booking transaction.
 *
 * The sync token is the delicate part. Google issues one for the *final* page
 * of a run, and it is only valid for the exact query that produced it. Storing
 * it before every page is durably staged would skip whatever was in the pages
 * that never landed — silently, and permanently.
 */

const MAX_PAGES_PER_RUN = 10;

export type InboundSyncSummary = {
  pages: number;
  staged: number;
  ignored: number;
  completed: boolean;
  mode: "full" | "incremental";
  skipped?: string;
};

type CursorRow = {
  id: string;
  sync_token: string | null;
  sync_mode: string;
  query_version: number;
};

/** Only Haab's own events matter here; everything else is looked at and dropped. */
function isRelevant(
  event: GoogleEvent,
  owner: { namespace: string; providerId: string },
): boolean {
  return isHaabManagedEvent(event.extendedProperties?.private, owner);
}

function stagedRowFor(
  event: GoogleEvent,
  context: {
    providerId: string;
    connectionId: string;
    connectionGeneration: string;
  },
) {
  const properties = readManagedEventProperties(event.extendedProperties?.private);

  return {
    provider_id: context.providerId,
    connection_id: context.connectionId,
    connection_generation: context.connectionGeneration,
    booking_id: properties?.bookingId ?? null,
    google_event_id: event.id,
    google_event_etag: event.etag ?? null,
    google_updated_at: event.updated ?? null,
    google_status: event.status === "cancelled" ? "cancelled" : (event.status ?? "confirmed"),
    // Times only. Never summary, description, location, attendees, or
    // conference data — none of it is fetched, so none of it can be staged.
    start_payload: event.start ?? null,
    end_payload: event.end ?? null,
    event_type: event.eventType ?? null,
    recurring_event_id: event.recurringEventId ?? null,
    haab_properties: event.extendedProperties?.private ?? null,
  };
}

export async function runGoogleInboundSync(
  input: {
    providerId: string;
    client?: SupabaseClient;
    createClient?: (connection: GoogleConnectionRow) => Promise<GoogleCalendarClient>;
    logger?: Logger;
  },
): Promise<InboundSyncSummary> {
  const admin = input.client ?? createAdminClient();
  const log = (input.logger ?? logger).child({ providerId: input.providerId });
  const summary: InboundSyncSummary = {
    pages: 0,
    staged: 0,
    ignored: 0,
    completed: false,
    mode: "full",
  };

  const connection = await getConnection(input.providerId, admin);

  if (!connection?.target_calendar_id || connection.status !== "connected") {
    return { ...summary, skipped: "no_active_connection" };
  }

  // Re-resolved at the moment of work: an entitlement lost since the
  // notification arrived must stop the read, not merely the write.
  const entitled = await hasEntitlement(
    input.providerId,
    "google_calendar_two_way_sync",
    admin,
  );

  if (!entitled || !connection.two_way_enabled) {
    return { ...summary, skipped: "two_way_disabled" };
  }

  const { data: cursorRow } = await admin
    .from("provider_google_calendar_sync_cursors")
    .select("id, sync_token, sync_mode, query_version")
    .eq("provider_id", input.providerId)
    .eq("connection_generation", connection.connection_generation)
    .eq("calendar_id", connection.target_calendar_id)
    .maybeSingle<CursorRow>();

  // A token issued under a different query shape is not valid for this one.
  // Discarding it costs a full scan; keeping it would silently miss events.
  const usableToken =
    cursorRow && cursorRow.query_version === EVENTS_QUERY_VERSION
      ? cursorRow.sync_token
      : null;

  summary.mode = usableToken ? "incremental" : "full";

  if (!usableToken) {
    log.info("google.inbound.full_sync_started", {});
  }

  const google =
    (await input.createClient?.(connection)) ??
    (await createClientForConnection(connection, { client: admin }));

  const owner = {
    namespace: getDeploymentNamespace(),
    providerId: input.providerId,
  };

  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  try {
    for (let page = 0; page < MAX_PAGES_PER_RUN; page += 1) {
      const result = await google.listEvents({
        calendarId: connection.target_calendar_id,
        syncToken: usableToken ?? undefined,
        pageToken,
      });

      summary.pages += 1;

      const relevant = result.events.filter((event) => isRelevant(event, owner));
      summary.ignored += result.events.length - relevant.length;

      if (relevant.length > 0) {
        const rows = relevant.map((event) =>
          stagedRowFor(event, {
            providerId: input.providerId,
            connectionId: connection.id,
            connectionGeneration: connection.connection_generation,
          }),
        );

        // Identity plus revision is unique, so a redelivered page stages
        // nothing new rather than duplicating work.
        const { error } = await admin
          .from("google_calendar_inbound_changes")
          .upsert(rows, {
            onConflict: "connection_generation,google_event_id,google_event_etag",
            ignoreDuplicates: true,
          });

        if (error) {
          throw new Error("Could not stage inbound changes.");
        }

        summary.staged += rows.length;
        log.info("google.inbound.change_staged", { count: rows.length });
      }

      pageToken = result.nextPageToken;
      nextSyncToken = result.nextSyncToken ?? nextSyncToken;

      if (!pageToken) {
        summary.completed = true;
        break;
      }
    }
  } catch (error) {
    // 410: the token is too old to be meaningful. Google's instruction is to
    // start over, and the cursor is cleared so the next run does a full scan.
    // Nothing about the bookings or their mappings is touched.
    if (error instanceof GoogleApiError && error.status === 410) {
      await admin
        .from("provider_google_calendar_sync_cursors")
        .update({
          sync_token: null,
          sync_mode: "resyncing",
          last_error_code: "sync_token_invalid",
        })
        .eq("provider_id", input.providerId)
        .eq("connection_generation", connection.connection_generation);

      log.warn("google.inbound.sync_token_invalid", {});
      return { ...summary, completed: false, skipped: "sync_token_invalid" };
    }

    throw error;
  }

  // Only now, with every page of this run durably staged. A token stored
  // mid-run would skip whatever was in the pages that never landed.
  if (summary.completed && nextSyncToken) {
    const completedAt = new Date().toISOString();
    const patch: Record<string, unknown> = {
      provider_id: input.providerId,
      connection_id: connection.id,
      connection_generation: connection.connection_generation,
      calendar_id: connection.target_calendar_id,
      sync_token: nextSyncToken,
      sync_mode: "incremental",
      query_version: EVENTS_QUERY_VERSION,
      last_error_code: null,
      last_full_sync_at: summary.mode === "full" ? completedAt : undefined,
      last_incremental_sync_at:
        summary.mode === "incremental" ? completedAt : undefined,
    };

    for (const key of Object.keys(patch)) {
      if (patch[key] === undefined) delete patch[key];
    }

    await admin
      .from("provider_google_calendar_sync_cursors")
      .upsert(patch, { onConflict: "provider_id,connection_generation,calendar_id" });

    log.info("google.inbound.incremental_sync_completed", {
      pages: summary.pages,
      staged: summary.staged,
    });
  }

  return summary;
}
