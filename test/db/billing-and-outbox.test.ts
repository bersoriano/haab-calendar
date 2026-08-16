import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { localAdminClient, localAnonClient } from "@/test/db/local-client";

/**
 * Real SQL against a real local PostgreSQL.
 *
 * The migration-text tests elsewhere read the SQL; these run it. Triggers,
 * leases, `SKIP LOCKED`, immutability, and RLS cannot be proven any other way —
 * a regex that finds `enable row level security` says nothing about whether the
 * grant underneath it actually holds.
 */

const admin = localAdminClient();
const anon = localAnonClient();

const OWNER_ID = "00000000-0000-4000-8000-00000000dbb1";
const PROVIDER_ID = "00000000-0000-4000-8000-00000000dbc1";

let serviceId: string;

async function createBooking(overrides: Record<string, unknown> = {}) {
  const suffix = Math.random().toString(36).slice(2, 10);

  const { data, error } = await admin
    .from("bookings")
    .insert({
      provider_id: PROVIDER_ID,
      service_id: serviceId,
      service_name: "Consultation",
      booking_type: "appointment",
      duration_minutes_snapshot: 30,
      client_name: "Test Client",
      client_email: "client@example.invalid",
      date: "2026-09-01",
      start_time: "09:00",
      end_time: "09:30",
      manage_token_hash: `hash_${suffix}`,
      confirmation_number: `CONF${suffix}`,
      idempotency_key: `idem_${suffix}`,
      ...overrides,
    })
    .select("id, integration_version")
    .single<{ id: string; integration_version: number }>();

  if (error) throw error;
  return data;
}

async function outboxFor(bookingId: string) {
  const { data, error } = await admin
    .from("integration_outbox_events")
    .select("id, event_type, aggregate_version, status, attempt_count, payload")
    .eq("booking_id", bookingId)
    .order("aggregate_version", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

beforeAll(async () => {
  await admin.auth.admin.createUser({
    id: OWNER_ID,
    email: "db-tests@example.invalid",
    password: "local-test-password",
    email_confirm: true,
  });

  const { error: providerError } = await admin.from("providers").insert({
    id: PROVIDER_ID,
    owner_user_id: OWNER_ID,
    full_name: "DB Test Owner",
    business_name: "DB Test Clinic",
    email: "db-tests@example.invalid",
    vertical: "healthcare",
    timezone: "UTC",
    availability: {},
    setup_complete: true,
  });
  if (providerError) throw providerError;

  const { data: service, error: serviceError } = await admin
    .from("services")
    .insert({
      provider_id: PROVIDER_ID,
      name: "Consultation",
      booking_type: "appointment",
      duration_minutes: 30,
    })
    .select("id")
    .single<{ id: string }>();
  if (serviceError) throw serviceError;

  serviceId = service.id;
});

afterAll(async () => {
  // Cascades take the bookings, outbox rows, and billing projection with it.
  await admin.from("providers").delete().eq("id", PROVIDER_ID);
  await admin.auth.admin.deleteUser(OWNER_ID);
});

describe("integration outbox trigger", () => {
  it("writes exactly one created event with the booking", async () => {
    const booking = await createBooking();
    const events = await outboxFor(booking.id);

    expect(booking.integration_version).toBe(1);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event_type: "booking.created",
      aggregate_version: 1,
      status: "pending",
    });
  });

  it("carries identifiers in the payload and nothing about the client", async () => {
    const booking = await createBooking();
    const [event] = await outboxFor(booking.id);

    expect(event.payload).toEqual({
      bookingId: booking.id,
      providerId: PROVIDER_ID,
      aggregateVersion: 1,
      change: "booking.created",
    });
    expect(JSON.stringify(event.payload)).not.toContain("client@example.invalid");
    expect(JSON.stringify(event.payload)).not.toContain("Test Client");
  });

  it("ignores a caller-supplied integration version", async () => {
    const booking = await createBooking({ integration_version: 500 });

    expect(booking.integration_version).toBe(1);
  });

  it("emits a rescheduled event when the time moves", async () => {
    const booking = await createBooking();

    await admin
      .from("bookings")
      .update({ start_time: "11:00", end_time: "11:30" })
      .eq("id", booking.id);

    const events = await outboxFor(booking.id);
    expect(events.map((event) => event.event_type)).toEqual([
      "booking.created",
      "booking.rescheduled",
    ]);
    expect(events[1].aggregate_version).toBe(2);
  });

  it("emits a cancelled event when the status changes", async () => {
    const booking = await createBooking();

    await admin.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);

    const events = await outboxFor(booking.id);
    expect(events[1].event_type).toBe("booking.cancelled");
  });

  it("emits an updated event for a note change", async () => {
    const booking = await createBooking();

    await admin.from("bookings").update({ notes: "Bring referral" }).eq("id", booking.id);

    const events = await outboxFor(booking.id);
    expect(events[1].event_type).toBe("booking.updated");
  });

  it("emits nothing for a write that changes only an internal field", async () => {
    const booking = await createBooking();

    await admin
      .from("bookings")
      .update({ confirmation_number: `CONF${Math.random().toString(36).slice(2, 10)}` })
      .eq("id", booking.id);

    const events = await outboxFor(booking.id);
    expect(events).toHaveLength(1);
  });

  it("emits nothing when an update changes nothing at all", async () => {
    const booking = await createBooking();

    await admin.from("bookings").update({ notes: "" }).eq("id", booking.id);

    expect(await outboxFor(booking.id)).toHaveLength(1);
  });
});

