import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hasEntitlement } from "@/lib/entitlements/server";
import { GoogleApiError, type GoogleCalendarClient } from "@/lib/google/calendar-client";
import { getDeploymentNamespace, isGoogleConfigured } from "@/lib/google/config";
import {
  createClientForConnection,
  getConnection,
  markConnectionStatus,
  type GoogleConnectionRow,
} from "@/lib/google/connections";
import { buildEventTimes, EventTimeError } from "@/lib/google/event-time";
import { buildManagedEventProperties, managedEventId } from "@/lib/google/ids";
import { GoogleOAuthError } from "@/lib/google/oauth";
import { projectManagedEvent, retractManagedEvent } from "@/lib/google/project-event";
import type {
  HandlerResult,
  IntegrationOutboxEvent,
  IntegrationOutboxHandler,
} from "@/lib/integrations/outbox/types";
import { logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The outbox handler that projects a booking onto Google Calendar.
 *
 * One direction only: Haab writes, Google reflects.
 *
 * Every identifier is re-derived here and checked against the database. The
 * outbox event says which provider and booking it concerns, but an event row is
 * still just data — the booking is loaded by *both* ids so a mismatch cannot
 * project one tenant's booking into another tenant's calendar.
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

function classify(error: unknown): HandlerResult {
  if (error instanceof GoogleApiError || error instanceof GoogleOAuthError) {
    return error.retryable
      ? { outcome: "retryable_failure", errorCode: error.code }
      : { outcome: "permanent_failure", errorCode: error.code };
  }

  if (error instanceof EventTimeError) {
    // A booking whose times cannot be represented will not become
    // representable on a retry.
    return { outcome: "permanent_failure", errorCode: error.code };
  }

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
      return event.eventType.startsWith("booking.");
    },

    async deliver(event: IntegrationOutboxEvent): Promise<HandlerResult> {
      if (!isGoogleConfigured()) {
        return { outcome: "skipped", reasonCode: "google_not_configured" };
      }

      const admin = deps.client ?? createAdminClient();
      const log = logger.child({
        providerId: event.providerId,
        bookingId: event.bookingId,
        outboxEventId: event.id,
        aggregateVersion: event.aggregateVersion,
      });

      try {
        const connection = await getConnection(event.providerId, admin);

        if (!connection || !connection.target_calendar_id) {
          return { outcome: "skipped", reasonCode: "no_google_connection" };
        }

        // The connection was fetched by provider id, but check it anyway: a
        // future refactor that widened that query must not silently start
        // writing across tenants.
        if (connection.provider_id !== event.providerId) {
          log.error("google.event.collision", { errorCode: "connection_tenant_mismatch" });
          return { outcome: "permanent_failure", errorCode: "connection_tenant_mismatch" };
        }

        if (connection.status !== "connected") {
          return { outcome: "skipped", reasonCode: `connection_${connection.status}` };
        }

        const entitled = await hasEntitlement(
          event.providerId,
          "google_calendar_sync",
          admin,
        );

        if (!entitled) {
          return { outcome: "skipped", reasonCode: "not_entitled" };
        }

        // Both ids, always. A booking that belongs to another provider must
        // read as absent here, not as a booking to project.
        const { data: booking, error: bookingError } = await admin
          .from("bookings")
          .select(
            "id, provider_id, service_name, date, start_time, end_time, status, integration_version",
          )
          .eq("id", event.bookingId)
          .eq("provider_id", event.providerId)
          .maybeSingle<BookingRow>();

        if (bookingError) {
          return { outcome: "retryable_failure", errorCode: "booking_read_failed" };
        }

        if (!booking) {
          // Either deleted, or never belonged to this provider. Both are
          // permanent: no retry turns this into a projectable booking.
          return { outcome: "skipped", reasonCode: "booking_gone" };
        }

        const { data: provider, error: providerError } = await admin
          .from("providers")
          .select("id, timezone")
          .eq("id", event.providerId)
          .maybeSingle<{ id: string; timezone: string | null }>();

        if (providerError) {
          return { outcome: "retryable_failure", errorCode: "provider_read_failed" };
        }

        if (!provider?.timezone) {
          return { outcome: "permanent_failure", errorCode: "provider_timezone_missing" };
        }

        const { data: mapping, error: mappingError } = await admin
          .from("provider_google_calendar_event_mappings")
          .select("id, google_event_id, google_calendar_id, last_projected_booking_version")
          .eq("booking_id", booking.id)
          .eq("connection_generation", connection.connection_generation)
          .maybeSingle<MappingRow>();

        if (mappingError) {
          // Without the mapping we cannot tell a replay from new work, and
          // guessing either way is worse than trying again.
          return { outcome: "retryable_failure", errorCode: "mapping_read_failed" };
        }

        // The booking's *current* version is what gets projected, not the
        // version the event was enqueued at. A newer booking state is still the
        // right state to send; an already-projected one is a replay.
        const currentVersion = booking.integration_version;

        if (mapping && mapping.last_projected_booking_version >= currentVersion) {
          return { outcome: "succeeded" };
        }

        const namespace = getDeploymentNamespace();
        const owner = { namespace, providerId: booking.provider_id };
        const eventId = managedEventId({
          namespace,
          providerId: booking.provider_id,
          bookingId: booking.id,
        });

        const google =
          (await deps.createClient?.(connection)) ??
          (await createClientForConnection(connection, { client: admin }));

        const result =
          booking.status === "cancelled"
            ? await retractManagedEvent({
                client: google,
                calendarId: connection.target_calendar_id,
                eventId,
                bookingId: booking.id,
                owner,
              })
            : await projectManagedEvent({
                client: google,
                calendarId: connection.target_calendar_id,
                eventId,
                bookingId: booking.id,
                owner,
                body: {
                  // The service name, not the client's: a calendar can be
                  // shared, and Haab does not decide who may read a client name.
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
                    bookingVersion: currentVersion,
                  }),
                },
              });

        if (result.outcome === "collision") {
          // The id is taken by an event this deployment does not own. Retrying
          // would never resolve it, and overwriting would corrupt somebody
          // else's data.
          log.error("google.event.collision", { errorCode: "event_id_collision" });
          return { outcome: "permanent_failure", errorCode: "event_id_collision" };
        }

        const { error: upsertError } = await admin
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
              google_event_status:
                booking.status === "cancelled" ? "cancelled" : "confirmed",
              last_projected_booking_version: currentVersion,
              last_projected_at: new Date().toISOString(),
              last_error_code: null,
            },
            { onConflict: "booking_id,connection_generation" },
          );

        if (upsertError) {
          // The write landed in Google but the record of it did not. Reporting
          // success here would lose that fact forever; a retry is safe because
          // the projection is idempotent.
          log.error("google.event.mapping_failed", { errorCode: "mapping_write_failed" });
          return { outcome: "retryable_failure", errorCode: "mapping_write_failed" };
        }

        log.info(
          result.outcome === "inserted"
            ? "google.event.inserted"
            : result.outcome === "patched"
              ? "google.event.patched"
              : "google.event.deleted",
          { outcome: result.outcome },
        );

        return { outcome: "succeeded" };
      } catch (error) {
        // A revoked grant is a state a human has to fix; mark it so the UI can
        // say so rather than silently failing every delivery.
        if (
          (error instanceof GoogleApiError && error.status === 401) ||
          (error instanceof GoogleOAuthError && !error.retryable)
        ) {
          await markConnectionStatus(
            {
              providerId: event.providerId,
              status: "needs_reauth",
              errorCode: error.code,
            },
            admin,
          ).catch(() => undefined);

          log.warn("google.connection.needs_reauth", { errorCode: error.code });
        }

        return classify(error);
      }
    },
  };
}
