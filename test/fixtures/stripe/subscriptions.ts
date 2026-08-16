/**
 * Synthetic Stripe fixtures.
 *
 * Factories rather than stored JSON: almost every test differs by one status,
 * one timestamp, or one product, and a folder of near-identical event files
 * would hide those differences instead of showing them. Every identifier here
 * is obviously fake, `livemode` is false, and no field was copied from a real
 * Stripe account.
 */

export const TEST_PROVIDER_ID = "00000000-0000-4000-8000-000000000001";
export const TEST_PREMIUM_PRODUCT = "prod_test_premium_haab";
export const TEST_API_VERSION = "2026-07-29.dahlia";

export type SubscriptionFixtureOptions = {
  subscriptionId?: string;
  customerId?: string;
  status?: string;
  cancelAtPeriodEnd?: boolean;
  providerId?: string | null;
  productId?: string;
  /** Passing an object exercises the expanded-product shape. */
  expandProduct?: boolean;
  currentPeriodEnd?: number;
  extraItems?: Array<{ productId: string; currentPeriodEnd?: number }>;
  items?: [];
};

export function subscriptionFixture(options: SubscriptionFixtureOptions = {}) {
  const {
    subscriptionId = "sub_test_haab_1",
    customerId = "cus_test_haab_1",
    status = "active",
    cancelAtPeriodEnd = false,
    providerId = TEST_PROVIDER_ID,
    productId = TEST_PREMIUM_PRODUCT,
    expandProduct = false,
    currentPeriodEnd = 1_800_000_000,
    extraItems = [],
  } = options;

  const item = (product: string, periodEnd: number, index: number) => ({
    id: `si_test_${index}`,
    object: "subscription_item",
    current_period_end: periodEnd,
    current_period_start: periodEnd - 2_592_000,
    price: {
      id: `price_test_${index}`,
      object: "price",
      product: expandProduct
        ? { id: product, object: "product", name: "Haab Premium (test)" }
        : product,
    },
  });

  const items =
    options.items ??
    [
      item(productId, currentPeriodEnd, 1),
      ...extraItems.map((extra, index) =>
        item(extra.productId, extra.currentPeriodEnd ?? currentPeriodEnd, index + 2),
      ),
    ];

  return {
    id: subscriptionId,
    object: "subscription",
    customer: customerId,
    status,
    cancel_at_period_end: cancelAtPeriodEnd,
    livemode: false,
    metadata: providerId ? { haab_provider_id: providerId } : {},
    items: { object: "list", data: items },
  };
}

export type EventFixtureOptions = SubscriptionFixtureOptions & {
  eventId?: string;
  type?: string;
  created?: number;
  livemode?: boolean;
};

export function subscriptionEventFixture(options: EventFixtureOptions = {}) {
  const {
    eventId = "evt_test_haab_1",
    type = "customer.subscription.updated",
    created = 1_790_000_000,
    livemode = false,
    ...subscriptionOptions
  } = options;

  return {
    id: eventId,
    object: "event",
    api_version: TEST_API_VERSION,
    created,
    livemode,
    type,
    data: { object: subscriptionFixture(subscriptionOptions) },
  };
}

/** An event this application has no handler for, and should record as ignored. */
export function unsupportedEventFixture(options: { eventId?: string } = {}) {
  return {
    id: options.eventId ?? "evt_test_unsupported_1",
    object: "event",
    api_version: TEST_API_VERSION,
    created: 1_790_000_000,
    livemode: false,
    type: "invoice.payment_succeeded",
    data: {
      object: {
        id: "in_test_haab_1",
        object: "invoice",
        customer: "cus_test_haab_1",
        customer_email: "billing@example.invalid",
      },
    },
  };
}