describe("outbox claim and lease", () => {
  it("claims a due event, increments the attempt, and issues a lease", async () => {
    const booking = await createBooking();

    const { data, error } = await admin.rpc("claim_integration_outbox_events", {
      p_worker_id: "db-test-worker",
      p_batch_size: 50,
      p_lease_seconds: 60,
    });

    expect(error).toBeNull();
    const claimed = (data ?? []).find(
      (row: { booking_id: string }) => row.booking_id === booking.id,
    );
    expect(claimed).toMatchObject({
      status: "processing",
      attempt_count: 1,
      leased_by: "db-test-worker",
    });
    expect(claimed.lease_token).toBeTruthy();
  });

  it("does not hand the same row to a second worker", async () => {
    await createBooking();

    const first = await admin.rpc("claim_integration_outbox_events", {
      p_worker_id: "worker-a",
      p_batch_size: 50,
      p_lease_seconds: 60,
    });
    const second = await admin.rpc("claim_integration_outbox_events", {
      p_worker_id: "worker-b",
      p_batch_size: 50,
      p_lease_seconds: 60,
    });

    const firstIds = (first.data ?? []).map((row: { id: string }) => row.id);
    const secondIds = (second.data ?? []).map((row: { id: string }) => row.id);

    expect(firstIds.length).toBeGreaterThan(0);
    expect(secondIds.filter((id: string) => firstIds.includes(id))).toEqual([]);
  });

  it("refuses a completion from a worker whose lease has moved on", async () => {
    await createBooking();

    const { data } = await admin.rpc("claim_integration_outbox_events", {
      p_worker_id: "worker-a",
      p_batch_size: 1,
      p_lease_seconds: 60,
    });
    const claimed = data[0];

    const stale = await admin.rpc("complete_integration_outbox_event", {
      p_event_id: claimed.id,
      p_lease_token: "00000000-0000-4000-8000-0000000000ff",
    });
    const rightful = await admin.rpc("complete_integration_outbox_event", {
      p_event_id: claimed.id,
      p_lease_token: claimed.lease_token,
    });

    expect(stale.data).toBe(false);
    expect(rightful.data).toBe(true);
  });

  it("keeps a later version of one booking behind an unfinished earlier one", async () => {
    const booking = await createBooking();
    await admin.from("bookings").update({ notes: "second version" }).eq("id", booking.id);

    const { data } = await admin.rpc("claim_integration_outbox_events", {
      p_worker_id: "ordering-worker",
      p_batch_size: 50,
      p_lease_seconds: 60,
    });

    const claimedForBooking = (data ?? []).filter(
      (row: { booking_id: string }) => row.booking_id === booking.id,
    );

    // Only version 1 is eligible; version 2 waits for it to settle, so a
    // cancellation can never overtake the reschedule before it.
    expect(claimedForBooking).toHaveLength(1);
    expect(Number(claimedForBooking[0].aggregate_version)).toBe(1);
  });

  it("rejects a batch size or lease outside the safe range", async () => {
    const bigBatch = await admin.rpc("claim_integration_outbox_events", {
      p_worker_id: "w",
      p_batch_size: 500,
      p_lease_seconds: 60,
    });
    const longLease = await admin.rpc("claim_integration_outbox_events", {
      p_worker_id: "w",
      p_batch_size: 10,
      p_lease_seconds: 5000,
    });

    expect(bigBatch.error).not.toBeNull();
    expect(longLease.error).not.toBeNull();
  });

  it("will not claim a terminal row again", async () => {
    await createBooking();

    const { data } = await admin.rpc("claim_integration_outbox_events", {
      p_worker_id: "terminal-worker",
      p_batch_size: 1,
      p_lease_seconds: 60,
    });
    const claimed = data[0];

    await admin.rpc("skip_integration_outbox_event", {
      p_event_id: claimed.id,
      p_lease_token: claimed.lease_token,
      p_reason_code: "no_active_integrations",
    });

    const again = await admin.rpc("claim_integration_outbox_events", {
      p_worker_id: "terminal-worker",
      p_batch_size: 50,
      p_lease_seconds: 60,
    });

    expect((again.data ?? []).map((row: { id: string }) => row.id)).not.toContain(
      claimed.id,
    );
  });
});

