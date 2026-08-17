import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hasEntitlement } from "@/lib/entitlements/server";
import { getConnection, markConnectionStatus } from "@/lib/google/connections";
import { enqueueReconciliation } from "@/lib/google/reconcile";
import { logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * What happens to a Google connection when the entitlement moves.
 *
 * Losing the entitlement pauses the connection rather than deleting it: the
 * grant is the provider's, and making them re-authorize because a subscription
 * lapsed for a week would be a punishment, not a safety measure. Writes stop
 * immediately either way.
 *
 * Regaining it queues a full reconciliation rather than replaying the outbox.
 * The events skipped while paused are terminal and gone; what matters is that
 * Google ends up matching the bookings as they are *now*, which is exactly what
 * reconciliation does.
 */

export type LifecycleOutcome =
  | { changed: false; reason: string }
  | { changed: true; status: "paused" | "connected" };

export async function syncGoogleConnectionToEntitlement(
  input: { providerId: string; client?: SupabaseClient },
): Promise<LifecycleOutcome> {
  const admin = input.client ?? createAdminClient();
  const connection = await getConnection(input.providerId, admin);

  if (!connection) {
    return { changed: false, reason: "no_connection" };
  }

  // A connection the provider disconnected stays disconnected; entitlement has
  // nothing to say about it.
  if (connection.status === "disconnected") {
    return { changed: false, reason: "disconnected" };
  }

  let entitled: boolean;

  try {
    entitled = await hasEntitlement(input.providerId, "google_calendar_sync", admin);
  } catch {
    // Unknown is not "yes". Nothing changes, and the next attempt decides —
    // resuming on an unresolved entitlement would be granting access on a
    // failure.
    logger.error("entitlements.billing_read_failed", { providerId: input.providerId });
    return { changed: false, reason: "entitlement_unresolved" };
  }

  if (!entitled) {
    if (connection.status === "paused") {
      return { changed: false, reason: "already_paused" };
    }

    await markConnectionStatus(
      { providerId: input.providerId, status: "paused", errorCode: "not_entitled" },
      admin,
    );

    logger.info("google.connection.needs_reauth", {
      providerId: input.providerId,
      outcome: "paused",
    });

    return { changed: true, status: "paused" };
  }

  if (connection.status !== "paused") {
    return { changed: false, reason: "already_active" };
  }

  // A grant that expired while paused cannot simply be resumed; the provider
  // has to reconnect, and the status says so.
  await markConnectionStatus(
    { providerId: input.providerId, status: "connected", errorCode: null },
    admin,
  );

  if (connection.target_calendar_id) {
    // Bookings changed while this was paused, and those outbox events are gone.
    // Reconciliation replays the current state instead.
    await enqueueReconciliation(
      {
        providerId: input.providerId,
        connectionId: connection.id,
        connectionGeneration: connection.connection_generation,
      },
      admin,
    );
  }

  logger.info("google.connection.saved", {
    providerId: input.providerId,
    outcome: "resumed",
  });

  return { changed: true, status: "connected" };
}
