import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getProviderDashboardContext,
  getProviderDashboardStore,
} from "@/lib/supabase/bookings";

const OWNER = "00000000-0000-4000-8000-0000000000b1";
const PROVIDER = "00000000-0000-4000-8000-000000000001";

const providerRow = {
  id: PROVIDER,
  owner_user_id: OWNER,
  full_name: "Mariana Torres",
  business_name: "ACIS Sports",
  email: "owner@example.com",
  phone_number_1: "",
  phone_number_2: "",
  address_1: "",
  address_2: "",
  timezone: "America/Mexico_City",
  language: "es",
  dashboard_language: "es",
  public_theme: "default",
  availability: {},
  setup_complete: true,
  vertical: "events",
  slug: "acis-sports",
  custom_slug: null,
  plan_tier: "free",
  logo_image_url: null,
  header_image_url: null,
  hero_text: null,
  gallery_image_urls: [],
};

type Call = { table: string; filters: Array<[string, unknown]> };

function makeClient(options?: {
  provider?: Record<string, unknown> | null;
  providerError?: { message: string };
}) {
  const calls: Call[] = [];

  const client = {
    from: vi.fn((table: string) => {
      const filters: Array<[string, unknown]> = [];
      calls.push({ table, filters });

      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          filters.push([column, value]);
          return query;
        },
        order: () => query,
        maybeSingle: async () => ({
          data: options?.provider === undefined ? providerRow : options.provider,
          error: options?.providerError ?? null,
        }),
        returns: async () => ({ data: [], error: null }),
      };

      return query;
    }),
  };

  return { client: client as unknown as SupabaseClient, calls };
}

describe("getProviderDashboardContext", () => {
  it("returns the provider id alongside the store", async () => {
    const { client } = makeClient();

    const context = await getProviderDashboardContext(client, OWNER);

    expect(context?.providerId).toBe(PROVIDER);
    expect(context?.store.provider.businessName).toBe("ACIS Sports");
    expect(context?.store.setupComplete).toBe(true);
    expect(context?.store.vertical).toBe("events");
  });

  it("looks the provider up by exact owner", async () => {
    const { client, calls } = makeClient();

    await getProviderDashboardContext(client, OWNER);

    const providerCall = calls.find((call) => call.table === "providers");
    expect(providerCall?.filters).toEqual([["owner_user_id", OWNER]]);
  });

  it("reads the provider exactly once", async () => {
    const { client, calls } = makeClient();

    await getProviderDashboardContext(client, OWNER);

    expect(calls.filter((call) => call.table === "providers")).toHaveLength(1);
    expect(calls.filter((call) => call.table === "services")).toHaveLength(1);
    expect(calls.filter((call) => call.table === "bookings")).toHaveLength(1);
  });

  it("returns null when the owner has no provider", async () => {
    const { client, calls } = makeClient({ provider: null });

    await expect(getProviderDashboardContext(client, OWNER)).resolves.toBeNull();
    // No point reading services or bookings for a provider that is not there.
    expect(calls.filter((call) => call.table !== "providers")).toHaveLength(0);
  });

  it("throws when the provider lookup fails", async () => {
    const { client } = makeClient({
      provider: null,
      providerError: { message: "permission denied" },
    });

    await expect(getProviderDashboardContext(client, OWNER)).rejects.toMatchObject({
      message: "permission denied",
    });
  });
});

describe("getProviderDashboardStore", () => {
  it("still answers with the store alone", async () => {
    const { client } = makeClient();

    const store = await getProviderDashboardStore(client, OWNER);

    expect(store?.provider.businessName).toBe("ACIS Sports");
    expect(store).not.toHaveProperty("providerId");
  });

  it("still answers null for an owner with no provider", async () => {
    const { client } = makeClient({ provider: null });

    await expect(getProviderDashboardStore(client, OWNER)).resolves.toBeNull();
  });

  it("does not read the provider twice on the way through", async () => {
    const { client, calls } = makeClient();

    await getProviderDashboardStore(client, OWNER);

    expect(calls.filter((call) => call.table === "providers")).toHaveLength(1);
  });
});
