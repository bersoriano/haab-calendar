import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { refreshProviderBusySnapshot } from "@/lib/google/busy-refresh";
import { runGoogleInboundSync } from "@/lib/google/inbound-sync";
import { logger, type Logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Turning "something changed" into the read that finds out what.
 *
 * Google's notification carries no content — by design, and Haab depends on
 * that: the push endpoint answers 204 without making a single API call, so a
 * flood of notifications cannot be turned into a flood of Google requests or a
 * source of latency on a public route. All of the actual work happens here,
 * against a queue, where it is leased, bounded, retried, and attributable.
 *
 * The notification is a hint, never an instruction. Which provider is affected
 * comes from the stored channel, not from anything the request said.
 */

const MAX_ATTEMPTS = 5;

type InboxRow = {
  id: string;
  channel_id: string;
  resource_id: string | null;
  message_number: number;
  resource_state: "sync" | "exists" | "not_exists";
  attempt_count: number;
  lease_token: string;
};

type ChannelRow = {
  id: string;
  provider_id: string;
  purpose: "busy_refresh" | "managed_event_inbound";
  status: string;
  resource_id: string | null;
};

export type WebhookRunSummary = {
  claimed: boolean;
  dispatched: "busy_refresh" | "inbound_sync" | null;
  reason: string | null;
};

async function release(
  admin: SupabaseClient,
  row: InboxRow,
  patch: Record<string, unknown>,
): Promise<void> {
  await admin
    .from("google_calendar_webhook_inbox")
    .update({
      lease_token: null,
      leased_by: null,
      lease_expires_at: null,
      ...patch,
    })
    .eq("id", row.id)
    .eq("lease_token", row.lease_token);
}

/**
 * Claims one queued notification and performs the read it implies.
 */
export async function runGoogleWebhookWorker(
  options: {
    client?: SupabaseClient;
    workerId?: string;
    logger?: Logger;
    now?: Date;
  } = {},
): Promise<WebhookRunSummary> {
  const admin = options.client ?? createAdminClient();
  const workerId = options.workerId ?? `google-webhook-${randomUUID()}`;
  const log = (options.logger ?? logger).child({ workerId });

  const idle: WebhookRunSummary = { claimed: false, dispatched: null, reason: null };

  const { data, error } = await admin.rpc("claim_google_webhook_notification", {
    p_worker_id: workerId,
    p_lease_seconds: 120,
  });

  if (error) {
    throw new Error("Could not claim a Google webhook notification.");
  }

  // Composite-returning functions serialise as an object of nulls when they
  // returned nothing; the id is the only reliable "was anything claimed".
  const notification = data as InboxRow | null;

  if (!notification?.id) {
    return idle;
  }

  const settled = (status: string, reason: string | null) => ({
    status,
    processed_at: new Date().toISOString(),
    last_error_code: reason,
  });

  try {
    const { data: channel } = await admin
      .from("provider_google_calendar_watch_channels")
      .select("id, provider_id, purpose, status, resource_id")
      .eq("channel_id", notification.channel_id)
      .maybeSingle<ChannelRow>();

    if (!channel) {
      // The endpoint accepted it without knowing the channel; this is where
      // that is resolved. Nothing to do and nothing to retry.
      await release(admin, notification, settled("skipped", "unknown_channel"));

      return { claimed: true, dispatched: null, reason: "unknown_channel" };
    }

    if (!["creating", "active", "retiring"].includes(channel.status)) {
      await release(admin, notification, settled("skipped", "channel_retired"));

      return { claimed: true, dispatched: null, reason: "channel_retired" };
    }

    if (
      channel.resource_id &&
      notification.resource_id &&
      channel.resource_id !== notification.resource_id
    ) {
      // The channel id matched but the resource did not. Not a notification
      // this channel can speak for.
      await release(admin, notification, settled("skipped", "resource_mismatch"));

      return { claimed: true, dispatched: null, reason: "resource_mismatch" };
    }

    if (notification.resource_state === "sync") {
      // Google's handshake: the channel exists, nothing changed.
      await release(admin, notification, settled("processed", null));

      return { claimed: true, dispatched: null, reason: "handshake" };
    }

    const providerLog = log.child({ providerId: channel.provider_id });

    if (channel.purpose === "busy_refresh") {
      await refreshProviderBusySnapshot({
        providerId: channel.provider_id,
        client: admin,
        now: options.now,
        logger: providerLog,
      });

      await release(admin, notification, settled("processed", null));

      return { claimed: true, dispatched: "busy_refresh", reason: null };
    }

    await runGoogleInboundSync({
      providerId: channel.provider_id,
      client: admin,
      logger: providerLog,
    });

    await release(admin, notification, settled("processed", null));

    return { claimed: true, dispatched: "inbound_sync", reason: null };
  } catch (error) {
    const exhausted = notification.attempt_count >= MAX_ATTEMPTS;

    await release(admin, notification, {
      status: exhausted ? "dead_letter" : "failed",
      ...(exhausted ? { processed_at: new Date().toISOString() } : {}),
      available_at: new Date(
        Date.now() + 60_000 * notification.attempt_count,
      ).toISOString(),
      last_error_code: error instanceof Error ? "dispatch_failed" : "unknown",
    });

    log.error("google.webhook.rejected", {
      attemptCount: notification.attempt_count,
      outcome: exhausted ? "dead_letter" : "retry",
    });

    return { claimed: true, dispatched: null, reason: "dispatch_failed" };
  }
}
