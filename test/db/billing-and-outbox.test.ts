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

/**
 * Every booking gets its own slot.
 *
 * `bookings_exact_active_slot_idx` forbids two active bookings at one
 * provider's exact date and time, which is the whole point of it. The suite
 * randomised the tokens but reused 2026-09-01 09:00 for every booking, so the
 * first test passed and every later one collided with it.
 */
let slotCursor = 0;

async function createBooking(overrides: Record<string, unknown> = {}) {
  const suffix = Math.random().toString(36).slice(2, 10);
  // A distinct day per booking, so a test never has to reason about which
  // other test happened to take the same slot.
  const day = new Date(Date.UTC(2026, 8, 1) + slotCursor * 86_400_000);
  slotCursor += 1;

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
      date: day.toISOString().slice(0, 10),
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

    // Not `toBeNull()`, however much it reads that way. PostgREST renders a
    // composite-returning function as an object of nulls when the function
    // returned SQL NULL, so "nothing was claimed" arrives as a populated shape
    // whose fields are all null. Believing otherwise is what let two workers
    // both report claiming a job that neither had.
    expect(first.data?.id).toBeTruthy();
    expect(second.data?.id).toBeFalsy();
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

/**
 * A super admin granting premium to somebody else's provider.
 *
 * The point of an override is that one person can act on another person's
 * account, so the case worth proving is the cross-account one: the actor and
 * the provider's owner are deliberately different users here, and nothing in
 * the RPC ties them together.
 *
 * The session check that decides who counts as a super admin lives in the route
 * and is covered there. What only a database can answer is whether the write
 * lands on the intended provider, whether the audit records who did it, and
 * whether anyone else can reach the same function.
 */
describe("super admin feature overrides", () => {
  // Distinct from OWNER_ID on purpose. If these two were ever the same the
  // suite would still pass while proving only the self-service case.
  const SUPER_ADMIN_ID = "00000000-0000-4000-8000-00000000dba9";

  beforeAll(async () => {
    await admin.auth.admin.createUser({
      id: SUPER_ADMIN_ID,
      email: "db-super-admin@example.invalid",
      password: "local-test-password",
      email_confirm: true,
    });
  });

  afterAll(async () => {
    await admin.auth.admin.deleteUser(SUPER_ADMIN_ID).catch(() => undefined);
  });

  async function currentOverride(featureKey: string) {
    const { data } = await admin
      .from("provider_feature_overrides")
      .select("provider_id, feature_key, enabled, expires_at, reason, created_by_user_id")
      .eq("provider_id", PROVIDER_ID)
      .eq("feature_key", featureKey)
      .maybeSingle();

    return data;
  }

  async function auditFor(featureKey: string) {
    const { data } = await admin
      .from("provider_feature_override_events")
      .select("action, enabled, reason, actor_user_id, created_at")
      .eq("provider_id", PROVIDER_ID)
      .eq("feature_key", featureKey)
      .order("created_at", { ascending: true });

    return data ?? [];
  }

  it("grants a feature on a provider the actor does not own", async () => {
    const { error } = await admin.rpc("set_provider_feature_override", {
      p_provider_id: PROVIDER_ID,
      p_feature_key: "google_calendar_sync",
      p_enabled: true,
      p_expires_at: null,
      p_reason: "Enabling for a support case",
      p_actor_user_id: SUPER_ADMIN_ID,
    });

    expect(error).toBeNull();

    const override = await currentOverride("google_calendar_sync");
    expect(override).toMatchObject({
      provider_id: PROVIDER_ID,
      enabled: true,
      created_by_user_id: SUPER_ADMIN_ID,
    });

    // The whole point: the provider belongs to someone else.
    expect(SUPER_ADMIN_ID).not.toBe(OWNER_ID);
  });

  it("records who did it, in a row the actor cannot author", async () => {
    const events = await auditFor("google_calendar_sync");
    const set = events.filter((event) => event.action === "set");

    expect(set.length).toBeGreaterThanOrEqual(1);
    expect(set.at(-1)).toMatchObject({
      enabled: true,
      actor_user_id: SUPER_ADMIN_ID,
      reason: "Enabling for a support case",
    });
  });

  it("writes the override and its audit row in the same statement", async () => {
    // A reason is required, and the failure has to leave nothing behind — an
    // override without an audit row is worse than no override.
    const before = (await auditFor("custom_slug")).length;

    const { error } = await admin.rpc("set_provider_feature_override", {
      p_provider_id: PROVIDER_ID,
      p_feature_key: "custom_slug",
      p_enabled: true,
      p_expires_at: null,
      p_reason: "   ",
      p_actor_user_id: SUPER_ADMIN_ID,
    });

    expect(error).not.toBeNull();
    expect(await currentOverride("custom_slug")).toBeNull();
    expect((await auditFor("custom_slug")).length).toBe(before);
  });

  it("replaces an existing override rather than stacking a second one", async () => {
    await admin.rpc("set_provider_feature_override", {
      p_provider_id: PROVIDER_ID,
      p_feature_key: "google_calendar_sync",
      p_enabled: false,
      p_expires_at: null,
      p_reason: "Revoking after the support case",
      p_actor_user_id: SUPER_ADMIN_ID,
    });

    const { data: rows } = await admin
      .from("provider_feature_overrides")
      .select("id, enabled")
      .eq("provider_id", PROVIDER_ID)
      .eq("feature_key", "google_calendar_sync");

    // One current override per provider and feature; the history is the events
    // table, not extra rows here.
    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.enabled).toBe(false);

    const events = await auditFor("google_calendar_sync");
    expect(events.filter((event) => event.action === "set").length).toBeGreaterThanOrEqual(2);
  });

  it("clears the override and says so in the audit", async () => {
    const { error } = await admin.rpc("clear_provider_feature_override", {
      p_provider_id: PROVIDER_ID,
      p_feature_key: "google_calendar_sync",
      p_reason: "Support case closed",
      p_actor_user_id: SUPER_ADMIN_ID,
    });

    expect(error).toBeNull();
    expect(await currentOverride("google_calendar_sync")).toBeNull();

    const events = await auditFor("google_calendar_sync");
    expect(events.at(-1)).toMatchObject({
      action: "cleared",
      enabled: null,
      actor_user_id: SUPER_ADMIN_ID,
    });
  });

  it("keeps the history after the override is gone", async () => {
    // Clearing is not forgetting. The record that someone was granted premium
    // has to outlive the grant.
    expect((await auditFor("google_calendar_sync")).length).toBeGreaterThanOrEqual(3);
  });

  it("refuses both tables and both functions to anon", async () => {
    const readOverrides = await anon
      .from("provider_feature_overrides")
      .select("id")
      .limit(1);
    const readAudit = await anon
      .from("provider_feature_override_events")
      .select("id")
      .limit(1);

    const grant = await anon.rpc("set_provider_feature_override", {
      p_provider_id: PROVIDER_ID,
      p_feature_key: "google_calendar_sync",
      p_enabled: true,
      p_expires_at: null,
      p_reason: "Granting myself premium",
      p_actor_user_id: SUPER_ADMIN_ID,
    });
    const clear = await anon.rpc("clear_provider_feature_override", {
      p_provider_id: PROVIDER_ID,
      p_feature_key: "google_calendar_sync",
      p_reason: "Covering my tracks",
      p_actor_user_id: SUPER_ADMIN_ID,
    });

    expect(readOverrides.error).not.toBeNull();
    expect(readAudit.error).not.toBeNull();
    expect(grant.error).not.toBeNull();
    expect(clear.error).not.toBeNull();
  });
});

