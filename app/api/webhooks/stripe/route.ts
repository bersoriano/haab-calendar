import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import {
  isSupportedEventType,
  processStripeSubscriptionEvent,
} from "@/lib/billing/processor";
import { getStripeClient } from "@/lib/stripe/client";
import {
  getStripeWebhookSecret,
  isStripeLiveMode,
  StripeConfigError,
} from "@/lib/stripe/config";
import { resolveRequestId, withRequestId } from "@/lib/observability/context";
import { toSafeError } from "@/lib/observability/errors";
import { SPAN_NAMES } from "@/lib/observability/events";
import { logger } from "@/lib/observability/logger";
import { withSpan } from "@/lib/observability/tracing";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_ATTEMPTS = 6;
const RETRY_DELAY_SECONDS = 60;

/**
 * Stripe's webhook endpoint.
 *
 * The order is deliberate: verify the signature, then record the event, then
 * act on it. Nothing before verification is trusted — not the event id, not the
 * type, not the livemode flag — because all of it is attacker-controlled until
 * the signature says otherwise.
 *
 * The status code is a message to Stripe's retry machinery: 200 means "settled,
 * stop sending"; 500 means "try again". A failure we can never fix returns 200
 * with a dead-lettered row, because asking Stripe to redeliver something
 * permanently broken only fills the log with the same failure.
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = resolveRequestId(request.headers);
  // Correlated by request id from the first line. The Stripe event id joins the
  // context only after the signature is verified — before that it is a value an
  // attacker chose, and treating it as an identity would let them forge the
  // trail their own request leaves.
  let log = logger.child({ requestId });

  const webhookSecret = getStripeWebhookSecret();
  const signature = request.headers.get("stripe-signature");

  const respond = (body: Record<string, unknown>, status = 200) =>
    withRequestId(NextResponse.json(body, { status }), requestId);

  // An unconfigured deployment must not accept unverified events, so the
  // endpoint refuses everything rather than falling back to trusting the body.
  if (!webhookSecret) {
    log.error("stripe.webhook.unconfigured", {
      errorCode: "missing_webhook_secret",
    });
    return respond({ userMessage: "Not found." }, 400);
  }

  if (!signature) {
    log.warn("stripe.webhook.signature_invalid", {
      errorCode: "missing_signature",
    });
    return respond({ userMessage: "Invalid signature." }, 400);
  }

  // The exact bytes Stripe signed. Parsing and re-serialising would change the
  // whitespace and break verification — which is the point of reading it raw.
  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    event = await withSpan(SPAN_NAMES.stripeWebhookVerify, {}, async () =>
      getStripeClient().webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      ),
    );
  } catch (error) {
    if (error instanceof StripeConfigError) {
      log.error("stripe.webhook.unconfigured", { errorCode: error.code });
      return respond({ userMessage: "Not found." }, 400);
    }

    // Bad signature, tampered body, stale timestamp, unparseable JSON — all the
    // same answer, and none of them reach the inbox.
    log.warn("stripe.webhook.signature_invalid", {
      errorCode: "verification_failed",
    });
    return respond({ userMessage: "Invalid signature." }, 400);
  }

  log = log.child({ stripeEventId: event.id, stripeEventType: event.type });
  log.info("stripe.webhook.received", {});

  // Only now is the livemode flag worth reading. A test-mode deployment that
  // honoured a live event, or the reverse, would project someone else's
  // subscription onto a provider here.
  if (event.livemode !== isStripeLiveMode()) {
    log.warn("stripe.webhook.mode_mismatch", {
      errorCode: "livemode_mismatch",
    });
    return respond({ userMessage: "Invalid signature." }, 400);
  }

  const admin = createAdminClient();

  try {
    const { error: insertError } = await withSpan(
      SPAN_NAMES.stripeWebhookPersist,
      { "stripe.event_type": event.type },
      async () =>
        admin.from("stripe_webhook_events").insert({
          stripe_event_id: event.id,
          event_type: event.type,
          api_version: event.api_version ?? null,
          livemode: event.livemode,
          event_created_at: new Date(event.created * 1000).toISOString(),
          payload: event as unknown as Record<string, unknown>,
        }),
    );

    // 23505: this event has been delivered before. That is Stripe working as
    // documented, not an error — the row already exists, and the claim below
    // decides whether there is anything left to do with it.
    if (insertError && insertError.code !== "23505") {
      log.error("stripe.webhook.failed", { errorCode: "persist_failed" });
      return respond({ userMessage: "Could not record the event." }, 500);
    }

    const duplicate = Boolean(insertError);

    const { data: claimed, error: claimError } = await admin.rpc(
      "claim_stripe_webhook_event",
      { p_stripe_event_id: event.id, p_lease_seconds: 60 },
    );

    if (claimError) {
      log.error("stripe.webhook.failed", { errorCode: "claim_failed" });
      return respond({ userMessage: "Could not record the event." }, 500);
    }

    if (!claimed) {
      // Already settled, or another delivery of the same event is being
      // processed right now. Either way there is nothing for this request to
      // do, and Stripe should stop retrying.
      log.info("stripe.webhook.duplicate", {
        durationMs: Date.now() - startedAt,
        outcome: "duplicate",
      });
      return respond({ received: true, duplicate });
    }

    const attemptCount =
      (claimed as { attempt_count: number }).attempt_count ?? 1;

    if (!isSupportedEventType(event.type)) {
      await admin.rpc("ignore_stripe_webhook_event", {
        p_stripe_event_id: event.id,
        p_reason_code: "unsupported_event_type",
      });
      log.info("stripe.webhook.ignored", {
        errorCode: "unsupported_event_type",
        durationMs: Date.now() - startedAt,
        outcome: "ignored",
      });
      return respond({ received: true });
    }

    log.info("stripe.webhook.persisted", { attemptCount });

    const stripe = getStripeClient();
    const result = await withSpan(
      SPAN_NAMES.stripeWebhookProcess,
      { "stripe.event_type": event.type, "stripe.attempt": attemptCount },
      async () =>
        processStripeSubscriptionEvent({
          event,
          client: admin,
          fetchSubscription: (id) =>
            withSpan(SPAN_NAMES.stripeSubscriptionRetrieve, {}, async () =>
              stripe.subscriptions.retrieve(id),
            ),
        }),
    );

    if (result.outcome === "processed") {
      log.info(
        result.stale
          ? "billing.projection.unchanged"
          : "billing.projection.updated",
        {
          planTier: result.planTier,
          durationMs: Date.now() - startedAt,
          outcome: result.stale ? "stale" : "updated",
        },
      );
      log.info("stripe.webhook.processed", {
        planTier: result.planTier,
        durationMs: Date.now() - startedAt,
        outcome: "processed",
      });
      return respond({ received: true });
    }

    if (result.outcome === "ignored") {
      await admin.rpc("ignore_stripe_webhook_event", {
        p_stripe_event_id: event.id,
        p_reason_code: result.reasonCode,
      });
      log.info("stripe.webhook.ignored", {
        errorCode: result.reasonCode,
        outcome: "ignored",
      });
      return respond({ received: true });
    }

    if (
      result.outcome === "permanent_failure" ||
      attemptCount >= MAX_ATTEMPTS
    ) {
      // Nothing a redelivery would fix. Recorded as dead, answered 200 so
      // Stripe stops, and left visible for someone to look at.
      await admin.rpc("dead_letter_stripe_webhook_event", {
        p_stripe_event_id: event.id,
        p_error_code:
          result.outcome === "permanent_failure"
            ? result.errorCode
            : "attempts_exhausted",
        p_error_message: null,
      });
      if (result.errorCode === "provider_mapping_missing") {
        log.error("billing.provider_mapping_missing", { attemptCount });
      }

      log.error("stripe.webhook.dead_lettered", {
        errorCode: result.errorCode,
        attemptCount,
        durationMs: Date.now() - startedAt,
        outcome: "dead_letter",
      });
      return respond({ received: true, deadLettered: true });
    }

    await admin.rpc("fail_stripe_webhook_event", {
      p_stripe_event_id: event.id,
      p_delay_seconds: RETRY_DELAY_SECONDS,
      p_error_code: result.errorCode,
      p_error_message: null,
    });
    log.warn("stripe.webhook.retry_scheduled", {
      errorCode: result.errorCode,
      attemptCount,
      retryable: true,
      durationMs: Date.now() - startedAt,
      outcome: "retry",
    });

    // 500 asks Stripe to redeliver, which is the retry this deserves.
    return respond({ userMessage: "Could not process the event." }, 500);
  } catch (error) {
    const safe = toSafeError(error);
    log.error("stripe.webhook.failed", {
      errorCode: safe.code,
      errorName: safe.name,
      durationMs: Date.now() - startedAt,
      outcome: "failed",
    });

    return respond({ userMessage: "Could not process the event." }, 500);
  }
}
