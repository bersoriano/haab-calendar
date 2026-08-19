import "server-only";

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * Google push notification channels.
 *
 * A channel is a standing request: "tell me when this calendar changes". The
 * notification itself carries no event data — only headers saying something
 * happened — so a channel is a nudge, never a source of truth. Everything
 * Google tells us this way is re-read from the API afterwards.
 *
 * The token is the only thing proving a notification came from the channel we
 * created, so it is generated with real entropy and stored hashed: a leaked
 * table must not let anyone forge a notification.
 */

/** Google stops delivering after this regardless; renew well before. */
export const WATCH_TTL_SECONDS = 7 * 24 * 3600;

/**
 * Renew once less than a day remains. Deliberately not the final minutes: a
 * renewal that fails needs room for several retries before delivery lapses,
 * and an expired channel means silently missed changes rather than an error.
 */
export const WATCH_RENEWAL_WINDOW_MS = 24 * 3600 * 1000;

export type WatchPurpose = "busy_refresh" | "managed_event_inbound";

export type NewChannel = {
  channelId: string;
  /** Sent to Google; never stored. */
  token: string;
  tokenHash: string;
};

export function createChannelCredentials(): NewChannel {
  const channelId = randomUUID();
  // 256 bits. The token is what authenticates every later notification.
  const token = randomBytes(32).toString("base64url");

  return { channelId, token, tokenHash: hashChannelToken(token) };
}

export function hashChannelToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Constant-time comparison.
 *
 * A comparison that returns early on the first differing byte leaks the token
 * one character at a time to anyone willing to measure.
 */
export function channelTokenMatches(presented: string, storedHash: string): boolean {
  if (!presented || !storedHash) {
    return false;
  }

  const presentedHash = Buffer.from(hashChannelToken(presented), "hex");
  const expected = Buffer.from(storedHash, "hex");

  if (presentedHash.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(presentedHash, expected);
}

export type WatchNotification = {
  channelId: string;
  resourceId?: string;
  messageNumber: number;
  resourceState: string;
  token?: string;
};

export const VALID_RESOURCE_STATES = ["sync", "exists", "not_exists"] as const;

export type NotificationRejection =
  | "missing_channel_id"
  | "missing_token"
  | "invalid_message_number"
  | "invalid_resource_state"
  | "unknown_channel"
  | "token_mismatch"
  | "resource_mismatch"
  | "channel_retired";

/**
 * Reads Google's headers into a notification, or says why it cannot.
 *
 * Nothing here trusts the resource URI header. Following a URL supplied by the
 * caller would make this endpoint a request forwarder for anyone who can post
 * to it.
 */
export function parseWatchHeaders(
  headers: Headers,
): { ok: true; notification: WatchNotification } | { ok: false; reason: NotificationRejection } {
  const channelId = headers.get("x-goog-channel-id")?.trim();

  if (!channelId || channelId.length > 128) {
    return { ok: false, reason: "missing_channel_id" };
  }

  const token = headers.get("x-goog-channel-token")?.trim();

  if (!token || token.length > 256) {
    return { ok: false, reason: "missing_token" };
  }

  const rawNumber = headers.get("x-goog-message-number")?.trim() ?? "";
  const messageNumber = Number(rawNumber);

  if (
    !rawNumber ||
    !Number.isInteger(messageNumber) ||
    messageNumber < 0 ||
    messageNumber > Number.MAX_SAFE_INTEGER
  ) {
    return { ok: false, reason: "invalid_message_number" };
  }

  const resourceState = headers.get("x-goog-resource-state")?.trim() ?? "";

  if (!(VALID_RESOURCE_STATES as readonly string[]).includes(resourceState)) {
    return { ok: false, reason: "invalid_resource_state" };
  }

  return {
    ok: true,
    notification: {
      channelId,
      resourceId: headers.get("x-goog-resource-id")?.trim() || undefined,
      messageNumber,
      resourceState,
      token,
    },
  };
}

export type StoredChannel = {
  id: string;
  channel_id: string;
  channel_token_hash: string;
  resource_id: string | null;
  status: string;
  provider_id: string;
  connection_generation: string;
  purpose: string;
  busy_source_id: string | null;
};

/**
 * Whether a notification may do any work.
 *
 * The resource id is checked only once the channel has one. Google can deliver
 * the first `sync` notification before its own watch response has been written
 * here, so requiring it during creation would reject a notification that is
 * perfectly genuine.
 */
export function authorizeNotification(
  notification: WatchNotification,
  channel: StoredChannel | null,
): { ok: true } | { ok: false; reason: NotificationRejection } {
  if (!channel) {
    return { ok: false, reason: "unknown_channel" };
  }

  if (!channelTokenMatches(notification.token ?? "", channel.channel_token_hash)) {
    return { ok: false, reason: "token_mismatch" };
  }

  if (channel.status === "creating") {
    return { ok: true };
  }

  if (!["active", "retiring"].includes(channel.status)) {
    // Expired, stopped, or failed. A late notification for a dead channel is
    // acknowledged and does nothing.
    return { ok: false, reason: "channel_retired" };
  }

  if (channel.resource_id && notification.resourceId && channel.resource_id !== notification.resourceId) {
    return { ok: false, reason: "resource_mismatch" };
  }

  return { ok: true };
}

export function channelNeedsRenewal(
  expiresAt: string | null | undefined,
  now: Date,
): boolean {
  if (!expiresAt) {
    return true;
  }

  const remaining = new Date(expiresAt).getTime() - now.getTime();

  if (Number.isNaN(remaining)) {
    return true;
  }

  return remaining <= WATCH_RENEWAL_WINDOW_MS;
}
