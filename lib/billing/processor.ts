import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import {
  projectSubscription,
  resolveProviderId,
  type SubscriptionInput,
} from "@/lib/billing/projection";
import { getStripePremiumProducts } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Applying a Stripe subscription event to this application's billing
 * projection.
 *
 * Everything here runs through the service role: the projection decides paid
 * access, so no client role may touch it. The processor is deliberately small
 * — flatten the event, decide the tier, write it atomically with the inbox
 * completion — and every decision it cannot make confidently resolves to no
 * access.
 */

/** Events that change a provider's tier. Everything else is ignored. */
export const SUPPORTED_EVENT_TYPES = [
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
] as const;

export type SupportedEventType = (typeof SUPPORTED_EVENT_TYPES)[number];

export function isSupportedEventType(value: string): value is SupportedEventType {
  return (SUPPORTED_EVENT_TYPES as readonly string[]).includes(value);
}

export type ProcessOutcome =
  | { outcome: "processed"; planTier: "free" | "premium"; stale: boolean }
  | { outcome: "ignored"; reasonCode: string }
  | { outcome: "retryable_failure"; errorCode: string }
  | { outcome: "permanent_failure"; errorCode: string };

function productIdOf(price: Stripe.Price | null | undefined): string | null {
  const product = price?.product;

  if (!product) {
    return null;
  }

  // Stripe sends the product as an id, or as the expanded object when the
  // subscription was retrieved with `expand`. Both shapes have to work, since
  // a webhook payload and a fresh retrieval do not always agree.
  return typeof product === "string" ? product : product.id;
}

/** Flattens the SDK's subscription into the shape the pure mapper accepts. */
export function toSubscriptionInput(
  subscription: Stripe.Subscription,
  options: { deleted?: boolean } = {},
): SubscriptionInput {
  return {
    id: subscription.id,
    customerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : (subscription.customer?.id ?? null),
    status: subscription.status,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    metadata: (subscription.metadata ?? {}) as Record<string, string | undefined>,
    items: (subscription.items?.data ?? []).map((item) => ({
      productId: productIdOf(item.price),
      // Period end moved onto the item in recent API versions; read it there
      // and fall back for anything still sending it on the subscription.
      currentPeriodEnd:
        item.current_period_end ??
        (subscription as unknown as { current_period_end?: number })
          .current_period_end ??
        null,
    })),
    deleted: options.deleted,
  };
}

export type SubscriptionFetcher = (id: string) => Promise<Stripe.Subscription>;

/**
 * Handle one verified Stripe event.
 *
 * `deleted` events keep the payload's own copy of the subscription, because a
 * deleted subscription cannot be retrieved. Every other event re-reads the
 * subscription from Stripe when a fetcher is supplied: webhook delivery has no
 * ordering guarantee, and the live object is the only thing that reliably says
 * what is true *now*.
 */
export async function processStripeSubscriptionEvent(input: {
  event: Stripe.Event;
  fetchSubscription?: SubscriptionFetcher;
  client?: SupabaseClient;
  premiumProducts?: readonly string[];
}): Promise<ProcessOutcome> {
  const { event } = input;

  if (!isSupportedEventType(event.type)) {
    return { outcome: "ignored", reasonCode: "unsupported_event_type" };
  }

  const payloadSubscription = event.data?.object as Stripe.Subscription | undefined;

  if (!payloadSubscription?.id) {
    return { outcome: "permanent_failure", errorCode: "missing_subscription" };
  }

  const deleted = event.type === "customer.subscription.deleted";
  let subscription = payloadSubscription;

  if (!deleted && input.fetchSubscription) {
    try {
      subscription = await input.fetchSubscription(payloadSubscription.id);
    } catch {
      // Stripe was unreachable, not wrong. Stripe will redeliver, and the
      // inbox will retry — nothing is decided from a half-read state.
      return { outcome: "retryable_failure", errorCode: "subscription_retrieve_failed" };
    }
  }

  const flattened = toSubscriptionInput(subscription, { deleted });
  const providerId = resolveProviderId(flattened);

  if (!providerId) {
    // No usable mapping, and there is no second way to find one: matching on
    // email would let anyone who can set an email in Stripe claim a provider.
    return { outcome: "permanent_failure", errorCode: "provider_mapping_missing" };
  }

  const projection = projectSubscription(flattened, {
    premiumProducts: input.premiumProducts ?? getStripePremiumProducts(),
  });

  const admin = input.client ?? createAdminClient();

  const { data: provider, error: providerError } = await admin
    .from("providers")
    .select("id")
    .eq("id", providerId)
    .maybeSingle<{ id: string }>();

  if (providerError) {
    return { outcome: "retryable_failure", errorCode: "provider_lookup_failed" };
  }

  if (!provider) {
    return { outcome: "permanent_failure", errorCode: "provider_not_found" };
  }

  const { data, error } = await admin.rpc("apply_stripe_subscription_projection", {
    p_stripe_event_id: event.id,
    p_provider_id: providerId,
    p_stripe_customer_id: projection.stripeCustomerId,
    p_stripe_subscription_id: projection.stripeSubscriptionId,
    p_status: projection.status,
    p_plan_tier: projection.planTier,
    p_current_period_end: projection.currentPeriodEnd,
    p_cancel_at_period_end: projection.cancelAtPeriodEnd,
    p_event_created_at: new Date(event.created * 1000).toISOString(),
  });

  if (error) {
    return { outcome: "retryable_failure", errorCode: "projection_write_failed" };
  }

  return {
    outcome: "processed",
    planTier: projection.planTier,
    stale: data === "stale",
  };
}
