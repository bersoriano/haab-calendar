import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  cancelProviderBooking,
  getProviderBookingByManageToken,
  setProviderBookingReviewed,
} from "@/lib/supabase/bookings";

const SEEN_AT = "2026-10-11T12:00:00.000Z";

const row = {
  id: "booking-1",
  provider_id: "provider-1",
  service_id: "service-1",
  service_name: "Strategy session",
  booking_type: "appointment",
  duration_minutes_snapshot: 60,
  cost_snapshot: "$200",
  capacity_snapshot: null,
  client_name: "Ana Rivera",
  client_email: "ana@example.com",
  client_phone: "555-0100",
  date: "2026-10-20",
  start_time: "09:00:00",
  end_time: "10:00:00",
  status: "confirmed",
  notes: null,
  location_snapshot: null,
  allows_shared_capacity: false,
  details: {},
  details_schema_key: null,
  details_schema_version: null,
  service_snapshot: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  referrer_host: null,
  reviewed_at: SEEN_AT as string | null,
  created_at: "2026-10-10T10:00:00.000Z",
  updated_at: "2026-10-10T10:00:00.000Z",
};

/** A bookings table holding one row; updates are applied to it and recorded. */
function makeClient(initial = row, timezone = "UTC") {
  let current = { ...initial };
  const updates: Array<Record<string, unknown>> = [];
  const events: unknown[] = [];
  const bookings = {
    select: vi.fn(() => bookings),
    eq: vi.fn(() => bookings),
    update: vi.fn((patch: Record<string, unknown>) => {
      updates.push(patch);
      current = { ...current, ...patch };
      return bookings;
    }),
    maybeSingle: vi.fn(async () => ({ data: current, error: null })),
    single: vi.fn(async () => ({ data: current, error: null })),
  };
  const providers = {
    select: vi.fn(() => providers),
    eq: vi.fn(() => providers),
    maybeSingle: vi.fn(async () => ({ data: { id: "provider-1", timezone }, error: null })),
  };
  const client = {
    from: vi.fn((table: string) =>
      table === "bookings"
        ? bookings
        : table === "providers"
          ? providers
          : {
            insert: vi.fn(async (event: unknown) => {
              events.push(event);
              return { error: null };
            }),
          },
    ),
  };

  return { client: client as unknown as SupabaseClient, updates, events };
}

describe("setProviderBookingReviewed", () => {
  it("stamps the booking as seen and answers with the provider's view of it", async () => {
    const { client, updates, events } = makeClient({ ...row, reviewed_at: null });

    const { booking } = await setProviderBookingReviewed(client, "booking-1", true);

    expect(updates).toHaveLength(1);
    expect(Object.keys(updates[0])).toEqual(["reviewed_at"]);
    expect(Number.isNaN(Date.parse(String(updates[0].reviewed_at)))).toBe(false);
    expect(booking.reviewedAt).toBe(updates[0].reviewed_at);
    // Seen or not is no part of the booking's history.
    expect(events).toEqual([]);
  });

  it("clears the stamp to mark the booking as new again", async () => {
    const { client, updates } = makeClient({ ...row, date: "2999-01-01" });

    const { booking } = await setProviderBookingReviewed(client, "booking-1", false);

    expect(updates).toEqual([{ reviewed_at: null }]);
    expect(booking.reviewedAt).toBeUndefined();
  });
});

describe("which bookings can go back to new", () => {
  const refusal = { status: 409 };

  it("refuses a cancelled booking", async () => {
    const { client, updates } = makeClient({ ...row, date: "2999-01-01", status: "cancelled" });

    await expect(setProviderBookingReviewed(client, "booking-1", false)).rejects.toMatchObject(refusal);
    expect(updates).toEqual([]);
  });

  it("refuses a booking whose day has passed", async () => {
    const { client, updates } = makeClient({ ...row, date: "2020-01-01" });

    await expect(setProviderBookingReviewed(client, "booking-1", false)).rejects.toMatchObject(refusal);
    expect(updates).toEqual([]);
  });

  it("reads today on the provider's own clock", async () => {
    vi.useFakeTimers();
    // 03:00 UTC on the 12th is still the evening of the 11th in Mexico City.
    vi.setSystemTime(new Date("2026-10-12T03:00:00.000Z"));
    try {
      const mexico = makeClient({ ...row, date: "2026-10-11" }, "America/Mexico_City");
      await expect(setProviderBookingReviewed(mexico.client, "booking-1", false)).resolves.toBeTruthy();

      const utc = makeClient({ ...row, date: "2026-10-11" }, "UTC");
      await expect(setProviderBookingReviewed(utc.client, "booking-1", false)).rejects.toMatchObject(refusal);
    } finally {
      vi.useRealTimers();
    }
  });

  it("still lets a cancelled or past booking be marked as seen", async () => {
    const { client, updates } = makeClient({ ...row, date: "2020-01-01", status: "cancelled", reviewed_at: null });

    await setProviderBookingReviewed(client, "booking-1", true);

    expect(updates).toHaveLength(1);
  });
});

describe("who is told whether a booking was seen", () => {
  it("tells the provider", async () => {
    const { client } = makeClient();

    expect((await getProviderBookingByManageToken(client, "token")).reviewedAt).toBe(SEEN_AT);
    expect((await cancelProviderBooking(client, "booking-1")).booking.reviewedAt).toBe(SEEN_AT);
  });

  it("never tells the client who booked", async () => {
    const { client } = makeClient();

    const { booking } = await cancelProviderBooking(client, "booking-1", "customer");

    expect(booking.reviewedAt).toBeUndefined();
    expect(JSON.stringify(booking)).not.toContain(SEEN_AT);
  });
});
