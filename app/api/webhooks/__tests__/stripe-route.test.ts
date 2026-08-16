import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  subscriptionEventFixture,
  TEST_PREMIUM_PRODUCT,
  unsupportedEventFixture,
} from "@/test/fixtures/stripe/subscriptions";

/**
 * Signatures are generated with the real Stripe SDK and verified by the real
 * Stripe SDK. Mocking that away would leave the one security property this
 * endpoint has — that an unsigned body cannot reach the inbox — untested.
 */

vi.mock("server-only", () => ({}));

const WEBHOOK_SECRET = "whsec_test_only_not_real";

const supabase = vi.hoisted(() => ({
  inserted: [] as Record<string, unknown>[],
  rpcCalls: [] as Array<{ name: string; args: Record<string, unknown> }>,
  insertError: null as { code: string } | null,
  claimResult: { attempt_count: 1 } as unknown,
  claimError: null as { message: string } | null,
  providerExists: true,
  processResult: null as unknown,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "stripe_webhook_events") {
        return {
          insert: async (row: Record<string, unknown>) => {
            if (!supabase.insertError) supabase.inserted.push(row);
            return { error: supabase.insertError };
          },
        };
      }

      if (table === "providers") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({
            data: supabase.providerExists ? { id: "p1" } : null,
            error: null,
          }),
        };
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      supabase.rpcCalls.push({ name, args });

      if (name === "claim_stripe_webhook_event") {
        return { data: supabase.claimResult, error: supabase.claimError };
      }

      if (name === "apply_stripe_subscription_projection") {
        return { data: "updated", error: null };
      }

      return { data: true, error: null };
    },
  }),
}));

const processor = vi.hoisted(() => ({ override: null as unknown }));

vi.mock("@/lib/billing/processor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/billing/processor")>();

  return {
    ...actual,
    processStripeSubscriptionEvent: async (
      input: Parameters<typeof actual.processStripeSubscriptionEvent>[0],
    ) =>
      processor.override ??
      actual.processStripeSubscriptionEvent({ ...input, fetchSubscription: undefined }),
  };
});

import { POST } from "@/app/api/webhooks/stripe/route";

const stripe = new Stripe("sk_test_not_a_real_key", {
  apiVersion: "2026-07-29.dahlia",
});

function signedRequest(body: string, options: { timestamp?: number; secret?: string } = {}) {
  const header = stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: options.secret ?? WEBHOOK_SECRET,
    timestamp: options.timestamp,
  });

  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": header, "content-type": "application/json" },
    body,
  }) as unknown as NextRequest;
}

function body(fixture: unknown) {
  // Deliberately pretty-printed: Stripe signs bytes, so a route that parsed and
  // re-serialised the body would fail against this and pass against a compact
  // one. Signing the exact string proves the raw body reaches verification.
  return JSON.stringify(fixture, null, 2);
}

beforeEach(() => {
  supabase.inserted = [];
  supabase.rpcCalls = [];
  supabase.insertError = null;
  supabase.claimResult = { attempt_count: 1 };
  supabase.claimError = null;
  supabase.providerExists = true;
  processor.override = null;

  process.env.STRIPE_SECRET_KEY = "sk_test_not_a_real_key";
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.STRIPE_PREMIUM_PRODUCT_IDS = TEST_PREMIUM_PRODUCT;

  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_PREMIUM_PRODUCT_IDS;
  vi.restoreAllMocks();
});

describe("POST /api/webhooks/stripe — signature", () => {
  it("accepts a correctly signed event and records it before acting", async () => {
    const payload = body(subscriptionEventFixture());

    const response = await POST(signedRequest(payload));

    expect(response.status).toBe(200);
    expect(supabase.inserted).toHaveLength(1);
    expect(supabase.inserted[0]).toMatchObject({
      stripe_event_id: "evt_test_haab_1",
      event_type: "customer.subscription.updated",
      livemode: false,
    });
    // Persisted first, processed second.
    expect(supabase.rpcCalls[0].name).toBe("claim_stripe_webhook_event");
  });

  it("verifies against the exact bytes, not a re-serialised body", async () => {
    const fixture = subscriptionEventFixture();
    const signedPayload = JSON.stringify(fixture, null, 2);
    const compactPayload = JSON.stringify(fixture);

    expect(signedPayload).not.toBe(compactPayload);

    const header = stripe.webhooks.generateTestHeaderString({
      payload: signedPayload,
      secret: WEBHOOK_SECRET,
    });
    const request = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": header },
      body: compactPayload,
    }) as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(supabase.inserted).toHaveLength(0);
  });

  it("rejects a request with no signature header", async () => {
    const request = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: body(subscriptionEventFixture()),
    }) as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(supabase.inserted).toHaveLength(0);
  });

  it("rejects a signature made with the wrong secret", async () => {
    const response = await POST(
      signedRequest(body(subscriptionEventFixture()), { secret: "whsec_wrong_secret" }),
    );

    expect(response.status).toBe(400);
    expect(supabase.inserted).toHaveLength(0);
  });

  it("rejects a payload tampered with after signing", async () => {
    const original = body(subscriptionEventFixture({ status: "canceled" }));
    const header = stripe.webhooks.generateTestHeaderString({
      payload: original,
      secret: WEBHOOK_SECRET,
    });
    const tampered = original.replace('"canceled"', '"active"');

    const request = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": header },
      body: tampered,
    }) as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(supabase.inserted).toHaveLength(0);
  });

  it("rejects a signature older than Stripe's tolerance", async () => {
    const staleTimestamp = Math.floor(Date.now() / 1000) - 60 * 60;

    const response = await POST(
      signedRequest(body(subscriptionEventFixture()), { timestamp: staleTimestamp }),
    );

    expect(response.status).toBe(400);
    expect(supabase.inserted).toHaveLength(0);
  });

  it("rejects signed but malformed JSON without leaking the parser error", async () => {
    const response = await POST(signedRequest("{not json at all"));

    expect(response.status).toBe(400);
    const text = JSON.stringify(await response.json());
    expect(text).not.toContain("JSON");
    expect(text).not.toContain("token");
    expect(supabase.inserted).toHaveLength(0);
  });

  it("refuses to run without a configured webhook secret", async () => {
    const payload = body(subscriptionEventFixture());
    const request = signedRequest(payload);
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(supabase.inserted).toHaveLength(0);
  });

  it("rejects a live-mode event on a test-mode deployment", async () => {
    const response = await POST(
      signedRequest(body(subscriptionEventFixture({ livemode: true }))),
    );

    expect(response.status).toBe(400);
    expect(supabase.inserted).toHaveLength(0);
  });
});

