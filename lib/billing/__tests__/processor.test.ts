import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("Processor tests must inject a client.");
  },
}));

import {
  isSupportedEventType,
  processStripeSubscriptionEvent,
  toSubscriptionInput,
} from "@/lib/billing/processor";
import {
  subscriptionEventFixture,
  subscriptionFixture,
  TEST_PREMIUM_PRODUCT,
  TEST_PROVIDER_ID,
} from "@/test/fixtures/stripe/subscriptions";

const premiumProducts = [TEST_PREMIUM_PRODUCT];

function makeClient(options: { providerExists?: boolean; rpcResult?: string } = {}) {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

  const client = {
    from: (table: string) => {
      if (table !== "providers") throw new Error(`Unexpected table: ${table}`);

      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({
          data: (options.providerExists ?? true) ? { id: TEST_PROVIDER_ID } : null,
          error: null,
        }),
      };
      return query;
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      return { data: options.rpcResult ?? "updated", error: null };
    },
  };

  return { client: client as unknown as SupabaseClient, rpcCalls };
}

function event(overrides: Parameters<typeof subscriptionEventFixture>[0] = {}) {
  return subscriptionEventFixture(overrides) as unknown as Stripe.Event;
}

describe("processStripeSubscriptionEvent", () => {
  it("projects premium for an active subscription and records the event", async () => {
    const { client, rpcCalls } = makeClient();

    const result = await processStripeSubscriptionEvent({
      event: event(),
      client,
      premiumProducts,
    });

    expect(result).toMatchObject({ outcome: "processed", planTier: "premium" });
    expect(rpcCalls[0].name).toBe("apply_stripe_subscription_projection");
    expect(rpcCalls[0].args).toMatchObject({
      p_provider_id: TEST_PROVIDER_ID,
      p_plan_tier: "premium",
      p_status: "active",
    });
  });

  it("maps the provider from metadata, never from an email", async () => {
    const { client, rpcCalls } = makeClient();

    const result = await processStripeSubscriptionEvent({
      event: event({ providerId: null }),
      client,
      premiumProducts,
    });

    expect(result).toEqual({
      outcome: "permanent_failure",
      errorCode: "provider_mapping_missing",
    });
    expect(rpcCalls).toHaveLength(0);
  });

  it("refuses a provider id that is not a uuid", async () => {
    const { client } = makeClient();

    const result = await processStripeSubscriptionEvent({
      event: event({ providerId: "acct_12345" }),
      client,
      premiumProducts,
    });

    expect(result).toMatchObject({ errorCode: "provider_mapping_missing" });
  });

  it("dead-ends on a provider that no longer exists", async () => {
    const { client, rpcCalls } = makeClient({ providerExists: false });

    const result = await processStripeSubscriptionEvent({
      event: event(),
      client,
      premiumProducts,
    });

    expect(result).toEqual({
      outcome: "permanent_failure",
      errorCode: "provider_not_found",
    });
    expect(rpcCalls).toHaveLength(0);
  });

  it("re-reads the subscription from Stripe, because delivery order is not guaranteed", async () => {
    const { client, rpcCalls } = makeClient();
    const fetchSubscription = vi.fn(async () =>
      subscriptionFixture({ status: "canceled" }) as unknown as Stripe.Subscription,
    );

    // The payload says active; the live object says canceled. The live one wins.
    const result = await processStripeSubscriptionEvent({
      event: event({ status: "active" }),
      client,
      premiumProducts,
      fetchSubscription,
    });

    expect(fetchSubscription).toHaveBeenCalledWith("sub_test_haab_1");
    expect(result).toMatchObject({ planTier: "free" });
    expect(rpcCalls[0].args).toMatchObject({ p_status: "canceled" });
  });

  it("keeps the payload's copy for a deleted subscription, which cannot be re-read", async () => {
    const { client, rpcCalls } = makeClient();
    const fetchSubscription = vi.fn();

    const result = await processStripeSubscriptionEvent({
      event: event({ type: "customer.subscription.deleted", status: "active" }),
      client,
      premiumProducts,
      fetchSubscription,
    });

    expect(fetchSubscription).not.toHaveBeenCalled();
    expect(result).toMatchObject({ outcome: "processed", planTier: "free" });
    expect(rpcCalls[0].args).toMatchObject({ p_status: "canceled" });
  });

  it("retries when Stripe could not be reached", async () => {
    const { client, rpcCalls } = makeClient();

    const result = await processStripeSubscriptionEvent({
      event: event(),
      client,
      premiumProducts,
      fetchSubscription: async () => {
        throw new Error("ETIMEDOUT");
      },
    });

    expect(result).toEqual({
      outcome: "retryable_failure",
      errorCode: "subscription_retrieve_failed",
    });
    expect(rpcCalls).toHaveLength(0);
  });

  it("reads the product whether Stripe sent an id or an expanded object", async () => {
    const expanded = makeClient();
    const expandedResult = await processStripeSubscriptionEvent({
      event: event({ expandProduct: true }),
      client: expanded.client,
      premiumProducts,
    });

    const plain = makeClient();
    const plainResult = await processStripeSubscriptionEvent({
      event: event({ expandProduct: false }),
      client: plain.client,
      premiumProducts,
    });

    expect(expandedResult).toMatchObject({ planTier: "premium" });
    expect(plainResult).toMatchObject({ planTier: "premium" });
  });

  it("grants premium when the premium product is one item among several", async () => {
    const { client } = makeClient();

    const result = await processStripeSubscriptionEvent({
      event: event({
        productId: "prod_test_addon",
        extraItems: [{ productId: TEST_PREMIUM_PRODUCT }],
      }),
      client,
      premiumProducts,
    });

    expect(result).toMatchObject({ planTier: "premium" });
  });

  it("withholds premium for a subscription to a different product", async () => {
    const { client } = makeClient();

    const result = await processStripeSubscriptionEvent({
      event: event({ productId: "prod_test_other" }),
      client,
      premiumProducts,
    });

    expect(result).toMatchObject({ planTier: "free" });
  });

  it("reports a projection the database refused as stale", async () => {
    const { client } = makeClient({ rpcResult: "stale" });

    const result = await processStripeSubscriptionEvent({
      event: event(),
      client,
      premiumProducts,
    });

    // An older event arrived after a newer one. Recorded, but not applied.
    expect(result).toMatchObject({ outcome: "processed", stale: true });
  });

  it("ignores an event type it does not handle", async () => {
    const { client, rpcCalls } = makeClient();

    const result = await processStripeSubscriptionEvent({
      event: { ...event(), type: "invoice.paid" } as Stripe.Event,
      client,
      premiumProducts,
    });

    expect(result).toEqual({ outcome: "ignored", reasonCode: "unsupported_event_type" });
    expect(rpcCalls).toHaveLength(0);
  });

  it("fails permanently when the event carries no subscription", async () => {
    const { client } = makeClient();

    const result = await processStripeSubscriptionEvent({
      event: { ...event(), data: { object: {} } } as unknown as Stripe.Event,
      client,
      premiumProducts,
    });

    expect(result).toEqual({
      outcome: "permanent_failure",
      errorCode: "missing_subscription",
    });
  });

  it("passes Stripe's own timestamp through, so ordering is Stripe's not ours", async () => {
    const { client, rpcCalls } = makeClient();

    await processStripeSubscriptionEvent({
      event: event({ created: 1_790_000_500 }),
      client,
      premiumProducts,
    });

    expect(rpcCalls[0].args.p_event_created_at).toBe(
      new Date(1_790_000_500 * 1000).toISOString(),
    );
  });
});

describe("toSubscriptionInput", () => {
  it("reads the period end from the item", () => {
    const flattened = toSubscriptionInput(
      subscriptionFixture({ currentPeriodEnd: 1_812_345_678 }) as unknown as Stripe.Subscription,
    );

    expect(flattened.items[0].currentPeriodEnd).toBe(1_812_345_678);
  });

  it("handles a customer sent as an object", () => {
    const subscription = {
      ...subscriptionFixture(),
      customer: { id: "cus_test_object", object: "customer" },
    } as unknown as Stripe.Subscription;

    expect(toSubscriptionInput(subscription).customerId).toBe("cus_test_object");
  });
});

describe("isSupportedEventType", () => {
  it("accepts the subscription lifecycle events", () => {
    expect(isSupportedEventType("customer.subscription.created")).toBe(true);
    expect(isSupportedEventType("customer.subscription.deleted")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isSupportedEventType("invoice.payment_failed")).toBe(false);
    expect(isSupportedEventType("checkout.session.completed")).toBe(false);
  });
});
