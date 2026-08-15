import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// vi.mock is hoisted above the file, so the spy has to be created inside the
// factory and reached through vi.mocked() afterwards.
vi.mock("@/lib/supabase/publication", () => {
  class SuperAdminAccessError extends Error {
    constructor() {
      super("Not found.");
      this.name = "SuperAdminAccessError";
    }
  }

  return { requireSuperAdmin: vi.fn(), SuperAdminAccessError };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("Tests must inject a client rather than reach for the admin one.");
  },
}));

import {
  clearProviderFeatureOverride,
  FeatureOverrideInputError,
  setProviderFeatureOverride,
} from "@/lib/entitlements/server";
import { requireSuperAdmin as requireSuperAdminImport, SuperAdminAccessError } from "@/lib/supabase/publication";

const requireSuperAdmin = vi.mocked(requireSuperAdminImport);

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const ACTOR = "00000000-0000-4000-8000-0000000000aa";

type OverrideRow = { feature_key: string; enabled: boolean; expires_at: string | null };

function makeAdmin(options?: {
  provider?: { id: string; plan_tier: string | null } | null;
  overrides?: OverrideRow[];
  rpcError?: { message: string };
}) {
  const provider =
    options?.provider === undefined ? { id: PROVIDER, plan_tier: "free" } : options.provider;
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  let overrides = options?.overrides ?? [];

  const client = {
    from: vi.fn((table: string) => {
      if (table === "providers") {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          maybeSingle: vi.fn(async () => ({ data: provider, error: null })),
        };
        return query;
      }

      if (table === "provider_feature_overrides") {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          returns: vi.fn(async () => ({ data: overrides, error: null })),
        };
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });

      if (options?.rpcError) {
        return { data: null, error: options.rpcError };
      }

      // Model the RPC's effect so the returned snapshot reflects the write.
      if (name === "set_provider_feature_override") {
        overrides = [
          ...overrides.filter((row) => row.feature_key !== args.p_feature_key),
          {
            feature_key: String(args.p_feature_key),
            enabled: Boolean(args.p_enabled),
            expires_at: (args.p_expires_at as string | null) ?? null,
          },
        ];
      }

      if (name === "clear_provider_feature_override") {
        overrides = overrides.filter((row) => row.feature_key !== args.p_feature_key);
      }

      return { data: null, error: null };
    }),
  };

  return { client: client as unknown as SupabaseClient, rpcCalls };
}

beforeEach(() => {
  requireSuperAdmin.mockReset();
  requireSuperAdmin.mockResolvedValue({
    id: ACTOR,
    email: "admin@example.com",
  } as Awaited<ReturnType<typeof requireSuperAdminImport>>);
});

