import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { localAdminClient } from "@/test/db/local-client";

const admin = localAdminClient();
const OWNER_ID = "00000000-0000-4000-8000-00000000dbd1";
const PROVIDER_ID = "00000000-0000-4000-8000-00000000dbd2";
const SERVICE_ID = "00000000-0000-4000-8000-00000000dbd3";
const BOOKING_IDS = [
  "00000000-0000-4000-8000-00000000dbd4",
  "00000000-0000-4000-8000-00000000dbd5",
];

beforeAll(async () => {
  const { error: userError } = await admin.auth.admin.createUser({
    id: OWNER_ID,
    email: "shared-delete@example.invalid",
    password: "local-test-password",
    email_confirm: true,
  });
  if (userError) throw userError;

  const { error: providerError } = await admin.from("providers").insert({
    id: PROVIDER_ID,
    owner_user_id: OWNER_ID,
    full_name: "Shared Service Owner",
    business_name: "Shared Service Tests",
    email: "shared-delete@example.invalid",
    vertical: "events",
    timezone: "UTC",
    availability: {},
    setup_complete: true,
  });
  if (providerError) throw providerError;

  const { error: serviceError } = await admin.from("services").insert({
    id: SERVICE_ID,
    provider_id: PROVIDER_ID,
    name: "Shared Session",
    booking_type: "appointment",
    duration_minutes: 30,
    max_spots: 3,
  });
  if (serviceError) throw serviceError;

  const { error: bookingError } = await admin.from("bookings").insert(
    BOOKING_IDS.map((id, index) => ({
      id,
      provider_id: PROVIDER_ID,
      service_id: SERVICE_ID,
      service_name: "Shared Session",
      booking_type: "appointment",
      duration_minutes_snapshot: 30,
      client_name: `Guest ${index + 1}`,
      client_email: `guest-${index + 1}@example.invalid`,
      date: "2026-12-01",
      start_time: "09:00",
      end_time: "09:30",
      manage_token_hash: `shared-delete-hash-${index}`,
      confirmation_number: `SHAREDDELETE${index}`,
      idempotency_key: `shared-delete-idem-${index}`,
    })),
  );
  if (bookingError) throw bookingError;
});

afterAll(async () => {
  await admin.from("providers").delete().eq("id", PROVIDER_ID);
  await admin.auth.admin.deleteUser(OWNER_ID);
});

describe("deleting a booked shared-capacity service", () => {
  it("keeps both bookings and their shared-capacity snapshots", async () => {
    const { data: before, error: beforeError } = await admin
      .from("bookings")
      .select("id, service_id, allows_shared_capacity")
      .in("id", BOOKING_IDS);
    if (beforeError) throw beforeError;
    expect(before).toHaveLength(2);
    expect(before?.every((booking) => booking.allows_shared_capacity)).toBe(true);

    const { error: workflowError } = await admin
      .from("providers")
      .update({ vertical: "professional" })
      .eq("id", PROVIDER_ID);
    if (workflowError) throw workflowError;

    const { error: deleteError } = await admin
      .from("services")
      .delete()
      .eq("id", SERVICE_ID);
    if (deleteError) throw deleteError;

    const { data: after, error: afterError } = await admin
      .from("bookings")
      .select("id, service_id, allows_shared_capacity")
      .in("id", BOOKING_IDS);
    if (afterError) throw afterError;
    expect(after).toHaveLength(2);
    expect(after?.every((booking) => booking.service_id === null)).toBe(true);
    expect(after?.every((booking) => booking.allows_shared_capacity)).toBe(true);
  });
});
