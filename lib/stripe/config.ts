import "server-only";

/**
 * Stripe configuration, read at call time rather than at import time.
 *
 * Lazy on purpose: `next build` must succeed on a machine with no Stripe
 * credentials, and a module that threw while loading would take the whole build
 * with it. Every reader here fails closed instead — a missing secret means the
 * webhook route refuses requests, not that it accepts unverified ones.
 */

export type StripeConfig = {
  secretKey: string;
  webhookSecret: string;
  /** Products that grant premium. Empty means nothing does. */
  premiumProducts: readonly string[];
  /** Whether this deployment expects live-mode events. */
  liveMode: boolean;
};

export class StripeConfigError extends Error {
  constructor(readonly code: string) {
    super(`Stripe is not configured: ${code}`);
    this.name = "StripeConfigError";
  }
}

export function getStripePremiumProducts(): readonly string[] {
  return (process.env.STRIPE_PREMIUM_PRODUCT_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined;
}

export function getStripeSecretKey(): string | undefined {
  return process.env.STRIPE_SECRET_KEY?.trim() || undefined;
}

/**
 * True when this deployment is talking to live Stripe.
 *
 * Derived from the key itself rather than a separate flag, so the two cannot
 * disagree — and a test-mode key can never be tricked into honouring a
 * live-mode event.
 */
export function isStripeLiveMode(): boolean {
  const key = getStripeSecretKey();
  return Boolean(key && key.startsWith("sk_live_"));
}

export function requireStripeConfig(): StripeConfig {
  const secretKey = getStripeSecretKey();
  const webhookSecret = getStripeWebhookSecret();

  if (!secretKey) {
    throw new StripeConfigError("missing_secret_key");
  }

  if (!webhookSecret) {
    throw new StripeConfigError("missing_webhook_secret");
  }

  return {
    secretKey,
    webhookSecret,
    premiumProducts: getStripePremiumProducts(),
    liveMode: isStripeLiveMode(),
  };
}
