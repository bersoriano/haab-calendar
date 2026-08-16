import { DEFAULT_PLAN_TIER, type ProviderPlanTier } from "@/lib/entitlements/catalog";

/**
 * Turning a Stripe subscription into the plan tier this application recognises.
 *
 * Pure, and deliberately ignorant of Stripe's SDK types: the webhook layer
 * flattens whatever arrived into `SubscriptionInput`, so this mapping can be
 * tested without a network, a client, or a fixture of Stripe's whole object.
 */

/** The subscription statuses Stripe documents. Anything else fails closed. */
export const BILLING_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "canceled",
  "paused",
  "incomplete",
  "incomplete_expired",
] as const;

export type BillingStatus = (typeof BILLING_STATUSES)[number];

/**
 * Statuses that keep premium access.
 *
 * `past_due` is included on purpose: Stripe is still retrying the charge, and
 * revoking a paying provider's features on the first failed attempt would cut
 * off their booking page over an expired card. `unpaid` is where Stripe gives
 * up, and that is where access stops.
 */
const ACCESS_GRANTING_STATUSES: readonly BillingStatus[] = [
  "active",
  "trialing",
  "past_due",
];

export function isBillingStatus(value: unknown): value is BillingStatus {
  return (BILLING_STATUSES as readonly unknown[]).includes(value);
}

export type SubscriptionItemInput = {
  productId: string | null;
  /** Unix seconds, as Stripe sends it. Item-level since the 2025 API versions. */
  currentPeriodEnd: number | null;
};

export type SubscriptionInput = {
  id: string;
  customerId: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  metadata: Record<string, string | undefined>;
  items: SubscriptionItemInput[];
  /** Set for `customer.subscription.deleted`, where the status may lag. */
  deleted?: boolean;
};

export type BillingProjection = {
  stripeSubscriptionId: string;
  stripeCustomerId: string | null;
  status: string;
  /** False when Stripe sent a status this build does not know. */
  statusKnown: boolean;
  planTier: ProviderPlanTier;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** False when no premium product is configured, which withholds premium. */
  premiumProductConfigured: boolean;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * The provider a subscription belongs to, taken from metadata written when the
 * subscription was created.
 *
 * There is deliberately no email fallback. An email is not an identity: two
 * accounts can share one, a customer can change theirs inside Stripe without
 * this application hearing about it, and matching on it would let anyone who
 * can set an email in Stripe claim someone else's provider.
 */
export function resolveProviderId(subscription: SubscriptionInput): string | null {
  const raw = subscription.metadata?.haab_provider_id?.trim();

  if (!raw || !UUID_PATTERN.test(raw)) {
    return null;
  }

  return raw;
}

export function projectSubscription(
  subscription: SubscriptionInput,
  options: { premiumProducts: readonly string[] },
): BillingProjection {
  const premiumProductConfigured = options.premiumProducts.length > 0;
  const status = subscription.deleted ? "canceled" : subscription.status;
  const statusKnown = isBillingStatus(status);

  const hasPremiumProduct = subscription.items.some(
    (item) => item.productId && options.premiumProducts.includes(item.productId),
  );

  // Every condition has to hold. An unknown status, an unconfigured product
  // list, or a subscription to something else all resolve to the default tier
  // rather than to a guess in the provider's favour.
  const grantsAccess =
    statusKnown &&
    premiumProductConfigured &&
    hasPremiumProduct &&
    ACCESS_GRANTING_STATUSES.includes(status as BillingStatus);

  const periodEnds = subscription.items
    .map((item) => item.currentPeriodEnd)
    .filter((value): value is number => typeof value === "number" && value > 0);

  return {
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customerId ?? null,
    status,
    statusKnown,
    planTier: grantsAccess ? "premium" : DEFAULT_PLAN_TIER,
    currentPeriodEnd:
      periodEnds.length > 0
        ? new Date(Math.max(...periodEnds) * 1000).toISOString()
        : null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    premiumProductConfigured,
  };
}
