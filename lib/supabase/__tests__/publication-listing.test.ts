import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  admin: { value: null as unknown },
  authUser: {
    value: { id: "admin-user", email: "bsorianodev@gmail.com" } as unknown,
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mocks.admin.value,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.authUser.value }, error: null }) },
  }),
}));

vi.mock("@/lib/super-admin-policy", () => ({
  isSuperAdminEmail: (email?: string) => email === "bsorianodev@gmail.com",
}));

vi.mock("@/lib/demo-pages", () => ({
  isDemoOwnerEmail: () => false,
}));

import { listManagedUsers } from "@/lib/supabase/publication";

const OWNER = "00000000-0000-4000-8000-0000000000b1";
const PROVIDER = "00000000-0000-4000-8000-000000000001";

type TableResult = { data: unknown; error: { message: string } | null };

function makeAdmin(results: Record<string, TableResult>) {
  return {
    auth: {
      admin: {
        listUsers: async () => ({
          data: {
            users: [
              {
                id: OWNER,
                email: "owner@example.com",
                created_at: "2026-07-01T12:00:00.000Z",
              },
            ],
          },
          error: null,
        }),
      },
    },
    from: (table: string) => {
      const result = results[table];

      if (!result) {
        throw new Error(`Unexpected table: ${table}`);
      }

      const query = {
        select: () => query,
        returns: async () => result,
      };

      return query;
    },
  };
}

const SETTINGS: TableResult = { data: [], error: null };
const NO_BILLING: TableResult = { data: [], error: null };

const PROVIDERS: TableResult = {
  data: [
    {
      id: PROVIDER,
      owner_user_id: OWNER,
      business_name: "Clinica Rivera",
      slug: "clinica-rivera",
      vertical: "healthcare",
      setup_complete: true,
      plan_tier: "free",
    },
  ],
  error: null,
};

describe("listManagedUsers", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("resolves entitlements from one bulk override read", async () => {
    mocks.admin.value = makeAdmin({
      user_publication_settings: SETTINGS,
      providers: PROVIDERS,
      provider_billing_subscriptions: NO_BILLING,
      provider_feature_overrides: {
        data: [
          {
            provider_id: PROVIDER,
            feature_key: "custom_slug",
            enabled: true,
            expires_at: null,
          },
        ],
        error: null,
      },
    });

    const [user] = await listManagedUsers();

    expect(user.provider?.id).toBe(PROVIDER);
    expect(user.provider?.planTier).toBe("free");
    expect(user.provider?.entitlements?.features.custom_slug).toEqual({
      enabled: true,
      source: "override",
    });
    expect(user.provider?.entitlements?.features.google_calendar_sync).toEqual({
      enabled: false,
      source: "plan",
    });
  });

  it("keeps the page usable when the override table cannot be read", async () => {
    mocks.admin.value = makeAdmin({
      user_publication_settings: SETTINGS,
      providers: PROVIDERS,
      provider_billing_subscriptions: NO_BILLING,
      provider_feature_overrides: {
        data: null,
        error: { message: "Could not find the table 'public.provider_feature_overrides'" },
      },
    });

    const [user] = await listManagedUsers();

    // The account still moderates, and entitlements report themselves absent
    // rather than claiming the provider has no granted features.
    expect(user.email).toBe("owner@example.com");
    expect(user.workflow?.businessName).toBe("Clinica Rivera");
    expect(user.provider?.id).toBe(PROVIDER);
    expect(user.provider?.entitlements).toBeUndefined();
  });

  it("resolves the tier from billing when a subscription exists", async () => {
    mocks.admin.value = makeAdmin({
      user_publication_settings: SETTINGS,
      providers: PROVIDERS,
      provider_billing_subscriptions: {
        data: [{ provider_id: PROVIDER, plan_tier: "premium", status: "active" }],
        error: null,
      },
      provider_feature_overrides: { data: [], error: null },
    });

    const [user] = await listManagedUsers();

    // The provider row still says free; the subscription is what is paid for.
    expect(user.provider?.planTier).toBe("free");
    expect(user.provider?.entitlements?.planTier).toBe("premium");
  });

  it("reports entitlements as unavailable when the billing read fails", async () => {
    mocks.admin.value = makeAdmin({
      user_publication_settings: SETTINGS,
      providers: PROVIDERS,
      provider_billing_subscriptions: {
        data: null,
        error: { message: "permission denied" },
      },
      provider_feature_overrides: { data: [], error: null },
    });

    const [user] = await listManagedUsers();

    expect(user.provider?.id).toBe(PROVIDER);
    expect(user.provider?.entitlements).toBeUndefined();
  });

  it("still fails loudly when the provider read fails", async () => {
    mocks.admin.value = makeAdmin({
      user_publication_settings: SETTINGS,
      providers: { data: null, error: { message: "permission denied" } },
      provider_billing_subscriptions: NO_BILLING,
      provider_feature_overrides: { data: [], error: null },
    });

    await expect(listManagedUsers()).rejects.toMatchObject({
      message: "permission denied",
    });
  });
});
