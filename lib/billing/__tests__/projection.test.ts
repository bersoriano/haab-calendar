import { describe, expect, it } from "vitest";

import {
  BILLING_STATUSES,
  isBillingStatus,
  projectSubscription,
  resolveProviderId,
  type SubscriptionInput,
} from "@/lib/billing/projection";

const PREMIUM_PRODUCT = "prod_premium_test";
const PROVIDER = "00000000-0000-4000-8000-000000000001";

function subscription(overrides: Partial<SubscriptionInput> = {}): SubscriptionInput {
  return {
    id: "sub_test_1",
    customerId: "cus_test_1",
    status: "active",
    cancelAtPeriodEnd: false,
    metadata: { haab_provider_id: PROVIDER },
    items: [
      {
        productId: PREMIUM_PRODUCT,
        currentPeriodEnd: 1_800_000_000,
      },
    ],
    ...overrides,
  };
}

const premiumProducts = [PREMIUM_PRODUCT];

describe("projectSubscription", () => {
  it("grants premium for an active subscription to a premium product", () => {
    const result = projectSubscription(subscription(), { premiumProducts });

    expect(result).toMatchObject({
      planTier: "premium",
      status: "active",
      stripeSubscriptionId: "sub_test_1",
      stripeCustomerId: "cus_test_1",
    });
  });

  it("grants premium during a trial", () => {
    expect(
      projectSubscription(subscription({ status: "trialing" }), { premiumProducts })
        .planTier,
    ).toBe("premium");
  });

  it("keeps premium while a payment is being retried", () => {
    // Stripe is still retrying a past_due subscription. Cutting access on the
    // first failed charge would punish a provider for an expired card before
    // anyone has had a chance to fix it.
    expect(
      projectSubscription(subscription({ status: "past_due" }), { premiumProducts })
        .planTier,
    ).toBe("premium");
  });

  it.each(["unpaid", "canceled", "paused", "incomplete", "incomplete_expired"] as const)(
    "withholds premium for a %s subscription",
    (status) => {
      expect(
        projectSubscription(subscription({ status }), { premiumProducts }).planTier,
      ).toBe("free");
    },
  );

  it("fails closed on a status Stripe has not taught us yet", () => {
    const result = projectSubscription(
      subscription({ status: "quantum_superposition" }),
      { premiumProducts },
    );

    expect(result.planTier).toBe("free");
    expect(result.statusKnown).toBe(false);
    // The raw status is still recorded, so an operator can see what arrived.
    expect(result.status).toBe("quantum_superposition");
  });

  it("withholds premium for an active subscription to another product", () => {
    const result = projectSubscription(
      subscription({ items: [{ productId: "prod_something_else", currentPeriodEnd: 1 }] }),
      { premiumProducts },
    );

    expect(result.planTier).toBe("free");
  });

  it("grants premium when any item on the subscription is the premium product", () => {
    const result = projectSubscription(
      subscription({
        items: [
          { productId: "prod_addon", currentPeriodEnd: 1_800_000_000 },
          { productId: PREMIUM_PRODUCT, currentPeriodEnd: 1_800_000_500 },
        ],
      }),
      { premiumProducts },
    );

    expect(result.planTier).toBe("premium");
  });

  it("fails closed when no premium product is configured", () => {
    // An unconfigured deployment must not hand out premium to every subscriber.
    const result = projectSubscription(subscription(), { premiumProducts: [] });

    expect(result.planTier).toBe("free");
    expect(result.premiumProductConfigured).toBe(false);
  });

  it("takes the period end from the items, which is where Stripe now keeps it", () => {
    const result = projectSubscription(
      subscription({
        items: [
          { productId: PREMIUM_PRODUCT, currentPeriodEnd: 1_700_000_000 },
          { productId: "prod_addon", currentPeriodEnd: 1_900_000_000 },
        ],
      }),
      { premiumProducts },
    );

    // The furthest period end is the one access should survive to.
    expect(result.currentPeriodEnd).toBe(new Date(1_900_000_000 * 1000).toISOString());
  });

  it("survives a subscription with no items", () => {
    const result = projectSubscription(subscription({ items: [] }), { premiumProducts });

    expect(result.planTier).toBe("free");
    expect(result.currentPeriodEnd).toBeNull();
  });

  it("carries the cancel-at-period-end flag through", () => {
    const result = projectSubscription(subscription({ cancelAtPeriodEnd: true }), {
      premiumProducts,
    });

    // Still premium: cancelling at period end means access until that date.
    expect(result).toMatchObject({ planTier: "premium", cancelAtPeriodEnd: true });
  });

  it("treats a deleted subscription as no access", () => {
    const result = projectSubscription(subscription({ deleted: true }), {
      premiumProducts,
    });

    expect(result.planTier).toBe("free");
    expect(result.status).toBe("canceled");
  });
});

describe("resolveProviderId", () => {
  it("reads the provider from subscription metadata", () => {
    expect(resolveProviderId(subscription())).toBe(PROVIDER);
  });

  it("refuses a metadata value that is not a uuid", () => {
    expect(
      resolveProviderId(subscription({ metadata: { haab_provider_id: "not-a-uuid" } })),
    ).toBeNull();
  });

  it("refuses a missing mapping rather than guessing", () => {
    expect(resolveProviderId(subscription({ metadata: {} }))).toBeNull();
  });

  it("never falls back to the customer email", () => {
    const result = resolveProviderId(
      subscription({
        metadata: {},
        customerEmail: "owner@example.invalid",
      } as Partial<SubscriptionInput>),
    );

    // Email is not an identity here: two accounts can share one, and a customer
    // can change theirs in Stripe without touching this application.
    expect(result).toBeNull();
  });
});

describe("isBillingStatus", () => {
  it("knows the statuses Stripe documents", () => {
    for (const status of BILLING_STATUSES) {
      expect(isBillingStatus(status)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(isBillingStatus("almost_active")).toBe(false);
    expect(isBillingStatus(undefined)).toBe(false);
  });
});
