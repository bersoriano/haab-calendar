import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { GoogleCalendarClient } from "@/lib/google/calendar-client";
import { getWatchNotificationUrl } from "@/lib/google/config";
import {
  createClientForConnection,
  type GoogleConnectionRow,
} from "@/lib/google/connections";
import {
  channelNeedsRenewal,
  createChannelCredentials,
  hashChannelToken,
  WATCH_TTL_SECONDS,
  type WatchPurpose,
} from "@/lib/google/watch";
import { logger, type Logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Keeping Google's push channels alive.
 *
 * A channel is a lease, not a subscription: Google expires it after at most a
 * week and stops notifying without saying so. Nothing here is event-driven for
 * that reason — the worker walks what *should* have a channel, compares it to
 * what does, and fixes the difference. That makes an unnoticed expiry
 * self-healing rather than a silent end to synchronisation.
 *
 * Renewal is create-new-then-retire-old, never stop-then-create. The gap in the
 * other order is a window where a provider's change is never announced, and a
 * change nobody hears about is the one failure this whole mechanism exists to
 * avoid. A brief overlap costs a duplicate notification, which the inbox
 * deduplicates anyway.
 */

/** Bounded per run so one invocation stays inside a serverless time limit. */
const MAX_CHANNELS_PER_RUN = 10;

type ChannelRow = {
  id: string;
  provider_id: string;
  connection_id: string;
  connection_generation: string;
  busy_source_id: string | null;
  purpose: WatchPurpose;
  channel_id: string;
  resource_id: string | null;
  calendar_id: string;
  status: string;
  expires_at: string | null;
};

export type WatchDesire = {
  providerId: string;
  connectionId: string;
  connectionGeneration: string;
  calendarId: string;
  purpose: WatchPurpose;
  busySourceId: string | null;
};

export type WatchRunSummary = {
  created: number;
  renewed: number;
  retired: number;
  failed: number;
  skipped: "no_address" | null;
};

/**
 * Every calendar this provider should currently be notified about.
 *
 * Busy sources when busy blocking is on, and the target calendar when two-way
 * is on. Both switched off means no channels at all: Haab does not listen to a
 * calendar for a capability the provider is not using.
 */
export async function desiredChannels(
  admin: SupabaseClient,
  connection: GoogleConnectionRow,
): Promise<WatchDesire[]> {
  const desires: WatchDesire[] = [];

  const base = {
    providerId: connection.provider_id,
    connectionId: connection.id,
    connectionGeneration: connection.connection_generation,
  };

  if (connection.busy_blocking_enabled) {
    const { data } = await admin
      .from("provider_google_calendar_busy_sources")
      .select("id, calendar_id")
      .eq("connection_id", connection.id)
      .eq("enabled", true)
      .eq("connection_generation", connection.connection_generation)
      .returns<Array<{ id: string; calendar_id: string }>>();

    for (const source of data ?? []) {
      desires.push({
        ...base,
        calendarId: source.calendar_id,
        purpose: "busy_refresh",
        busySourceId: source.id,
      });
    }
  }

  if (connection.two_way_enabled && connection.target_calendar_id) {
    desires.push({
      ...base,
      calendarId: connection.target_calendar_id,
      purpose: "managed_event_inbound",
      busySourceId: null,
    });
  }

  return desires;
}

async function createChannel(
  admin: SupabaseClient,
  google: GoogleCalendarClient,
  desire: WatchDesire,
  address: string,
): Promise<void> {
  const credentials = createChannelCredentials();

  // The row is written before the call, so a channel Google creates is never
  // one this deployment cannot recognise a notification for. The reverse order
  // loses the token on a crash and leaves Google notifying an unknown channel.
  const { error: insertError } = await admin
    .from("provider_google_calendar_watch_channels")
    .insert({
      provider_id: desire.providerId,
      connection_id: desire.connectionId,
      connection_generation: desire.connectionGeneration,
      busy_source_id: desire.busySourceId,
      purpose: desire.purpose,
      channel_id: credentials.channelId,
      channel_token_hash: hashChannelToken(credentials.token),
      calendar_id: desire.calendarId,
      status: "creating",
    });

  if (insertError) {
    throw new Error("Could not record a Google watch channel.");
  }

  try {
    const response = await google.watchEvents({
      calendarId: desire.calendarId,
      channelId: credentials.channelId,
      token: credentials.token,
      address,
      ttlSeconds: WATCH_TTL_SECONDS,
    });

    await admin
      .from("provider_google_calendar_watch_channels")
      .update({
        status: "active",
        resource_id: response.resourceId,
        expires_at: response.expiresAt,
      })
      .eq("channel_id", credentials.channelId);
  } catch (error) {
    await admin
      .from("provider_google_calendar_watch_channels")
      .update({ status: "failed", retired_at: new Date().toISOString() })
      .eq("channel_id", credentials.channelId);

    throw error;
  }
}

async function retireChannel(
  admin: SupabaseClient,
  google: GoogleCalendarClient,
  channel: ChannelRow,
): Promise<void> {
  if (channel.resource_id) {
    // Asked to stop, so Google stops sending. A channel left running notifies
    // an endpoint that will only ever reject it, for up to a week.
    await google.stopChannel({
      channelId: channel.channel_id,
      resourceId: channel.resource_id,
    });
  }

  await admin
    .from("provider_google_calendar_watch_channels")
    .update({ status: "stopped", retired_at: new Date().toISOString() })
    .eq("id", channel.id);
}

/**
 * Reconciles one connection's channels against what it should have.
 *
 * Idempotent: running it when everything is current does nothing at all.
 */
export async function syncWatchChannels(
  connection: GoogleConnectionRow,
  options: {
    client?: SupabaseClient;
    createClient?: (connection: GoogleConnectionRow) => Promise<GoogleCalendarClient>;
    now?: Date;
    logger?: Logger;
  } = {},
): Promise<WatchRunSummary> {
  const admin = options.client ?? createAdminClient();
  const now = options.now ?? new Date();
  const log = (options.logger ?? logger).child({ providerId: connection.provider_id });

  const summary: WatchRunSummary = {
    created: 0,
    renewed: 0,
    retired: 0,
    failed: 0,
    skipped: null,
  };

  const address = getWatchNotificationUrl();

  if (!address) {
    // No HTTPS address means Google would refuse the channel. Synchronisation
    // still works through the periodic workers; it is just not push-driven.
    return { ...summary, skipped: "no_address" };
  }

  const { data: existing } = await admin
    .from("provider_google_calendar_watch_channels")
    .select(
      "id, provider_id, connection_id, connection_generation, busy_source_id, purpose, channel_id, resource_id, calendar_id, status, expires_at",
    )
    .eq("provider_id", connection.provider_id)
    .in("status", ["creating", "active"])
    .returns<ChannelRow[]>();

  const live = existing ?? [];
  const desires =
    connection.status === "connected" ? await desiredChannels(admin, connection) : [];

  const google =
    (await options.createClient?.(connection)) ??
    (await createClientForConnection(connection, { client: admin }));

  const key = (calendarId: string, purpose: string) => `${purpose}:${calendarId}`;
  const desiredKeys = new Set(desires.map((d) => key(d.calendarId, d.purpose)));

  let budget = MAX_CHANNELS_PER_RUN;

  for (const desire of desires) {
    if (budget <= 0) {
      break;
    }

    const current = live.find(
      (channel) =>
        key(channel.calendar_id, channel.purpose) === key(desire.calendarId, desire.purpose) &&
        channel.connection_generation === desire.connectionGeneration,
    );

    const renewing = Boolean(current) && channelNeedsRenewal(current?.expires_at, now);

    if (current && !renewing) {
      continue;
    }

    budget -= 1;

    try {
      await createChannel(admin, google, desire, address);

      if (current) {
        // Only now that a replacement is listening.
        await retireChannel(admin, google, current);
        summary.renewed += 1;
        log.info("google.watch.renewed", { purpose: desire.purpose });
      } else {
        summary.created += 1;
        log.info("google.watch.created", { purpose: desire.purpose });
      }
    } catch {
      summary.failed += 1;
      log.warn("google.watch.failed", { purpose: desire.purpose });
    }
  }

  for (const channel of live) {
    if (
      desiredKeys.has(key(channel.calendar_id, channel.purpose)) &&
      channel.connection_generation === connection.connection_generation
    ) {
      continue;
    }

    // A source the provider removed, a capability switched off, or a channel
    // belonging to a superseded connection.
    try {
      await retireChannel(admin, google, channel);
      summary.retired += 1;
      log.info("google.watch.stopped", { purpose: channel.purpose });
    } catch {
      summary.failed += 1;
      log.warn("google.watch.failed", { purpose: channel.purpose });
    }
  }

  return summary;
}
