import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { localAdminClient } from "@/test/db/local-client";

const admin = localAdminClient();
const OWNER_ID = "00000000-0000-4000-8000-00000000dbe1";
const PROVIDER_ID = "00000000-0000-4000-8000-00000000dbe2";
const SERVICE_ID = "00000000-0000-4000-8000-00000000dbe3";
const BOOKING_ID = "00000000-0000-4000-8000-00000000dbe4";

beforeAll(async () => {
  const { error: userError } = await admin.auth.admin.createUser({
    id: OWNER_ID,
    email: "booking-review@example.invalid",
    password: "local-test-password",
    email_confirm: true,
  });
  if (userError) throw userError;

  const { error: providerError } = await admin.from("providers").insert({
    id: PROVIDER_ID,
    owner_user_id: OWNER_ID,
    full_name: "Review Owner",
    business_name: "Booking Review Tests",
    email: "booking-review@example.invalid",
    vertical: "professional",
    timezone: "UTC",
    availability: {},
    setup_complete: true,
  });
  if (providerError) throw providerError;

  const { error: serviceError } = await admin.from("services").insert({
    id: SERVICE_ID,
    provider_id: PROVIDER_ID,
    name: "Strategy Session",
    booking_type: "appointment",
    duration_minutes: 30,
  });
  if (serviceError) throw serviceError;

  const { error: bookingError } = await admin.from("bookings").insert({
    id: BOOKING_ID,
    provider_id: PROVIDER_ID,
    service_id: SERVICE_ID,
    service_name: "Strategy Session",
    booking_type: "appointment",
    duration_minutes_snapshot: 30,
    client_name: "Guest",
    client_email: "guest@example.invalid",
    date: "2026-12-02",
    start_time: "09:00",
    end_time: "09:30",
    manage_token_hash: "booking-review-hash",
    confirmation_number: "BOOKINGREVIEW1",
    idempotency_key: "booking-review-idem",
  });
  if (bookingError) throw bookingError;
});

afterAll(async () => {
  await admin.from("providers").delete().eq("id", PROVIDER_ID);
  await admin.auth.admin.deleteUser(OWNER_ID);
});

async function readBooking() {
  const { data, error } = await admin
    .from("bookings")
    .select("reviewed_at, integration_version")
    .eq("id", BOOKING_ID)
    .single<{ reviewed_at: string | null; integration_version: number }>();
  if (error) throw error;
  return data;
}

async function countOutboxEvents() {
  const { count, error } = await admin
    .from("integration_outbox_events")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", BOOKING_ID);
  if (error) throw error;
  return count ?? 0;
}

describe("bookings.reviewed_at", () => {
  it("leaves a booking made after the migration as new", async () => {
    expect((await readBooking()).reviewed_at).toBeNull();
  });

  it("marks a booking seen, and new again, without telling any integration", async () => {
    const before = await readBooking();
    const eventsBefore = await countOutboxEvents();

    const { error: seenError } = await admin
      .from("bookings")
      .update({ reviewed_at: new Date().toISOString() })
      .eq("id", BOOKING_ID);
    if (seenError) throw seenError;

    const seen = await readBooking();
    expect(seen.reviewed_at).not.toBeNull();
    // Seen or not is the provider's own note: no version bump, no calendar sync.
    expect(seen.integration_version).toBe(before.integration_version);
    expect(await countOutboxEvents()).toBe(eventsBefore);

    const { error: newError } = await admin
      .from("bookings")
      .update({ reviewed_at: null })
      .eq("id", BOOKING_ID);
    if (newError) throw newError;

    const again = await readBooking();
    expect(again.reviewed_at).toBeNull();
    expect(again.integration_version).toBe(before.integration_version);
    expect(await countOutboxEvents()).toBe(eventsBefore);
  });
});
