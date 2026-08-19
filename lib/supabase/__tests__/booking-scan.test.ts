import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getProviderBookingByManageToken,
  PublicBookingWriteError,
} from "@/lib/supabase/bookings";

const row = {
  id: "booking-1",
  provider_id: "provider-1",
  service_id: "service-1",
  service_name: "Consultation",
  booking_type: "appointment",
  duration_minutes_snapshot: 30,
  cost_snapshot: "$95",
  capacity_snapshot: "1 patient",
  client_name: "Ana Rivera",
  client_email: "ana@example.com",
  client_phone: "555-0100",
  date: "2026-08-20",
  start_time: "09:00:00",
  end_time: "09:30:00",
  status: "confirmed",
  notes: "Bring results",
  location_snapshot: null,
  allows_shared_capacity: false,
  details: {},
  details_schema_key: null,
  details_schema_version: null,
  service_snapshot: null,
  created_at: "2026-08-19T10:00:00.000Z",
  updated_at: "2026-08-19T10:00:00.000Z",
};

function makeClient(data: typeof row | null) {
  const filters: Array<[string, string]> = [];
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: string) => {
      filters.push([column, value]);
      return query;
    }),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
  };
  const client = {
    from: vi.fn((table: string) => {
      expect(table).toBe("bookings");
      return query;
    }),
  };

  return { client: client as unknown as SupabaseClient, filters };
}

describe("provider appointment QR lookup", () => {
  it("hashes token before provider-scoped RLS query and never returns it", async () => {
    const { client, filters } = makeClient(row);

    const booking = await getProviderBookingByManageToken(client, "private-token");

    expect(filters).toEqual([
      [
        "manage_token_hash",
        "eacb9ab8f6db03232e40f809d83464809bdfd41203c70051cc4b42e380732afa",
      ],
    ]);
    expect(booking).toMatchObject({ id: "booking-1", clientName: "Ana Rivera" });
    expect(booking.manageToken).toBe("");
  });

  it("reveals no booking when provider RLS returns no row", async () => {
    const { client } = makeClient(null);

    await expect(
      getProviderBookingByManageToken(client, "another-provider-token"),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PublicBookingWriteError>>({ status: 404 }),
    );
  });
});