describe("setProviderFeatureOverride", () => {
  it("requires a super admin before touching anything", async () => {
    requireSuperAdmin.mockRejectedValueOnce(new SuperAdminAccessError());
    const admin = makeAdmin();

    await expect(
      setProviderFeatureOverride({
        providerId: PROVIDER,
        featureKey: "custom_slug",
        enabled: true,
        reason: "Beta access",
        client: admin.client,
      }),
    ).rejects.toBeInstanceOf(SuperAdminAccessError);

    expect(admin.rpcCalls).toHaveLength(0);
  });

  it("rejects a feature key that is not in the catalog", async () => {
    const admin = makeAdmin();

    await expect(
      setProviderFeatureOverride({
        providerId: PROVIDER,
        featureKey: "teleportation",
        enabled: true,
        reason: "Beta access",
        client: admin.client,
      }),
    ).rejects.toBeInstanceOf(FeatureOverrideInputError);
    expect(admin.rpcCalls).toHaveLength(0);
  });

  it.each([["" as const], ["   " as const]])("rejects a blank reason (%j)", async (reason) => {
    const admin = makeAdmin();

    await expect(
      setProviderFeatureOverride({
        providerId: PROVIDER,
        featureKey: "custom_slug",
        enabled: true,
        reason,
        client: admin.client,
      }),
    ).rejects.toBeInstanceOf(FeatureOverrideInputError);
    expect(admin.rpcCalls).toHaveLength(0);
  });

  it("rejects a reason beyond the stored length", async () => {
    const admin = makeAdmin();

    await expect(
      setProviderFeatureOverride({
        providerId: PROVIDER,
        featureKey: "custom_slug",
        enabled: true,
        reason: "x".repeat(501),
        client: admin.client,
      }),
    ).rejects.toBeInstanceOf(FeatureOverrideInputError);
  });

  it("rejects an expiry that is not a timestamp", async () => {
    const admin = makeAdmin();

    await expect(
      setProviderFeatureOverride({
        providerId: PROVIDER,
        featureKey: "custom_slug",
        enabled: true,
        expiresAt: "next tuesday",
        reason: "Beta access",
        client: admin.client,
      }),
    ).rejects.toBeInstanceOf(FeatureOverrideInputError);
  });

  it("rejects an expiry in the past", async () => {
    const admin = makeAdmin();

    await expect(
      setProviderFeatureOverride({
        providerId: PROVIDER,
        featureKey: "custom_slug",
        enabled: true,
        expiresAt: "2026-08-14T12:00:00.000Z",
        reason: "Beta access",
        now: new Date("2026-08-15T12:00:00.000Z"),
        client: admin.client,
      }),
    ).rejects.toBeInstanceOf(FeatureOverrideInputError);
  });

  it("rejects a provider that does not exist", async () => {
    const admin = makeAdmin({ provider: null });

    await expect(
      setProviderFeatureOverride({
        providerId: PROVIDER,
        featureKey: "custom_slug",
        enabled: true,
        reason: "Beta access",
        client: admin.client,
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(admin.rpcCalls).toHaveLength(0);
  });

  it("records the authenticated super admin as the actor", async () => {
    const admin = makeAdmin();

    await setProviderFeatureOverride({
      providerId: PROVIDER,
      featureKey: "google_calendar_sync",
      enabled: true,
      reason: "  Beta access  ",
      client: admin.client,
    });

    expect(admin.rpcCalls[0].name).toBe("set_provider_feature_override");
    expect(admin.rpcCalls[0].args).toMatchObject({
      p_provider_id: PROVIDER,
      p_feature_key: "google_calendar_sync",
      p_enabled: true,
      p_reason: "Beta access",
      p_actor_user_id: ACTOR,
    });
  });

  it("returns the refreshed snapshot, with the grant applied", async () => {
    const admin = makeAdmin();

    const snapshot = await setProviderFeatureOverride({
      providerId: PROVIDER,
      featureKey: "google_calendar_sync",
      enabled: true,
      reason: "Beta access",
      client: admin.client,
    });

    expect(snapshot.planTier).toBe("free");
    expect(snapshot.features.google_calendar_sync).toEqual({
      enabled: true,
      source: "override",
    });
  });

  it("surfaces a persistence failure without leaking database detail", async () => {
    const admin = makeAdmin({ rpcError: { message: 'relation "x" does not exist' } });

    await expect(
      setProviderFeatureOverride({
        providerId: PROVIDER,
        featureKey: "custom_slug",
        enabled: true,
        reason: "Beta access",
        client: admin.client,
      }),
    ).rejects.toMatchObject({
      status: 500,
      userMessage: "Could not save the feature override.",
    });
  });
});

describe("clearProviderFeatureOverride", () => {
  it("returns a plan-derived snapshot once the override is gone", async () => {
    const admin = makeAdmin({
      provider: { id: PROVIDER, plan_tier: "premium" },
      overrides: [{ feature_key: "custom_slug", enabled: false, expires_at: null }],
    });

    const snapshot = await clearProviderFeatureOverride({
      providerId: PROVIDER,
      featureKey: "custom_slug",
      reason: "Back to plan defaults",
      client: admin.client,
    });

    expect(admin.rpcCalls[0].name).toBe("clear_provider_feature_override");
    expect(snapshot.features.custom_slug).toEqual({ enabled: true, source: "plan" });
  });

  it("requires a super admin", async () => {
    requireSuperAdmin.mockRejectedValueOnce(new SuperAdminAccessError());
    const admin = makeAdmin();

    await expect(
      clearProviderFeatureOverride({
        providerId: PROVIDER,
        featureKey: "custom_slug",
        reason: "Back to plan defaults",
        client: admin.client,
      }),
    ).rejects.toBeInstanceOf(SuperAdminAccessError);
    expect(admin.rpcCalls).toHaveLength(0);
  });

  it("requires a reason", async () => {
    const admin = makeAdmin();

    await expect(
      clearProviderFeatureOverride({
        providerId: PROVIDER,
        featureKey: "custom_slug",
        reason: "",
        client: admin.client,
      }),
    ).rejects.toBeInstanceOf(FeatureOverrideInputError);
    expect(admin.rpcCalls).toHaveLength(0);
  });
});
