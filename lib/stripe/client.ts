import "server-only";

import Stripe from "stripe";

import { requireStripeConfig } from "@/lib/stripe/config";

/**
 * The Stripe client, built on first use and reused after.
 *
 * Never constructed at module load: importing this file must not require
 * credentials, or a build without them would fail. The key is read here and
 * nowhere else, and this module is server-only so it cannot reach a bundle.
 */
let cached: { key: string; client: Stripe } | undefined;

export function getStripeClient(): Stripe {
  const { secretKey } = requireStripeConfig();

  if (cached?.key === secretKey) {
    return cached.client;
  }

  const client = new Stripe(secretKey, {
    // Pinned to the version this SDK was generated against. Explicit rather
    // than implicit: a silently changed API version would change the shape of
    // the subscriptions the projection reads.
    apiVersion: "2026-07-29.dahlia",
    typescript: true,
    telemetry: false,
    maxNetworkRetries: 2,
  });

  cached = { key: secretKey, client };
  return client;
}

/** Test seam: drops the memoised client so a changed key is picked up. */
export function resetStripeClientCache() {
  cached = undefined;
}
