import { beforeEach, describe, expect, it, vi } from "vitest";

const clients = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createAuthenticatedClient: vi.fn(),
  createPublicClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: clients.createAdminClient,
}));

vi.mock("@/lib/supabase/public", () => ({
  createPublicClient: clients.createPublicClient,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: clients.createAuthenticatedClient,
}));

import { resolvePublicBookingUrl } from "@/lib/public-booking-resolver";

function queryReturning(
  terminal: "maybeSingle" | "returns",
  result: { data: unknown; error: null },
) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};

  for (const method of ["select", "eq", "gte", "lte", "gt", "in", "order"]) {
    query[method] = vi.fn(() => query);
  }

  query[terminal] = vi.fn(() => Promise.resolve(result));
  return query;
}

describe("public booking resolver session isolation", () => {
  beforeEach(() => {
    clients.createAdminClient.mockReset();
    clients.createAuthenticatedClient.mockReset();
    clients.createPublicClient.mockReset();

    const provider = {
      id: "provider-demo",
      full_name: "Dr. Maya Rivera",
      business_name: "Rivera Family Medicine",
      slug: "dr-maya-rivera",
      vertical: "healthcare",
      language: "en",
      timezone: "America/New_York",
      booking_window_days: 60,
      availability: {},
      phone_number_1: null,
      phone_number_2: null,
      address_1: null,
      address_2: null,
      header_image_url: null,
      hero_text: null,
      gallery_image_urls: null,
      logo_image_url: null,
    };
    const service = {
      id: "service-demo",
      provider_id: provider.id,
      name: "New patient consultation",
      slug: "new-patient-consultation",
      booking_type: "appointment",
      duration_minutes: 30,
      description: "A first visit.",
      medical_specialty: "Family medicine",
      capacity: "1 patient",
      cost: "$95",
      notes: "",
      sort_order: 10,
      occurrence_mode: "periodic",
      occurrence_date: null,
      weekdays: [],
      start_time: null,
      end_time: null,
      max_spots: null,
      location_prices: null,
      linked_address_1: false,
      linked_address_2: false,
      linked_phone_1: false,
      linked_phone_2: false,
      custom_address: null,
      custom_phone: null,
    };

    clients.createPublicClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "public_providers") {
          return queryReturning("maybeSingle", { data: provider, error: null });
        }

        if (table === "public_services") {
          return queryReturning("returns", { data: [service], error: null });
        }

        throw new Error(`Unexpected public table: ${table}`);
      }),
    });

    clients.createAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "bookings" || table === "booking_holds") {
          return queryReturning("returns", { data: [], error: null });
        }

        throw new Error(`Unexpected admin table: ${table}`);
      }),
    });
  });

  it("resolves published profiles without consulting the authenticated request client", async () => {
    const result = await resolvePublicBookingUrl({
      verticalSegment: "doctors",
      providerSlug: "dr-maya-rivera",
    });

    expect(result?.status).toBe("resolved");
    expect(clients.createPublicClient).toHaveBeenCalledOnce();
    expect(clients.createAuthenticatedClient).not.toHaveBeenCalled();
  });
});
