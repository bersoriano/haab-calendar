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
  const webhookSecret = getStripeWebhookSecret();
  const signature = request.headers.get("stripe-signature");

  // An unconfigured deployment must not accept unverified events, so the
  // endpoint refuses everything rather than falling back to trusting the body.
  if (!webhookSecret) {
    console.error("stripe_webhook_unconfigured");
    return NextResponse.json({ userMessage: "Not found." }, { status: 400 });
  }

  if (!signature) {
    console.warn("stripe_webhook_signature_missing");
    return NextResponse.json({ userMessage: "Invalid signature." }, { status: 400 });
  }

  // The exact bytes Stripe signed. Parsing and re-serialising would change the
  // whitespace and break verification — which is the point of reading it raw.
  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    if (error instanceof StripeConfigError) {
      console.error("stripe_webhook_unconfigured", { code: error.code });
      return NextResponse.json({ userMessage: "Not found." }, { status: 400 });
    }

    // Bad signature, tampered body, stale timestamp, unparseable JSON — all the
    // same answer, and none of them reach the inbox.
    console.warn("stripe_webhook_signature_invalid");
    return NextResponse.json({ userMessage: "Invalid signature." }, { status: 400 });
  }

  // Only now is the livemode flag worth reading. A test-mode deployment that
  // honoured a live event, or the reverse, would project someone else's
  // subscription onto a provider here.
  if (event.livemode !== isStripeLiveMode()) {
    console.warn("stripe_webhook_mode_mismatch", {
      stripeEventId: event.id,
      livemode: event.livemode,
    });
    return NextResponse.json({ userMessage: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    const { error: insertError } = await admin.from("stripe_webhook_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      api_version: event.api_version ?? null,
      livemode: event.livemode,
      event_created_at: new Date(event.created * 1000).toISOString(),
      payload: event as unknown as Record<string, unknown>,
    });

    // 23505: this event has been delivered before. That is Stripe working as
    // documented, not an error — the row already exists, and the claim below
    // decides whether there is anything left to do with it.
    if (insertError && insertError.code !== "23505") {
      console.error("stripe_webhook_persist_failed", {
        stripeEventId: event.id,
        code: insertError.code,
      });
      return NextResponse.json(
        { userMessage: "Could not record the event." },
        { status: 500 },
      );
    }

    const duplicate = Boolean(insertError);

    const { data: claimed, error: claimError } = await admin.rpc(
      "claim_stripe_webhook_event",
      { p_stripe_event_id: event.id, p_lease_seconds: 60 },
    );

    if (claimError) {
      console.error("stripe_webhook_claim_failed", { stripeEventId: event.id });
      return NextResponse.json(
        { userMessage: "Could not record the event." },
        { status: 500 },
      );
    }

    if (!claimed) {
      // Already settled, or another delivery of the same event is being
      // processed right now. Either way there is nothing for this request to
      // do, and Stripe should stop retrying.
      console.log("stripe_webhook_duplicate", {
        stripeEventId: event.id,
        eventType: event.type,
      });
      return NextResponse.json({ received: true, duplicate });
    }

    const attemptCount = (claimed as { attempt_count: number }).attempt_count ?? 1;

    if (!isSupportedEventType(event.type)) {
      await admin.rpc("ignore_stripe_webhook_event", {
        p_stripe_event_id: event.id,
        p_reason_code: "unsupported_event_type",
      });
      console.log("stripe_webhook_ignored", {
        stripeEventId: event.id,
        eventType: event.type,
      });
      return NextResponse.json({ received: true });
    }

    const stripe = getStripeClient();
    const result = await processStripeSubscriptionEvent({
      event,
      client: admin,
      fetchSubscription: (id) => stripe.subscriptions.retrieve(id),
    });

    if (result.outcome === "processed") {
      console.log("stripe_webhook_processed", {
        stripeEventId: event.id,
        eventType: event.type,
        planTier: result.planTier,
        stale: result.stale,
      });
      return NextResponse.json({ received: true });
    }

    if (result.outcome === "ignored") {
      await admin.rpc("ignore_stripe_webhook_event", {
        p_stripe_event_id: event.id,
        p_reason_code: result.reasonCode,
      });
      return NextResponse.json({ received: true });
    }

    if (result.outcome === "permanent_failure" || attemptCount >= MAX_ATTEMPTS) {
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
      console.error("stripe_webhook_dead_lettered", {
        stripeEventId: event.id,
        eventType: event.type,
        errorCode: result.errorCode,
        attemptCount,
      });
      return NextResponse.json({ received: true, deadLettered: true });
    }

    await admin.rpc("fail_stripe_webhook_event", {
      p_stripe_event_id: event.id,
      p_delay_seconds: RETRY_DELAY_SECONDS,
      p_error_code: result.errorCode,
      p_error_message: null,
    });
    console.warn("stripe_webhook_retry_scheduled", {
      stripeEventId: event.id,
      eventType: event.type,
      errorCode: result.errorCode,
      attemptCount,
    });

    // 500 asks Stripe to redeliver, which is the retry this deserves.
    return NextResponse.json({ userMessage: "Could not process the event." }, {
      status: 500,
    });
  } catch (error) {
    console.error("stripe_webhook_failed", {
      stripeEventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? error.name : "unknown",
    });

    return NextResponse.json(
      { userMessage: "Could not process the event." },
      { status: 500 },
    );
  }
}
