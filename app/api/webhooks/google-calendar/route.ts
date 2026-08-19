import { NextResponse, type NextRequest } from "next/server";

import { authorizeNotification, parseWatchHeaders, type StoredChannel } from "@/lib/google/watch";
import { logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Google's push endpoint.
 *
 * Public and unauthenticated by necessity — Google will not carry a session —
 * so the channel token is the whole of the authentication, compared in constant
 * time against a stored hash.
 *
 * This handler records that a nudge arrived and returns. It never calls Google
 * and never touches a booking: the notification body is empty, so there is
 * nothing here to act on even in principle, and doing the work inline would put
 * an unauthenticated caller in charge of how long our request takes.
 *
 * Every answer is 204, whatever happened. Distinguishing "unknown channel" from
 * "bad token" would let anyone map which channels exist.
 */
export async function POST(request: NextRequest) {
  const log = logger.child({});
  const acknowledge = () => new NextResponse(null, { status: 204 });

  // Google sends an empty body. Anything substantial is not from Google, and
  // reading it would only give an attacker somewhere to put load.
  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (Number.isFinite(contentLength) && contentLength > 4096) {
    log.warn("google.webhook.rejected", { errorCode: "body_too_large" });
    return acknowledge();
  }

  const parsed = parseWatchHeaders(request.headers);

  if (!parsed.ok) {
    log.warn("google.webhook.rejected", { errorCode: parsed.reason });
    return acknowledge();
  }

  const { notification } = parsed;
  const admin = createAdminClient();

  try {
    const { data: channel } = await admin
      .from("provider_google_calendar_watch_channels")
      .select(
        "id, channel_id, channel_token_hash, resource_id, status, provider_id, connection_generation, purpose, busy_source_id",
      )
      .eq("channel_id", notification.channelId)
      .maybeSingle<StoredChannel>();

    const authorized = authorizeNotification(notification, channel);

    if (!authorized.ok) {
      // Logged with the channel id but never the token, and answered the same
      // way as success so nothing is learned from the response.
      log.warn("google.webhook.rejected", {
        errorCode: authorized.reason,
        channelId: notification.channelId,
      });
      return acknowledge();
    }

    const { error } = await admin.from("google_calendar_webhook_inbox").insert({
      channel_id: notification.channelId,
      resource_id: notification.resourceId ?? null,
      message_number: notification.messageNumber,
      resource_state: notification.resourceState,
    });

    // 23505: Google re-delivered a notification it had already sent. That is
    // documented behaviour, and the unique constraint is what makes it free.
    if (error && error.code === "23505") {
      log.info("google.webhook.duplicate", { channelId: notification.channelId });
      return acknowledge();
    }

    if (error) {
      // Nothing was recorded. Google retries on a non-2xx, which is the one
      // case where asking for a retry is right.
      log.error("google.webhook.rejected", { errorCode: "inbox_write_failed" });
      return NextResponse.json({ userMessage: "Try again." }, { status: 500 });
    }

    log.info("google.webhook.accepted", {
      channelId: notification.channelId,
      resourceState: notification.resourceState,
    });

    return acknowledge();
  } catch {
    log.error("google.webhook.rejected", { errorCode: "unexpected" });
    return NextResponse.json({ userMessage: "Try again." }, { status: 500 });
  }
}
