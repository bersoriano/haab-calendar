import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { GoogleCalendarClient } from "@/lib/google/calendar-client";
import { getDeploymentNamespace } from "@/lib/google/config";
import {
  createClientForConnection,
  getConnection,
  type GoogleConnectionRow,
} from "@/lib/google/connections";
import { buildManagedEventProperties, managedEventId } from "@/lib/google/ids";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Writes the bookings that already existed when the provider connected.
 *
 * The outbox only carries changes, and a booking made before the connection
 * existed produced a `skipped` event that will never be replayed. This is what
 * fills that gap — and it is why those skips are safe to leave alone.
 *
 * Bounded per run and resumable: a provider with a year of bookings must not
 * turn one request into a thousand Google calls.
 */

const RECONCILE_LIMIT = 200;

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

export type ReconcileSummary = {
  considered: number;
  written: number;
  skipped: number;
  failed: number;
};

export async function reconcileProviderCalendar(
  input: {
    providerId: string;
    client?: SupabaseClient;
    createClient?: (connection: GoogleConnectionRow) => Promise<GoogleCalendarClient>;
    now?: Date;
  },
): Promise<ReconcileSummary> {
  const admin = input.client ?? createAdminClient();
  const summary: ReconcileSummary = { considered: 0, written: 0, skipped: 0, failed: 0 };

  const connection = await getConnection(input.providerId, admin);

  if (!connection?.target_calendar_id || connection.status !== "connected") {
    return summary;
  }

  const from = (input.now ?? new Date()).toISOString().slice(0, 10);

  // Forward-looking only. Back-filling history would write hundreds of events
  // nobody will look at, and a calendar is about what is coming.
  const { data: bookings, error } = await admin
    .from("bookings")
    .select(
      "id, provider_id, service_name, date, start_time, end_time, status, integration_version",
    )
    .eq("provider_id", input.providerId)
    .gte("date", from)
    .neq("status", "cancelled")
    .order("date", { ascending: true })
    .limit(RECONCILE_LIMIT)
    .returns<BookingRow[]>();

  if (error) {
    throw new Error("Could not load bookings to reconcile.");
  }

  const google =
    (await input.createClient?.(connection)) ??
    (await createClientForConnection(connection, { client: admin }));

  const namespace = getDeploymentNamespace();
  const timeZone = connection.target_calendar_timezone ?? "UTC";

  for (const booking of bookings ?? []) {
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
        continue;
      }

      await google.upsertEvent(connection.target_calendar_id, {
        eventId,
        summary: booking.service_name,
        start: {
          dateTime: `${booking.date}T${booking.start_time ?? "00:00"}:00`,
          timeZone,
        },
        end: {
          dateTime: `${booking.date}T${booking.end_time ?? "00:00"}:00`,
          timeZone,
        },
        privateProperties: buildManagedEventProperties({
          namespace,
          providerId: booking.provider_id,
          bookingId: booking.id,
          bookingVersion: booking.integration_version,
        }),
      });

      await admin.from("provider_google_calendar_event_mappings").upsert(
        {
          provider_id: booking.provider_id,
          connection_id: connection.id,
          connection_generation: connection.connection_generation,
          booking_id: booking.id,
          google_calendar_id: connection.target_calendar_id,
          google_event_id: eventId,
          google_event_status: "confirmed",
          last_projected_booking_version: booking.integration_version,
          last_projected_at: new Date().toISOString(),
        },
        { onConflict: "booking_id,connection_generation" },
      );

      summary.written += 1;
    } catch {
      // One booking failing must not abandon the rest; the next run picks it
      // up, because the mapping was never advanced.
      summary.failed += 1;
    }
  }

  await admin
    .from("provider_google_calendar_connections")
    .update({ reconciled_at: new Date().toISOString() })
    .eq("id", connection.id);

  return summary;
}
