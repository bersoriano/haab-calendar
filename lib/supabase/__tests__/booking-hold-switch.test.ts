import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const assertGoogleAvailabilityForBooking = vi.fn();
vi.mock("@/lib/google/availability-guard", () => ({
  assertGoogleAvailabilityForBooking: (...args: unknown[]) =>
    assertGoogleAvailabilityForBooking(...args),
}));

import { switchPublicBookingHold } from "@/lib/supabase/bookings";
import type { WeeklyAvailability } from "@/lib/types";

const DATE = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
const PROVIDER = "00000000-0000-4000-8000-000000000001";
const ORIGINAL_SERVICE = "00000000-0000-4000-8000-000000000002";
const NEXT_SERVICE = "00000000-0000-4000-8000-000000000003";
const HOLD = "00000000-0000-4000-8000-000000000004";

const availability = Object.fromEntries(
  ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map(
    (day) => [day, { enabled: true, startTime: "08:00", endTime: "18:00" }],
  ),
) as WeeklyAvailability;

const provider = {
  id: PROVIDER,
  owner_user_id: "owner-1",
  full_name: "Ana",
  business_name: "Clinic",
  email: "ana@example.invalid",
  slug: "clinic",
  vertical: "healthcare",
  language: "en",
  dashboard_language: "en",
  public_theme: null,
  timezone: "America/Mexico_City",
  booking_window_days: 120,
  availability,
  setup_complete: true,
  phone_number_1: null,
  phone_number_2: null,
  address_1: null,
  address_2: null,
  logo_image_url: null,
  header_image_url: null,
  hero_text: null,
  gallery_image_urls: null,
};

const nextService = {
  id: NEXT_SERVICE,
  provider_id: PROVIDER,
  name: "Follow-up",
  slug: "follow-up",
  booking_type: "appointment",
  duration_minutes: 30,
  description: null,
  medical_specialty: null,
  capacity: null,
  cost: null,
  notes: null,
  sort_order: 1,
  occurrence_mode: null,
  occurrence_date: null,
  weekdays: null,
  start_time: null,
  end_time: null,
  max_spots: null,
  capacity_scope: null,
  max_party_size: null,
  location_prices: null,
  linked_address_1: false,
  linked_address_2: false,
  linked_phone_1: false,
  linked_phone_2: false,
  custom_address: null,
  custom_phone: null,
};

const originalHold = {
  id: HOLD,
  provider_id: PROVIDER,
  service_id: ORIGINAL_SERVICE,
  booking_type: "appointment",
  date: DATE,
  start_time: "09:00",
  end_time: "09:30",
  expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  created_at: new Date().toISOString(),
  extension_count: 1,
  allows_shared_capacity: false,
};

function makeClient(
  conflictingBooking = false,
  expiredHold = false,
  updateError: { code: string } | null = null,
) {
  const updates: Record<string, unknown>[] = [];
  let hold = { ...originalHold };

  const client = {
    from(table: string) {
      let updating = false;
      const query = {
        select: () => query,
        eq: () => query,
        gt: () => query,
        lte: () => query,
        in: () => query,
        delete: () => query,
        update: (values: Record<string, unknown>) => {
          updating = true;
          updates.push(values);
          return query;
        },
        maybeSingle: async () => {
          if (updating && updateError) return { data: null, error: updateError };
          const data = table === "providers"
            ? provider
            : table === "user_publication_settings"
              ? { publishing_enabled: true }
              : table === "services"
                ? nextService
                : table === "booking_holds"
                  ? updating
                    ? (hold = { ...hold, ...updates.at(-1) })
                    : expiredHold ? null : hold
                  : null;
          return { data, error: null };
        },
        returns: async () => ({
          data:
            table === "booking_holds"
              ? [hold]
              : table === "bookings" && conflictingBooking
                ? [{
                    id: "other-booking",
                    provider_id: PROVIDER,
                    service_id: "other-service",
                    service_name: "Other",
                    booking_type: "appointment",
                    duration_minutes_snapshot: 30,
                    cost_snapshot: null,
                    capacity_snapshot: null,
                    client_name: "Other client",
                    client_email: "other@example.invalid",
                    client_phone: "555",
                    date: DATE,
                    start_time: "09:00",
                    end_time: "09:30",
                    status: "confirmed",
                    notes: null,
                    location_snapshot: null,
                    allows_shared_capacity: false,
                    details: {},
                    details_schema_key: "base",
                    details_schema_version: 1,
                    service_snapshot: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }]
                : [],
          error: null,
        }),
      };
      return query;
    },
  } as unknown as SupabaseClient;

  return { client, updates, getHold: () => hold };
}

const input = {
  vertical: "healthcare" as const,
  providerSlug: "clinic",
  holdId: HOLD,
  serviceId: NEXT_SERVICE,
  dateKey: DATE,
  time: "09:00",
};

beforeEach(() => {
  vi.clearAllMocks();
  assertGoogleAvailabilityForBooking.mockResolvedValue({ allowed: true, reason: "free" });
});

describe("switchPublicBookingHold", () => {
  it("moves existing hold to available service without changing hold id", async () => {
    const { client, updates } = makeClient();
    const result = await switchPublicBookingHold(client, input);

    expect(result.hold).toMatchObject({ id: HOLD, serviceId: NEXT_SERVICE, extensionCount: 1 });
    expect(updates).toHaveLength(1);
  });

  it("keeps original hold when new service has no slot", async () => {
    const { client, updates, getHold } = makeClient(true);
    await expect(switchPublicBookingHold(client, input)).rejects.toMatchObject({ status: 409 });
    expect(updates).toHaveLength(0);
    expect(getHold().service_id).toBe(ORIGINAL_SERVICE);
  });

  it("keeps original hold when provider calendar blocks new service", async () => {
    assertGoogleAvailabilityForBooking.mockResolvedValue({
      allowed: false,
      reason: "busy",
      retryable: false,
    });
    const { client, updates, getHold } = makeClient();

    await expect(switchPublicBookingHold(client, input)).rejects.toMatchObject({ status: 409 });
    expect(updates).toHaveLength(0);
    expect(getHold().service_id).toBe(ORIGINAL_SERVICE);
  });

  it("reports expired original hold without writing a new one", async () => {
    const { client, updates } = makeClient(false, true);

    await expect(switchPublicBookingHold(client, input)).rejects.toMatchObject({ status: 410 });
    expect(updates).toHaveLength(0);
  });

  it("keeps original hold when a concurrent hold wins the database constraint", async () => {
    const { client, updates, getHold } = makeClient(false, false, { code: "23P01" });

    await expect(switchPublicBookingHold(client, input)).rejects.toMatchObject({ status: 409 });
    expect(updates).toHaveLength(1);
    expect(getHold().service_id).toBe(ORIGINAL_SERVICE);
  });
});