describe("google calendar mapping constraints", () => {
  let connectionId: string;
  const generation = "00000000-0000-4000-8000-0000000000c1";

  beforeAll(async () => {
    const { data, error } = await admin
      .from("provider_google_calendar_connections")
      .insert({
        provider_id: PROVIDER_ID,
        connection_generation: generation,
        refresh_token_ciphertext: "ciphertext",
        refresh_token_iv: "iv",
        refresh_token_auth_tag: "tag",
        refresh_token_key_version: 1,
        granted_scopes: ["https://www.googleapis.com/auth/calendar.events"],
        target_calendar_id: "cal-db-test",
        status: "connected",
      })
      .select("id")
      .single<{ id: string }>();

    if (error) throw error;
    connectionId = data.id;
  });

  it("accepts a mapping whose booking, provider, and connection agree", async () => {
    const booking = await createBooking();

    const { error } = await admin
      .from("provider_google_calendar_event_mappings")
      .insert({
        provider_id: PROVIDER_ID,
        connection_id: connectionId,
        connection_generation: generation,
        booking_id: booking.id,
        google_calendar_id: "cal-db-test",
        google_event_id: "haab00000000000000000000000000001",
        last_projected_booking_version: 1,
      });

    expect(error).toBeNull();
  });

  it("refuses to rotate the generation in place while a mapping exists", async () => {
    // What reconnect does today: upsert on provider_id, which UPDATEs
    // connection_generation on the live row. The mapping FK has no ON UPDATE,
    // so the old generation it references stops existing and the update is
    // rejected. Reconnect has to delete and insert, not rotate.
    const booking = await createBooking();

    const { error: mappingError } = await admin
      .from("provider_google_calendar_event_mappings")
      .insert({
        provider_id: PROVIDER_ID,
        connection_id: connectionId,
        connection_generation: generation,
        booking_id: booking.id,
        google_calendar_id: "cal-db-test",
        google_event_id: "haab00000000000000000000000000009",
        last_projected_booking_version: 1,
      });

    expect(mappingError).toBeNull();

    const { error } = await admin
      .from("provider_google_calendar_connections")
      .update({ connection_generation: "00000000-0000-4000-8000-0000000000c9" })
      .eq("id", connectionId);

    expect(error).not.toBeNull();
  });

  it("refuses a mapping naming a provider the booking does not belong to", async () => {
    const booking = await createBooking();

    const { error } = await admin
      .from("provider_google_calendar_event_mappings")
      .insert({
        // A different provider than the booking's — the composite foreign key
        // is what makes this impossible rather than merely discouraged.
        provider_id: "00000000-0000-4000-8000-00000000dead",
        connection_id: connectionId,
        connection_generation: generation,
        booking_id: booking.id,
        google_calendar_id: "cal-db-test",
        google_event_id: "haab00000000000000000000000000002",
      });

    expect(error).not.toBeNull();
  });

  it("refuses a mapping claiming a connection generation that does not exist", async () => {
    const booking = await createBooking();

    const { error } = await admin
      .from("provider_google_calendar_event_mappings")
      .insert({
        provider_id: PROVIDER_ID,
        connection_id: connectionId,
        // A reconnect rotates the generation; an old mapping must not be able
        // to authorize a write against the new grant.
        connection_generation: "00000000-0000-4000-8000-0000000000ff",
        booking_id: booking.id,
        google_calendar_id: "cal-db-test",
        google_event_id: "haab00000000000000000000000000003",
      });

    expect(error).not.toBeNull();
  });

  it("refuses a Google event id shorter than Google allows", async () => {
    const booking = await createBooking();

    const { error } = await admin
      .from("provider_google_calendar_event_mappings")
      .insert({
        provider_id: PROVIDER_ID,
        connection_id: connectionId,
        connection_generation: generation,
        booking_id: booking.id,
        google_calendar_id: "cal-db-test",
        google_event_id: "abc",
      });

    expect(error).not.toBeNull();
  });

  it("hides connections, mappings, and jobs from anon", async () => {
    for (const table of [
      "provider_google_calendar_connections",
      "provider_google_calendar_event_mappings",
      "provider_google_reconciliation_jobs",
      "google_revocation_jobs",
    ]) {
      const read = await anon.from(table).select("id").limit(1);
      const write = await anon.from(table).insert({ provider_id: PROVIDER_ID });

      expect(read.error).not.toBeNull();
      expect(write.error).not.toBeNull();
    }
  });

  it("refuses the Google worker RPCs to anon", async () => {
    const reconcile = await anon.rpc("claim_google_reconciliation_job", {
      p_worker_id: "attacker",
      p_lease_seconds: 120,
    });
    const revoke = await anon.rpc("claim_google_revocation_job", {
      p_worker_id: "attacker",
    });

    expect(reconcile.error).not.toBeNull();
    expect(revoke.error).not.toBeNull();
  });

  it("enforces the reconciliation cursor being a pair or nothing", async () => {
    const { error } = await admin.from("provider_google_reconciliation_jobs").insert({
      provider_id: PROVIDER_ID,
      connection_id: connectionId,
      connection_generation: "00000000-0000-4000-8000-0000000000c9",
      cursor_date: "2026-09-01",
      // Half a cursor either repeats a page forever or steps over bookings.
      cursor_booking_id: null,
    });

    expect(error).not.toBeNull();
  });

  it("enforces that only a completed job carries a completion time", async () => {
    const { error } = await admin.from("provider_google_reconciliation_jobs").insert({
      provider_id: PROVIDER_ID,
      connection_id: connectionId,
      connection_generation: "00000000-0000-4000-8000-0000000000ca",
      status: "pending",
      completed_at: new Date().toISOString(),
    });

    expect(error).not.toBeNull();
  });

  it("cascades mappings and jobs when the connection goes", async () => {
    const { data: connection } = await admin
      .from("provider_google_calendar_connections")
      .select("id")
      .eq("provider_id", PROVIDER_ID)
      .maybeSingle<{ id: string }>();

    await admin
      .from("provider_google_calendar_connections")
      .delete()
      .eq("id", connection?.id ?? "");

    const { data: mappings } = await admin
      .from("provider_google_calendar_event_mappings")
      .select("id")
      .eq("connection_id", connection?.id ?? "");

    expect(mappings ?? []).toHaveLength(0);
  });
  it("lets a reconnect replace a connection that already has mappings", async () => {
    // The shape saveConnection uses: delete the old row so its mappings cascade,
    // then insert a new generation. An in-place UPDATE of the generation is what
    // the earlier test proves the database refuses.
    const booking = await createBooking();

    const { data: previous } = await admin
      .from("provider_google_calendar_connections")
      .select("id, connection_generation")
      .eq("provider_id", PROVIDER_ID)
      .maybeSingle<{ id: string; connection_generation: string }>();

    if (previous) {
      await admin.from("provider_google_calendar_event_mappings").insert({
        provider_id: PROVIDER_ID,
        connection_id: previous.id,
        connection_generation: previous.connection_generation,
        booking_id: booking.id,
        google_calendar_id: "cal-db-test",
        google_event_id: "haab0000000000000000000000000000b",
      });

      await admin
        .from("provider_google_calendar_connections")
        .delete()
        .eq("id", previous.id);
    }

    const rotated = "00000000-0000-4000-8000-0000000000cb";
    const { data: reconnected, error } = await admin
      .from("provider_google_calendar_connections")
      .insert({
        provider_id: PROVIDER_ID,
        connection_generation: rotated,
        refresh_token_ciphertext: "ciphertext",
        refresh_token_iv: "iv",
        refresh_token_auth_tag: "tag",
        refresh_token_key_version: 1,
        granted_scopes: ["https://www.googleapis.com/auth/calendar.events"],
        status: "connected",
      })
      .select("id, connection_generation")
      .single<{ id: string; connection_generation: string }>();

    expect(error).toBeNull();
    expect(reconnected?.connection_generation).toBe(rotated);
    expect(reconnected?.connection_generation).not.toBe(previous?.connection_generation);

    const { data: survivors } = await admin
      .from("provider_google_calendar_event_mappings")
      .select("id")
      .eq("provider_id", PROVIDER_ID);

    // The old mappings went with the old row rather than being left pointing at
    // a generation that no longer exists.
    expect(survivors).toEqual([]);
  });

});