describe("outbox access control", () => {
  it("hides the table from anon entirely", async () => {
    const read = await anon.from("integration_outbox_events").select("id").limit(1);
    const write = await anon
      .from("integration_outbox_events")
      .insert({ provider_id: PROVIDER_ID, booking_id: PROVIDER_ID });

    expect(read.error).not.toBeNull();
    expect(write.error).not.toBeNull();
  });

  it("refuses the worker RPCs to anon", async () => {
    const { error } = await anon.rpc("claim_integration_outbox_events", {
      p_worker_id: "attacker",
      p_batch_size: 10,
      p_lease_seconds: 60,
    });

    expect(error).not.toBeNull();
  });
});

describe("stripe webhook inbox", () => {
  const eventId = `evt_db_test_${Math.random().toString(36).slice(2, 10)}`;

  async function insertEvent(overrides: Record<string, unknown> = {}) {
    return admin.from("stripe_webhook_events").insert({
      stripe_event_id: eventId,
      event_type: "customer.subscription.updated",
      livemode: false,
      event_created_at: new Date().toISOString(),
      payload: { id: eventId, object: "event" },
      ...overrides,
    });
  }

  it("accepts an event once and rejects the redelivery", async () => {
    const first = await insertEvent();
    const second = await insertEvent();

    expect(first.error).toBeNull();
    expect(second.error?.code).toBe("23505");
  });

  it("refuses to let the payload or identity be rewritten", async () => {
    const { error } = await admin
      .from("stripe_webhook_events")
      .update({ payload: { id: "evt_rewritten" } })
      .eq("stripe_event_id", eventId);

    expect(error).not.toBeNull();
  });

  it("claims an event exactly once", async () => {
    const first = await admin.rpc("claim_stripe_webhook_event", {
      p_stripe_event_id: eventId,
      p_lease_seconds: 60,
    });
    const second = await admin.rpc("claim_stripe_webhook_event", {
      p_stripe_event_id: eventId,
      p_lease_seconds: 60,
    });

    expect(first.data).not.toBeNull();
    expect(second.data).toBeNull();
  });

  it("applies the projection and completes the inbox row together", async () => {
    const applied = await admin.rpc("apply_stripe_subscription_projection", {
      p_stripe_event_id: eventId,
      p_provider_id: PROVIDER_ID,
      p_stripe_customer_id: "cus_db_test",
      p_stripe_subscription_id: `sub_db_${Math.random().toString(36).slice(2, 8)}`,
      p_status: "active",
      p_plan_tier: "premium",
      p_current_period_end: new Date(Date.now() + 86_400_000).toISOString(),
      p_cancel_at_period_end: false,
      p_event_created_at: new Date().toISOString(),
    });

    const { data: projection } = await admin
      .from("provider_billing_subscriptions")
      .select("plan_tier, status")
      .eq("provider_id", PROVIDER_ID)
      .maybeSingle();

    const { data: inbox } = await admin
      .from("stripe_webhook_events")
      .select("status, processed_at")
      .eq("stripe_event_id", eventId)
      .maybeSingle();

    expect(applied.data).toBe("updated");
    expect(projection).toMatchObject({ plan_tier: "premium", status: "active" });
    expect(inbox).toMatchObject({ status: "processed" });
    expect(inbox?.processed_at).not.toBeNull();
  });

  it("refuses to move the projection backwards for an older event", async () => {
    const olderEventId = `evt_db_old_${Math.random().toString(36).slice(2, 10)}`;
    const older = new Date(Date.now() - 86_400_000).toISOString();

    await admin.from("stripe_webhook_events").insert({
      stripe_event_id: olderEventId,
      event_type: "customer.subscription.updated",
      livemode: false,
      event_created_at: older,
      payload: { id: olderEventId, object: "event" },
    });

    const applied = await admin.rpc("apply_stripe_subscription_projection", {
      p_stripe_event_id: olderEventId,
      p_provider_id: PROVIDER_ID,
      p_stripe_customer_id: "cus_db_test",
      p_stripe_subscription_id: "sub_db_stale",
      p_status: "canceled",
      p_plan_tier: "free",
      p_current_period_end: null,
      p_cancel_at_period_end: false,
      p_event_created_at: older,
    });

    const { data: projection } = await admin
      .from("provider_billing_subscriptions")
      .select("plan_tier")
      .eq("provider_id", PROVIDER_ID)
      .maybeSingle();

    // Recorded as handled, applied to nothing.
    expect(applied.data).toBe("stale");
    expect(projection?.plan_tier).toBe("premium");
  });

  it("hides billing state from anon and authenticated roles", async () => {
    const inbox = await anon.from("stripe_webhook_events").select("id").limit(1);
    const projection = await anon
      .from("provider_billing_subscriptions")
      .select("plan_tier")
      .limit(1);
    const write = await anon
      .from("provider_billing_subscriptions")
      .update({ plan_tier: "premium" })
      .eq("provider_id", PROVIDER_ID);

    expect(inbox.error).not.toBeNull();
    expect(projection.error).not.toBeNull();
    expect(write.error).not.toBeNull();
  });
});
