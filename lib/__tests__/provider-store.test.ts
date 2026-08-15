import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { createDefaultAvailability, createEmptyStore } from "@/lib/store";
import type { ModuleStore } from "@/lib/types";

vi.mock("server-only", () => ({}));

import { persistProviderStore } from "@/lib/supabase/provider-store";

type ProviderRow = Record<string, unknown> & {
  id: string;
  owner_user_id: string;
  slug: string;
};

type ServiceRow = Record<string, unknown> & {
  id: string;
  provider_id: string;
  slug: string;
};

function makeStore(overrides?: Partial<ModuleStore>): ModuleStore {
  return {
    ...createEmptyStore(),
    provider: {
      fullName: " Dr. Maya Rivera ",
      businessName: " Rivera Family Medicine ",
      email: "maya@example.com",
      phoneNumber1: " +1 212 555 0142 ",
      phoneNumber2: "",
      address1: " 245 West 29th Street ",
      address2: "",
      publicSlug: "provider-selected-slug",
      logoImageUrl: " https://example.com/logo.png ",
      headerImageUrl: " https://example.com/header.png ",
      heroText: " Thoughtful care ",
      galleryImageUrls: [" https://example.com/gallery.png "],
      language: "en",
      dashboardLanguage: "es",
      timezone: "America/New_York",
    },
    services: [
      {
        id: "local-service",
        name: "Consultation",
        slug: "consultation",
        bookingType: "appointment",
        durationMinutes: 30,
        description: "Initial consultation",
      },
    ],
    availability: createDefaultAvailability(),
    setupComplete: true,
    vertical: "healthcare",
    ...overrides,
  };
}

function makeProviderRow(overrides?: Partial<ProviderRow>): ProviderRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    owner_user_id: "00000000-0000-4000-8000-000000000002",
    full_name: "Existing Provider",
    business_name: "Existing Business",
    email: "existing@example.com",
    slug: "stable-database-slug",
    vertical: "healthcare",
    language: "en",
    dashboard_language: null,
    timezone: "America/New_York",
    booking_window_days: 60,
    availability: createDefaultAvailability(),
    setup_complete: true,
    phone_number_1: "",
    phone_number_2: "",
    address_1: "",
    address_2: "",
    logo_image_url: null,
    header_image_url: null,
    hero_text: null,
    gallery_image_urls: [],
    ...overrides,
  };
}

function makeSupabase(options?: { provider?: ProviderRow }) {
  let provider = options?.provider;
  const services: ServiceRow[] = [];
  const providerInserts: Array<Record<string, unknown>> = [];
  const providerUpdates: Array<Record<string, unknown>> = [];

  function providerSelect(columns: string) {
    const query = {
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      returns: vi.fn(async () => ({
        data: provider && columns === "id" ? [{ id: provider.id }] : [],
        error: null,
      })),
      maybeSingle: vi.fn(async () => ({ data: provider ?? null, error: null })),
    };
    return query;
  }

  function serviceSelect() {
    const query = {
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      returns: vi.fn(async () => ({ data: services, error: null })),
    };
    return query;
  }

  function mutationResult(id: string) {
    const query = {
      eq: vi.fn(() => query),
      select: vi.fn(() => query),
      single: vi.fn(async () => ({ data: { id }, error: null })),
    };
    return query;
  }

  const client = {
    from: vi.fn((table: string) => {
      if (table === "providers") {
        return {
          select: vi.fn((columns: string) => providerSelect(columns)),
          insert: vi.fn((payload: Record<string, unknown>) => {
            providerInserts.push(payload);
            provider = makeProviderRow({
              ...payload,
              slug: "rivera-family-medicine",
            });
            return mutationResult(provider.id);
          }),
          update: vi.fn((payload: Record<string, unknown>) => {
            providerUpdates.push(payload);
            if (!provider) throw new Error("Provider update requires existing row.");
            provider = { ...provider, ...payload };
            return mutationResult(provider.id);
          }),
        };
      }

      if (table === "services") {
        return {
          select: vi.fn(() => serviceSelect()),
          insert: vi.fn((payload: Record<string, unknown>) => {
            services.push({
              ...payload,
              id: "00000000-0000-4000-8000-000000000003",
              provider_id: String(payload.provider_id),
              slug: String(payload.slug),
            });
            return mutationResult("00000000-0000-4000-8000-000000000003");
          }),
        };
      }

      if (table === "bookings") {
        return { select: vi.fn(() => serviceSelect()) };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return {
    client: client as unknown as SupabaseClient,
    providerInserts,
    providerUpdates,
  };
}

describe("provider persistence authorization boundary", () => {
  it("inserts editable fields without protected premium fields and reloads generated slug", async () => {
    const supabase = makeSupabase();

    const persisted = await persistProviderStore({
      supabase: supabase.client,
      ownerUserId: "00000000-0000-4000-8000-000000000002",
      store: makeStore(),
    });

    expect(supabase.providerInserts).toHaveLength(1);
    expect(supabase.providerInserts[0]).toEqual(
      expect.objectContaining({
        owner_user_id: "00000000-0000-4000-8000-000000000002",
        full_name: "Dr. Maya Rivera",
        business_name: "Rivera Family Medicine",
        phone_number_1: "+1 212 555 0142",
        address_1: "245 West 29th Street",
        logo_image_url: "https://example.com/logo.png",
        hero_text: "Thoughtful care",
        gallery_image_urls: ["https://example.com/gallery.png"],
      }),
    );
    expect(supabase.providerInserts[0]).not.toHaveProperty("slug");
    expect(supabase.providerInserts[0]).not.toHaveProperty("custom_slug");
    expect(supabase.providerInserts[0]).not.toHaveProperty("plan_tier");
    expect(persisted.provider.publicSlug).toBe("rivera-family-medicine");
    expect(persisted.provider.fullName).toBe("Dr. Maya Rivera");
  });

  it("updates editable fields without ownership or premium fields and keeps stored slug", async () => {
    const supabase = makeSupabase({ provider: makeProviderRow() });

    const persisted = await persistProviderStore({
      supabase: supabase.client,
      ownerUserId: "00000000-0000-4000-8000-000000000002",
      store: makeStore(),
    });

    expect(supabase.providerUpdates).toHaveLength(1);
    expect(supabase.providerUpdates[0]).toEqual(
      expect.objectContaining({
        full_name: "Dr. Maya Rivera",
        business_name: "Rivera Family Medicine",
        phone_number_1: "+1 212 555 0142",
      }),
    );
    expect(supabase.providerUpdates[0]).not.toHaveProperty("owner_user_id");
    expect(supabase.providerUpdates[0]).not.toHaveProperty("slug");
    expect(supabase.providerUpdates[0]).not.toHaveProperty("custom_slug");
    expect(supabase.providerUpdates[0]).not.toHaveProperty("plan_tier");
    expect(persisted.provider.publicSlug).toBe("stable-database-slug");
    expect(persisted.provider.businessName).toBe("Rivera Family Medicine");
  });
});
