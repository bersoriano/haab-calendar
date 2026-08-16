import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hasEntitlement } from "@/lib/entitlements/server";
import { GoogleApiError, type GoogleCalendarClient } from "@/lib/google/calendar-client";
import { getDeploymentNamespace, isGoogleConfigured } from "@/lib/google/config";
import {
  createClientForConnection,
  getConnection,
  type GoogleConnectionRow,
} from "@/lib/google/connections";
import { buildManagedEventProperties, managedEventId } from "@/lib/google/ids";
import { GoogleOAuthError } from "@/lib/google/oauth";
import type {
  HandlerResult,
  IntegrationOutboxEvent,
  IntegrationOutboxHandler,
} from "@/lib/integrations/outbox/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The outbox handler that projects a booking onto Google Calendar.
 *
 * One direction only: Haab writes, Google reflects. Nothing here reads Google
 * state back into a booking.
 *
 * Idempotence is structural rather than careful. The Google event id is derived
 * from the booking, so a replayed delivery addresses the same event; the write
 * is a PUT, so it overwrites instead of duplicating; and the mapping records
 * which booking version the event already reflects, so a stale replay is
 * answered without calling Google at all. Delivery is at-least-once, and all
 * three of those are what makes that survivable.
 */

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

type MappingRow = {
  id: string;
  google_event_id: string;
  google_calendar_id: string;
  last_projected_booking_version: number;
};

/** Google wants an offset-bearing RFC 3339 timestamp plus the zone. */
function toGoogleDateTime(date: string, time: string | null, timeZone: string) {
  return { dateTime: `${date}T${time ?? "00:00"}:00`, timeZone };
}

function classify(error: unknown): HandlerResult {
  if (error instanceof GoogleApiError) {
    return error.retryable
      ? { outcome: "retryable_failure", errorCode: error.code }
      : { outcome: "permanent_failure", errorCode: error.code };
  }

  if (error instanceof GoogleOAuthError) {
    return error.retryable
      ? { outcome: "retryable_failure", errorCode: error.code }
      : { outcome: "permanent_failure", errorCode: error.code };
  }

  // Unknown failures are retryable: an unrecognised error is more often a
  // transient one than a permanent contract violation.
  return { outcome: "retryable_failure", errorCode: "google_handler_failed" };
}

export type GoogleHandlerDeps = {
  client?: SupabaseClient;
  /** Injected by tests, so CI never needs a Google account. */
  createClient?: (connection: GoogleConnectionRow) => Promise<GoogleCalendarClient>;
};

export function createGoogleCalendarHandler(
  deps: GoogleHandlerDeps = {},
): IntegrationOutboxHandler {
  return {
    key: "google_calendar",

    supports(event) {
      // Every booking change is potentially a calendar change. Whether this
      // provider has a connection is decided in deliver(), where the answer can
      // be a considered skip rather than silence.
      return event.eventType.startsWith("booking.");
    },

    async deliver(event: IntegrationOutboxEvent): Promise<HandlerResult> {
      if (!isGoogleConfigured()) {
        return { outcome: "skipped", reasonCode: "google_not_configured" };
      }

      const admin = deps.client ?? createAdminClient();

      try {
        const connection = await getConnection(event.providerId, admin);

        if (!connection || !connection.target_calendar_id) {
          return { outcome: "skipped", reasonCode: "no_google_connection" };
        }

        if (connection.status !== "connected") {
          // Paused or needing reauth: not a failure to retry, a state a human
          // has to resolve.
          return { outcome: "skipped", reasonCode: `connection_${connection.status}` };
        }

        // Re-resolved here, at delivery time, from the provider id on the event.
        // The dashboard's snapshot is presentation; this is the authorization.
        const entitled = await hasEntitlement(
          event.providerId,
          "google_calendar_sync",
          admin,
        );

        if (!entitled) {
          return { outcome: "skipped", reasonCode: "not_entitled" };
        }

        const { data: booking, error: bookingError } = await admin
          .from("bookings")
          .select(
            "id, provider_id, service_name, date, start_time, end_time, status, integration_version",
          )
          .eq("id", event.bookingId)
          .maybeSingle<BookingRow>();

        if (bookingError) {
          return { outcome: "retryable_failure", errorCode: "booking_read_failed" };
        }

        if (!booking) {
          // Deleted between enqueue and delivery. There is nothing to project
          // and never will be.
          return { outcome: "skipped", reasonCode: "booking_gone" };
        }

        const { data: mapping } = await admin
          .from("provider_google_calendar_event_mappings")
          .select("id, google_event_id, google_calendar_id, last_projected_booking_version")
          .eq("booking_id", booking.id)
          .eq("connection_generation", connection.connection_generation)
          .maybeSingle<MappingRow>();

        if (
          mapping &&
          mapping.last_projected_booking_version >= event.aggregateVersion
        ) {
          // Google already reflects this version or a newer one. A replay, and
          // answering it costs no API call.
          return { outcome: "succeeded" };
        }

        const namespace = getDeploymentNamespace();
        const eventId = managedEventId({
          namespace,
          providerId: booking.provider_id,
          bookingId: booking.id,
        });

        const google =
          (await deps.createClient?.(connection)) ??
          (await createClientForConnection(connection, { client: admin }));

        if (booking.status === "cancelled") {
          await google.cancelEvent(connection.target_calendar_id, eventId);
        } else {
          const timeZone = connection.target_calendar_timezone ?? "UTC";

          await google.upsertEvent(connection.target_calendar_id, {
            eventId,
            // The service name, not the client's. A calendar can be shared, and
            // Haab is not the system that decides who may see a client's name.
            summary: booking.service_name,
            start: toGoogleDateTime(booking.date, booking.start_time, timeZone),
            end: toGoogleDateTime(booking.date, booking.end_time, timeZone),
            privateProperties: buildManagedEventProperties({
              namespace,
              providerId: booking.provider_id,
              bookingId: booking.id,
              bookingVersion: event.aggregateVersion,
            }),
          });
        }

        await admin.from("provider_google_calendar_event_mappings").upsert(
          {
            provider_id: booking.provider_id,
            connection_id: connection.id,
            connection_generation: connection.connection_generation,
            booking_id: booking.id,
            google_calendar_id: connection.target_calendar_id,
            google_event_id: eventId,
            google_event_status: booking.status === "cancelled" ? "cancelled" : "confirmed",
            last_projected_booking_version: event.aggregateVersion,
            last_projected_at: new Date().toISOString(),
            last_error_code: null,
          },
          { onConflict: "booking_id,connection_generation" },
        );

        return { outcome: "succeeded" };
      } catch (error) {
        return classify(error);
      }
    },
  };
}
