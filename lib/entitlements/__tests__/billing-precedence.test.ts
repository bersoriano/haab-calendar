import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/publication", () => ({
  requireSuperAdmin: vi.fn(),
  SuperAdminAccessError: class extends Error {},
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("Tests must inject a client.");
  },
}));

import { getProviderEntitlements } from "@/lib/entitlements/server";

const PROVIDER = "00000000-0000-4000-8000-000000000001";

type Billing = { plan_tier: string; status: string } | null;
type Override = { feature_key: string; enabled: boolean; expires_at: string | null };

function makeClient(options: {
  legacyPlanTier?: string | null;
  billing?: Billing;
  billingError?: { message: string };
  overrides?: Override[];
}) {
  const client = {
    from: (table: string) => {
      if (table === "providers") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({
            data: { id: PROVIDER, plan_tier: options.legacyPlanTier ?? "free" },
            error: null,
          }),
        };
        return query;
      }

      if (table === "provider_feature_overrides") {
        const query = {
          select: () => query,
          eq: () => query,
          returns: async () => ({ data: options.overrides ?? [], error: null }),
        };
        return query;
      }

      if (table === "provider_billing_subscriptions") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({
            data: options.billing ?? null,
            error: options.billingError ?? null,
          }),
        };
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return client as unknown as SupabaseClient;
}

describe("entitlement precedence", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("uses the billing projection when one exists", async () => {
    const snapshot = await getProviderEntitlements(
      PROVIDER,
      makeClient({
        legacyPlanTier: "free",
        billing: { plan_tier: "premium", status: "active" },
      }),
    );

    expect(snapshot.planTier).toBe("premium");
    expect(snapshot.features.custom_slug).toEqual({ enabled: true, source: "plan" });
  });

  it("lets an inactive billing row withhold premium a stale legacy column still claims", async () => {
    // The legacy column says premium, the subscription lapsed. The projection
    // is what people are actually paying for, so it wins.
    const snapshot = await getProviderEntitlements(
      PROVIDER,
      makeClient({
        legacyPlanTier: "premium",
        billing: { plan_tier: "free", status: "canceled" },
      }),
    );

    expect(snapshot.planTier).toBe("free");
    expect(snapshot.features.custom_slug.enabled).toBe(false);
  });

  it("falls back to the legacy column for an account that predates billing", async () => {
    const snapshot = await getProviderEntitlements(
      PROVIDER,
      makeClient({ legacyPlanTier: "premium", billing: null }),
    );

    expect(snapshot.planTier).toBe("premium");
  });

  it("lets a manual revoke beat a paid subscription", async () => {
    const snapshot = await getProviderEntitlements(
      PROVIDER,
      makeClient({
        billing: { plan_tier: "premium", status: "active" },
        overrides: [{ feature_key: "custom_slug", enabled: false, expires_at: null }],
      }),
    );

    expect(snapshot.planTier).toBe("premium");
    expect(snapshot.features.custom_slug).toEqual({ enabled: false, source: "override" });
    // Only the overridden feature moves; the rest still follow the plan.
    expect(snapshot.features.google_calendar_sync).toEqual({
      enabled: true,
      source: "plan",
    });
  });

  it("lets a manual grant beat the absence of a subscription", async () => {
    const snapshot = await getProviderEntitlements(
      PROVIDER,
      makeClient({
        legacyPlanTier: "free",
        billing: null,
        overrides: [
          { feature_key: "google_calendar_sync", enabled: true, expires_at: null },
        ],
      }),
    );

    expect(snapshot.planTier).toBe("free");
    expect(snapshot.features.google_calendar_sync).toEqual({
      enabled: true,
      source: "override",
    });
  });

  it("fails closed when the billing row cannot be read", async () => {
    // Not "assume the legacy column": an unreadable billing row is an unknown
    // answer about paid access, and a stale premium column would grant it.
    await expect(
      getProviderEntitlements(
        PROVIDER,
        makeClient({
          legacyPlanTier: "premium",
          billingError: { message: "permission denied" },
        }),
      ),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("treats an unknown projected tier as free", async () => {
    const snapshot = await getProviderEntitlements(
      PROVIDER,
      makeClient({ billing: { plan_tier: "enterprise", status: "active" } }),
    );

    expect(snapshot.planTier).toBe("free");
  });
});