describe("POST /api/webhooks/stripe — inbox behaviour", () => {
  it("records an unsupported event as ignored and stops", async () => {
    const response = await POST(signedRequest(body(unsupportedEventFixture())));

    expect(response.status).toBe(200);
    expect(supabase.inserted).toHaveLength(1);
    expect(supabase.rpcCalls.map((call) => call.name)).toContain(
      "ignore_stripe_webhook_event",
    );
  });

  it("treats a redelivered, already-settled event as done", async () => {
    supabase.insertError = { code: "23505" };
    supabase.claimResult = null;

    const response = await POST(signedRequest(body(subscriptionEventFixture())));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ duplicate: true });
    // Claimed nothing, so nothing was applied a second time.
    expect(
      supabase.rpcCalls.filter(
        (call) => call.name === "apply_stripe_subscription_projection",
      ),
    ).toHaveLength(0);
  });

  it("does not process an event another delivery is holding", async () => {
    supabase.claimResult = null;

    const response = await POST(signedRequest(body(subscriptionEventFixture())));

    expect(response.status).toBe(200);
    expect(
      supabase.rpcCalls.filter(
        (call) => call.name === "apply_stripe_subscription_projection",
      ),
    ).toHaveLength(0);
  });

  it("asks Stripe to retry a transient failure", async () => {
    processor.override = { outcome: "retryable_failure", errorCode: "provider_lookup_failed" };

    const response = await POST(signedRequest(body(subscriptionEventFixture())));

    expect(response.status).toBe(500);
    const failCall = supabase.rpcCalls.find(
      (call) => call.name === "fail_stripe_webhook_event",
    );
    expect(failCall?.args).toMatchObject({ p_error_code: "provider_lookup_failed" });
  });

  it("dead-letters a permanent failure and stops Stripe retrying", async () => {
    processor.override = {
      outcome: "permanent_failure",
      errorCode: "provider_mapping_missing",
    };

    const response = await POST(signedRequest(body(subscriptionEventFixture())));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ deadLettered: true });
    const deadCall = supabase.rpcCalls.find(
      (call) => call.name === "dead_letter_stripe_webhook_event",
    );
    expect(deadCall?.args).toMatchObject({ p_error_code: "provider_mapping_missing" });
  });

  it("dead-letters once the attempts are exhausted", async () => {
    supabase.claimResult = { attempt_count: 6 };
    processor.override = { outcome: "retryable_failure", errorCode: "projection_write_failed" };

    const response = await POST(signedRequest(body(subscriptionEventFixture())));

    expect(response.status).toBe(200);
    const deadCall = supabase.rpcCalls.find(
      (call) => call.name === "dead_letter_stripe_webhook_event",
    );
    expect(deadCall?.args).toMatchObject({ p_error_code: "attempts_exhausted" });
  });

  it("answers 500 when the event could not be recorded at all", async () => {
    supabase.insertError = { code: "42501" };

    const response = await POST(signedRequest(body(subscriptionEventFixture())));

    expect(response.status).toBe(500);
    expect(
      supabase.rpcCalls.filter((call) => call.name === "claim_stripe_webhook_event"),
    ).toHaveLength(0);
  });

  it("returns no payload, secret, or database detail in any response", async () => {
    processor.override = {
      outcome: "permanent_failure",
      errorCode: "provider_mapping_missing",
    };

    const response = await POST(signedRequest(body(subscriptionEventFixture())));
    const text = JSON.stringify(await response.json());

    expect(text).not.toContain("whsec");
    expect(text).not.toContain("sub_test");
    expect(text).not.toContain("cus_test");
    expect(text).not.toContain("relation");
    expect(text).not.toContain("at ");
  });
});
