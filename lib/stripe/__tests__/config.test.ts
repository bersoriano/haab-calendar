import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getStripePremiumProducts,
  getStripeSecretKey,
  getStripeWebhookSecret,
  isStripeLiveMode,
  requireStripeConfig,
  StripeConfigError,
} from "@/lib/stripe/config";

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_PREMIUM_PRODUCT_IDS;
});

describe("stripe configuration", () => {
  it("reads nothing at import time, so a build without credentials succeeds", () => {
    expect(getStripeSecretKey()).toBeUndefined();
    expect(getStripeWebhookSecret()).toBeUndefined();
    expect(getStripePremiumProducts()).toEqual([]);
  });

  it("parses a comma-separated premium product list", () => {
    process.env.STRIPE_PREMIUM_PRODUCT_IDS = " prod_a , prod_b ,, prod_c ";

    expect(getStripePremiumProducts()).toEqual(["prod_a", "prod_b", "prod_c"]);
  });

  it("treats blank configuration as unset rather than as an empty secret", () => {
    process.env.STRIPE_WEBHOOK_SECRET = "   ";

    expect(getStripeWebhookSecret()).toBeUndefined();
  });

  it("derives live mode from the key itself", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    expect(isStripeLiveMode()).toBe(true);

    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    expect(isStripeLiveMode()).toBe(false);
  });

  it("is not live when no key is set at all", () => {
    expect(isStripeLiveMode()).toBe(false);
  });

  it("refuses to assemble a config without a secret key", () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_only_not_real";

    expect(() => requireStripeConfig()).toThrow(StripeConfigError);
    try {
      requireStripeConfig();
    } catch (error) {
      expect((error as StripeConfigError).code).toBe("missing_secret_key");
    }
  });

  it("refuses to assemble a config without a webhook secret", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";

    try {
      requireStripeConfig();
      throw new Error("Expected a configuration error.");
    } catch (error) {
      expect((error as StripeConfigError).code).toBe("missing_webhook_secret");
    }
  });

  it("assembles a complete config", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_only_not_real";
    process.env.STRIPE_PREMIUM_PRODUCT_IDS = "prod_premium";

    expect(requireStripeConfig()).toEqual({
      secretKey: "sk_test_abc",
      webhookSecret: "whsec_test_only_not_real",
      premiumProducts: ["prod_premium"],
      liveMode: false,
    });
  });

  it("never puts the key in the error it throws", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_super_secret_value";

    try {
      requireStripeConfig();
    } catch (error) {
      expect((error as Error).message).not.toContain("super_secret_value");
    }
  });
});
