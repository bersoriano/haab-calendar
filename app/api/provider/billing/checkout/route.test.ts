import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  ownerRow: vi.fn(),
  billingRow: vi.fn(),
  hasEntitlement: vi.fn(),
  createSession: vi.fn(),
  priceId: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.ownerRow }) }) }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.billingRow }) }) }),
  }),
}));
vi.mock("@/lib/entitlements/server", () => ({ hasEntitlement: mocks.hasEntitlement }));
vi.mock("@/lib/stripe/client", () => ({
  getStripeClient: () => ({ checkout: { sessions: { create: mocks.createSession } } }),
}));
vi.mock("@/lib/stripe/config", () => ({
  getStripePremiumPriceId: mocks.priceId,
  StripeConfigError: class StripeConfigError extends Error {},
}));

import { POST } from "@/app/api/provider/billing/checkout/route";

function request(body: unknown = { returnTab: "analytics" }) {
  return new NextRequest("https://haabcalendar.com/api/provider/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/provider/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "owner-1", email: "owner@example.com" } },
      error: null,
    });
    mocks.ownerRow.mockResolvedValue({ data: { id: "provider-1" }, error: null });
    mocks.billingRow.mockResolvedValue({ data: null, error: null });
    mocks.hasEntitlement.mockResolvedValue(false);
    mocks.priceId.mockReturnValue("price_premium");
    mocks.createSession.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_test" });
  });

  it("starts a subscription checkout tagged with the session's provider", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_test" });
    expect(mocks.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        line_items: [{ price: "price_premium", quantity: 1 }],
        client_reference_id: "provider-1",
        customer_email: "owner@example.com",
        subscription_data: { metadata: { haab_provider_id: "provider-1" } },
        success_url: "https://haabcalendar.com/?tab=analytics&checkout=success",
        cancel_url: "https://haabcalendar.com/?tab=analytics&checkout=cancelled",
      }),
    );
  });

  it("reuses an existing Stripe customer", async () => {
    mocks.billingRow.mockResolvedValue({ data: { stripe_customer_id: "cus_123" }, error: null });
    await POST(request());
    const params = mocks.createSession.mock.calls[0][0];
    expect(params.customer).toBe("cus_123");
    expect(params).not.toHaveProperty("customer_email");
  });

  it("ignores a return tab it does not know", async () => {
    await POST(request({ returnTab: "https://evil.example" }));
    expect(mocks.createSession.mock.calls[0][0].success_url).toBe(
      "https://haabcalendar.com/?tab=analytics&checkout=success",
    );
  });

  it("requires a session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(request())).status).toBe(401);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("says upgrades are unavailable when no price is configured", async () => {
    mocks.priceId.mockReturnValue(undefined);
    expect((await POST(request())).status).toBe(503);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("does not sell Premium twice", async () => {
    mocks.hasEntitlement.mockResolvedValue(true);
    expect((await POST(request())).status).toBe(409);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
});
