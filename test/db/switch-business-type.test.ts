import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

import { localAdminClient, localAnonClient } from "@/test/db/local-client";

/**
 * switch_provider_business_type runs as the caller, inside one transaction.
 * These prove the parts nothing above the database can: the row lock and the
 * re-check, the all-or-nothing swap, row-level security, and the redirect the
 * slug trigger records.
 */

const admin = localAdminClient();
const PASSWORD = "local-test-password";
const createdUsers: string[] = [];

const NEW_SERVICES = [
  {
    name: "Annual check-up",
    slug: "annual-check-up",
    booking_type: "appointment",
    duration_minutes: 45,
    description: "A yearly visit.",
    sort_order: 0,
  },
  {
    name: "Follow-up",
    slug: "follow-up",
    booking_type: "appointment",
    duration_minutes: 20,
    description: "A short follow-up.",
    sort_order: 1,
  },
];

const NEW_AVAILABILITY = {
  monday: { enabled: true, startTime: "08:00", endTime: "14:00" },
  tuesday: { enabled: false, startTime: "08:00", endTime: "14:00" },
};

function daysFromToday(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function signedInClient(email: string): Promise<SupabaseClient> {
  const client = localAnonClient();
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return client;
}

async function seedProvider(label: string) {
  const suffix = `${label}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `switch-${suffix}@example.invalid`;
  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (userError) throw userError;
  createdUsers.push(created.user.id);

  const { data: provider, error: providerError } = await admin
    .from("providers")
    .insert({
      owner_user_id: created.user.id,
      full_name: "Switch Owner",
      business_name: `Switch ${suffix}`,
      email,
      vertical: "professional",
      timezone: "UTC",
      availability: { monday: { enabled: true, startTime: "09:00", endTime: "17:00" } },
      max_bookings_per_day: 3,
      setup_complete: true,
    })
    .select("id, slug")
    .single<{ id: string; slug: string }>();
  if (providerError) throw providerError;

  const { data: service, error: serviceError } = await admin
    .from("services")
    .insert({
      provider_id: provider.id,
      name: "Strategy session",
      booking_type: "appointment",
      duration_minutes: 60,
      description: "An hour of advice.",
    })
    .select("id")
    .single<{ id: string }>();
  if (serviceError) throw serviceError;

  return {
    providerId: provider.id,
    slug: provider.slug,
    serviceId: service.id,
    client: await signedInClient(email),
  };
}

async function addBooking(providerId: string, serviceId: string, date: string, status = "confirmed") {
  const suffix = Math.random().toString(36).slice(2, 10);
  const { data, error } = await admin
    .from("bookings")
    .insert({
      provider_id: providerId,
      service_id: serviceId,
      service_name: "Strategy session",
      booking_type: "appointment",
      duration_minutes_snapshot: 60,
      client_name: "Client",
      client_email: "client@example.invalid",
      date,
      start_time: "10:00",
      end_time: "11:00",
      status,
      manage_token_hash: `switch-hash-${suffix}`,
      confirmation_number: `SWITCH${suffix}`,
      idempotency_key: `switch-idem-${suffix}`,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) throw error;
  return data.id;
}

function switchTo(client: SupabaseClient, vertical: string) {
  return client.rpc("switch_provider_business_type", {
    p_vertical: vertical,
    p_availability: NEW_AVAILABILITY,
    p_max_bookings_per_day: null,
    p_services: NEW_SERVICES,
  });
}

async function readProvider(providerId: string) {
  const { data, error } = await admin
    .from("providers")
    .select("vertical, availability, max_bookings_per_day")
    .eq("id", providerId)
    .single<{ vertical: string; availability: unknown; max_bookings_per_day: number | null }>();
  if (error) throw error;
  return data;
}

async function serviceNames(providerId: string) {
  const { data, error } = await admin
    .from("services")
    .select("name")
    .eq("provider_id", providerId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((row) => row.name as string);
}

afterAll(async () => {
  for (const userId of createdUsers) {
    await admin.from("providers").delete().eq("owner_user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
});

describe("switch_provider_business_type", () => {
  it("replaces services, type, hours and daily limit in one step and keeps the old link", async () => {
    const seeded = await seedProvider("swap");

    const { data, error } = await switchTo(seeded.client, "healthcare");

    expect(error).toBeNull();
    expect(data).toBe(seeded.providerId);
    expect(await readProvider(seeded.providerId)).toMatchObject({
      vertical: "healthcare",
      availability: NEW_AVAILABILITY,
      max_bookings_per_day: null,
    });
    expect(await serviceNames(seeded.providerId)).toEqual(["Annual check-up", "Follow-up"]);

    const { data: redirect } = await admin
      .from("provider_slug_redirects")
      .select("provider_id")
      .eq("vertical", "professional")
      .eq("slug", seeded.slug)
      .maybeSingle<{ provider_id: string }>();
    expect(redirect?.provider_id).toBe(seeded.providerId);
  });

  it("keeps past bookings, detached from the removed service", async () => {
    const seeded = await seedProvider("past");
    const bookingId = await addBooking(seeded.providerId, seeded.serviceId, daysFromToday(-30));

    const { error } = await switchTo(seeded.client, "spaces");
    expect(error).toBeNull();

    const { data: booking } = await admin
      .from("bookings")
      .select("service_id, service_name")
      .eq("id", bookingId)
      .single<{ service_id: string | null; service_name: string }>();
    expect(booking).toEqual({ service_id: null, service_name: "Strategy session" });
  });

  it("refuses while a client has an upcoming booking, changing nothing", async () => {
    const seeded = await seedProvider("upcoming");
    await addBooking(seeded.providerId, seeded.serviceId, daysFromToday(3));

    const { error } = await switchTo(seeded.client, "healthcare");

    expect(error?.message).toBe("upcoming_bookings");
    expect((await readProvider(seeded.providerId)).vertical).toBe("professional");
    expect(await serviceNames(seeded.providerId)).toEqual(["Strategy session"]);
  });

  it("ignores cancelled upcoming bookings", async () => {
    const seeded = await seedProvider("cancelled");
    await addBooking(seeded.providerId, seeded.serviceId, daysFromToday(3), "cancelled");

    const { error } = await switchTo(seeded.client, "healthcare");
    expect(error).toBeNull();
  });

  it("refuses while someone holds a slot", async () => {
    const seeded = await seedProvider("hold");
    const { error: holdError } = await admin.from("booking_holds").insert({
      provider_id: seeded.providerId,
      service_id: seeded.serviceId,
      booking_type: "appointment",
      date: daysFromToday(5),
      start_time: "10:00",
      end_time: "11:00",
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (holdError) throw holdError;

    const { error } = await switchTo(seeded.client, "healthcare");

    expect(error?.message).toBe("active_holds");
    expect((await readProvider(seeded.providerId)).vertical).toBe("professional");
  });

  it("refuses a switch to the type the page already has", async () => {
    const seeded = await seedProvider("same");

    const { error } = await switchTo(seeded.client, "professional");
    expect(error?.message).toBe("same_vertical");
  });

  it("refuses an empty service list", async () => {
    const seeded = await seedProvider("empty");

    const { error } = await seeded.client.rpc("switch_provider_business_type", {
      p_vertical: "healthcare",
      p_availability: NEW_AVAILABILITY,
      p_max_bookings_per_day: null,
      p_services: [],
    });
    expect(error?.message).toBe("no_services");
  });

  it("finds no page for a caller who does not own one", async () => {
    const email = `switch-nobody-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const { data: created, error: userError } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (userError) throw userError;
    createdUsers.push(created.user.id);

    const { error } = await switchTo(await signedInClient(email), "healthcare");
    expect(error?.message).toBe("not_found");
  });
});
