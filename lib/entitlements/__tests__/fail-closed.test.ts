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

import {
  EntitlementRequiredError,
  getProviderEntitlements,
  hasEntitlement,
  requireEntitlement,
} from "@/lib/entitlements/server";

const PROVIDER = "00000000-0000-4000-8000-000000000001";

/** Every read fails, which is the situation this file is about. */
function brokenClient(failing: "providers" | "overrides" | "billing") {
  const error = { message: "connection reset" };

  const client = {
    from: (table: string) => {
      if (table === "providers") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({
            data: failing === "providers" ? null : { id: PROVIDER, plan_tier: "premium" },
            error: failing === "providers" ? error : null,
          }),
        };
        return query;
      }

      if (table === "provider_feature_overrides") {
        const query = {
          select: () => query,
          eq: () => query,
          returns: async () => ({
            data: failing === "overrides" ? null : [],
            error: failing === "overrides" ? error : null,
          }),
        };
        return query;
      }

      if (table === "provider_billing_subscriptions") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({
            data: null,
            error: failing === "billing" ? error : null,
          }),
        };
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return client as unknown as SupabaseClient;
}

describe("entitlement resolution failures", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it.each(["providers", "overrides", "billing"] as const)(
    "refuses to answer when the %s read fails",
    async (failing) => {
      // Never "assume premium", and never "assume the legacy column": an
      // unreadable dependency is an unknown answer about paid access.
      await expect(
        getProviderEntitlements(PROVIDER, brokenClient(failing)),
      ).rejects.toMatchObject({ status: 500 });
    },
  );

  it("does not grant a feature when the read failed", async () => {
    await expect(
      hasEntitlement(PROVIDER, "custom_slug", brokenClient("billing")),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("throws rather than allowing a gated action through", async () => {
    // The caller sees an error, which every gate turns into a refusal — the one
    // thing that must never happen is the action proceeding.
    await expect(
      requireEntitlement(PROVIDER, "custom_slug", brokenClient("overrides")),
    ).rejects.not.toBeInstanceOf(EntitlementRequiredError);
  });
});
