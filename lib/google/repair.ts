import "server-only";

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
 * Putting Google back the way Haab says it should be.
 *
 * A conflict means the provider changed something in their calendar that Haab
 * would not accept. Leaving it there is the worst outcome available: the
 * calendar then shows a time the client was never told about, and the provider
 * has no way to know which of the two is real. Repair rewrites the event from
 * the booking, so the calendar visibly snaps back and the disagreement is
 * resolved in favour of the agreement with the client.
 *
 * Two conflict types are deliberately never repaired. `ownership_mismatch`
 * means the event does not belong to this booking, and writing over it would do
 * to somebody else exactly what this worker exists to prevent. `calendar_changed`
 * means the target moved, which is a reconnection question, not a repair.
 */

/** Conflicts where Haab knows the correct state and can restate it. */
const REPAIRABLE = new Set([
  "duration_changed",
  "outside_business_hours",
  "haab_booking_overlap",
  "google_busy_overlap",
  "capacity_conflict",
  "invalid_timezone",
  "recurrence_not_supported",
  "stale_google_change",
  "booking_not_mutable",
  "deletion_not_allowed",
]);

type ConflictRow = {
  id: string;
  provider_id: string;
  booking_id: string;
  event_mapping_id: string | null;
  conflict_type: string;
  status: string;
};

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

export type RepairRunSummary = {
  claimed: boolean;
  repaired: boolean;
  reason: string | null;
};

async function settle(
  admin: SupabaseClient,
  conflict: ConflictRow,
  status: "auto_repaired" | "open" | "ignored",
  resolution: string | null,
): Promise<void> {
  await admin
    .from("google_calendar_sync_conflicts")
    .update({
      status,
      // The table's own constraint keeps these two consistent: only an
      // unresolved conflict may lack a resolution time.
      resolved_at: status === "open" ? null : new Date().toISOString(),
      resolution,
    })
    .eq("id", conflict.id);
}

/**
 * Claims one open conflict and restates the booking on Google.
 *
 * Repair is idempotent: it writes the booking's current state, so running it
 * twice produces the same event, and running it after the provider fixed things
 * themselves is a no-op patch rather than a second change.
 */
export async function runGoogleConflictRepairWorker(
  options: {
    client?: SupabaseClient;
    createClient?: (connection: GoogleConnectionRow) => Promise<GoogleCalendarClient>;
    logger?: Logger;
  } = {},
): Promise<RepairRunSummary> {
  const admin = options.client ?? createAdminClient();
  const log = options.logger ?? logger;

  const idle: RepairRunSummary = { claimed: false, repaired: false, reason: null };

  const { data, error } = await admin.rpc("claim_google_sync_conflict_for_repair", {
    p_max_age_seconds: 900,
  });

  if (error) {
    throw new Error("Could not claim a Google sync conflict.");
  }

  // A composite-returning function serialises as an object of nulls when it
  // returned nothing, so the id is what says whether a row was claimed.
  const conflict = data as ConflictRow | null;

  if (!conflict?.id) {
    return idle;
  }

  const conflictLog = log.child({ providerId: conflict.provider_id });

  try {
    if (!REPAIRABLE.has(conflict.conflict_type)) {
      // Back to open, for a person. Nothing here is safe to do automatically.
      await settle(admin, conflict, "open", null);

      return { claimed: true, repaired: false, reason: "not_repairable" };
    }

    const connection = await getConnection(conflict.provider_id, admin);

    if (!connection || connection.status !== "connected" || !connection.target_calendar_id) {
      await settle(admin, conflict, "open", null);

      return { claimed: true, repaired: false, reason: "connection_unavailable" };
    }

    const { data: booking } = await admin
      .from("bookings")
      .select(
        "id, provider_id, service_name, date, start_time, end_time, status, integration_version",
      )
      .eq("id", conflict.booking_id)
      .eq("provider_id", conflict.provider_id)
      .maybeSingle<BookingRow>();

    if (!booking) {
      await settle(admin, conflict, "ignored", "booking_removed");

      return { claimed: true, repaired: false, reason: "booking_missing" };
    }

    if (booking.status === "cancelled") {
      // Haab agrees the booking is gone. Whatever Google shows, there is
      // nothing to restore.
      await settle(admin, conflict, "ignored", "booking_cancelled");

      return { claimed: true, repaired: false, reason: "booking_cancelled" };
    }

    const { data: provider } = await admin
      .from("providers")
      .select("id, timezone")
      .eq("id", conflict.provider_id)
      .maybeSingle<{ id: string; timezone: string | null }>();

    if (!provider?.timezone) {
      await settle(admin, conflict, "open", null);

      return { claimed: true, repaired: false, reason: "provider_timezone_missing" };
    }

    const google =
      (await options.createClient?.(connection)) ??
      (await createClientForConnection(connection, { client: admin }));

    const namespace = getDeploymentNamespace();
    const eventId = managedEventId({
      namespace,
      providerId: booking.provider_id,
      bookingId: booking.id,
    });

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
      // The id now belongs to an event this deployment does not own. Repair
      // stops rather than overwriting it; that is a human's call.
      await settle(admin, conflict, "open", null);

      return { claimed: true, repaired: false, reason: "event_id_collision" };
    }

    if (conflict.event_mapping_id) {
      await admin
        .from("provider_google_calendar_event_mappings")
        .update({
          google_event_etag: "event" in result ? (result.event.etag ?? null) : null,
          // The repair is Haab's own write. Recording its etag is what stops
          // the notification it provokes from being read as a new edit.
          last_google_etag: "event" in result ? (result.event.etag ?? null) : null,
          last_projected_booking_version: booking.integration_version,
          last_projected_at: new Date().toISOString(),
        })
        .eq("id", conflict.event_mapping_id);
    }

    await settle(admin, conflict, "auto_repaired", "restored_from_haab");
    conflictLog.info("google.inbound.repair_completed", {
      bookingId: booking.id,
      conflictType: conflict.conflict_type,
    });

    return { claimed: true, repaired: true, reason: null };
  } catch (error) {
    // Back to open so the next run retries. A conflict is never silently
    // dropped: an unrepaired one is still shown to the provider.
    await settle(admin, conflict, "open", null);
    conflictLog.error("google.inbound.failed", {
      conflictType: conflict.conflict_type,
      outcome: "retry",
    });

    if (error instanceof Error) {
      return { claimed: true, repaired: false, reason: "repair_failed" };
    }

    throw error;
  }
}
