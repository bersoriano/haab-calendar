import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const assertGoogleAvailabilityForBooking = vi.fn();
vi.mock("@/lib/google/availability-guard", () => ({
  assertGoogleAvailabilityForBooking: (...args: unknown[]) =>
    assertGoogleAvailabilityForBooking(...args),
}));

import {
  createPublicBookingHold,
  PublicBookingWriteError,
  rescheduleProviderBooking,
} from "@/lib/supabase/bookings";
import type { WeeklyAvailability } from "@/lib/types";

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const SERVICE = "00000000-0000-4000-8000-000000000002";
const BOOKING = "00000000-0000-4000-8000-000000000003";

/** Open every weekday, so the slot arithmetic is never what refuses. */
const OPEN: WeeklyAvailability = Object.fromEntries(
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
  availability: OPEN,
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

const service = {
  id: SERVICE,
  provider_id: PROVIDER,
  name: "Consultation",
  slug: "consultation",
  booking_type: "appointment",
  duration_minutes: 30,
  description: null,
  medical_specialty: null,
  capacity: null,
  cost: null,
  notes: null,
  sort_order: 0,
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

const booking = {
  id: BOOKING,
  provider_id: PROVIDER,
  service_id: SERVICE,
  service_name: "Consultation",
  booking_type: "appointment",
  duration_minutes_snapshot: 30,
  cost_snapshot: null,
  capacity_snapshot: null,
  client_name: "Cliente",
  client_email: "cliente@example.invalid",
  client_phone: "555",
  date: new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10),
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
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

/** Records whether anything was ever written, which is the real assertion. */
function makeClient() {
  const writes: Array<{ table: string; row: unknown }> = [];

  const client = {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        neq: () => query,
        gte: () => query,
        lt: () => query,
        gt: () => query,
        is: () => query,
        not: () => query,
        match: () => query,
        lte: () => query,
        in: () => query,
        or: () => query,
        order: () => query,
        limit: () => query,
        delete: () => query,
        maybeSingle: async () => ({
          data:
            table === "providers"
              ? provider
              : table === "services"
                ? service
                : table === "user_publication_settings"
                  ? { publishing_enabled: true }
                  : table === "bookings"
                    ? booking
                    : null,
          error: null,
        }),
        single: async () => ({ data: booking, error: null }),
        insert: (row: unknown) => {
          writes.push({ table, row });
          return query;
        },
        update: (row: unknown) => {
          writes.push({ table, row });
          return query;
        },
        returns: async () => ({ data: [], error: null }),
        then: undefined,
      };

      return query;
    },
  } as unknown as SupabaseClient;

  return { client, writes };
}

// Inside the provider's booking window, so the window rule is never what
// refuses; every weekday is open above for the same reason.
const DATE = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);

beforeEach(() => {
  vi.clearAllMocks();
  assertGoogleAvailabilityForBooking.mockResolvedValue({ allowed: true, reason: "free" });
});

describe("Google busy blocking at the booking entry points", () => {
  it("checks the provider's calendar before taking a hold", async () => {
    const { client } = makeClient();

    await createPublicBookingHold(client, {
      vertical: "healthcare",
      providerSlug: "clinic",
      serviceId: SERVICE,
      dateKey: DATE,
      time: "09:00",
    });

    expect(assertGoogleAvailabilityForBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: PROVIDER,
        dateKey: DATE,
        startTime: "09:00",
        endTime: "09:30",
        providerTimeZone: "America/Mexico_City",
      }),
    );
  });

  it("refuses the hold, and writes nothing, when the provider is busy", async () => {
    assertGoogleAvailabilityForBooking.mockResolvedValue({
      allowed: false,
      reason: "busy",
      retryable: false,
    });
    const { client, writes } = makeClient();

    await expect(
      createPublicBookingHold(client, {
        vertical: "healthcare",
        providerSlug: "clinic",
        serviceId: SERVICE,
        dateKey: DATE,
        time: "09:00",
      }),
    ).rejects.toMatchObject({ status: 409 });

    // The guard has to run before the write, not alongside it.
    expect(writes).toHaveLength(0);
  });

  it("fails closed with a retryable status when Google cannot be reached", async () => {
    // Unverifiable is not free. A provider who turned this on asked for their
    // outside commitments to be respected even when Google is down.
    assertGoogleAvailabilityForBooking.mockResolvedValue({
      allowed: false,
      reason: "unverifiable",
      retryable: true,
    });
    const { client, writes } = makeClient();

    await expect(
      createPublicBookingHold(client, {
        vertical: "healthcare",
        providerSlug: "clinic",
        serviceId: SERVICE,
        dateKey: DATE,
        time: "09:00",
      }),
    ).rejects.toMatchObject({ status: 503 });
    expect(writes).toHaveLength(0);
  });

  it("checks the calendar before a provider reschedule too", async () => {
    const { client } = makeClient();

    await rescheduleProviderBooking(client, { bookingId: BOOKING, dateKey: DATE, time: "10:00" });

    expect(assertGoogleAvailabilityForBooking).toHaveBeenCalledWith(
      expect.objectContaining({ dateKey: DATE, startTime: "10:00", endTime: "10:30" }),
    );
  });

  it("refuses a reschedule onto a busy time without updating the booking", async () => {
    assertGoogleAvailabilityForBooking.mockResolvedValue({
      allowed: false,
      reason: "busy",
      retryable: false,
    });
    const { client, writes } = makeClient();

    await expect(
      rescheduleProviderBooking(client, { bookingId: BOOKING, dateKey: DATE, time: "10:00" }),
    ).rejects.toBeInstanceOf(PublicBookingWriteError);
    expect(writes).toHaveLength(0);
  });

  it("says to try again rather than blaming the client", async () => {
    assertGoogleAvailabilityForBooking.mockResolvedValue({
      allowed: false,
      reason: "unverifiable",
      retryable: true,
    });
    const { client } = makeClient();

    await expect(
      createPublicBookingHold(client, {
        vertical: "healthcare",
        providerSlug: "clinic",
        serviceId: SERVICE,
        dateKey: DATE,
        time: "09:00",
      }),
    ).rejects.toMatchObject({
      userMessage: "We could not confirm that time just now. Try again in a moment.",
    });
  });
});
