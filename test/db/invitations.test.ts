import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it, vi } from "vitest";

// The data layer is server-only in the app; here it runs in plain Node.
vi.mock("server-only", () => ({}));

import { isWellFormedInvitationToken } from "@/lib/invitations";
import {
  createInvitations,
  deleteAllInvitations,
  deleteInvitation,
  getPublicInvitation,
  listInvitations,
  regenerateInvitationToken,
  submitPublicRsvp,
  updateInvitation,
} from "@/lib/supabase/invitations";
import { localAdminClient, localAnonClient } from "@/test/db/local-client";

/**
 * The guest list's rules that only the database can promise: who may read a
 * list, how many people an invitation holds, and which events its answers may
 * name. The API checks the same things first; these are what still hold when a
 * request skips it.
 */

const admin = localAdminClient();
const PASSWORD = "local-test-password";
const createdUsers: string[] = [];

async function signedInClient(email: string): Promise<SupabaseClient> {
  const client = localAnonClient();
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return client;
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

async function seedWedding(label: string) {
  const suffix = `${label}-${randomSuffix()}`;
  const email = `invitations-${suffix}@example.invalid`;
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
      full_name: "Wedding Planner",
      business_name: `Wedding ${suffix}`,
      email,
      vertical: "events",
      vocabulary: "weddings",
      rsvp_mode: "invitations",
      timezone: "UTC",
      availability: { saturday: { enabled: true, startTime: "10:00", endTime: "23:00" } },
      setup_complete: true,
    })
    .select("id, slug")
    .single<{ id: string; slug: string }>();
  if (providerError) throw providerError;

  const serviceIds: string[] = [];
  for (const name of ["Ceremony", "Brunch"]) {
    const { data: service, error: serviceError } = await admin
      .from("services")
      .insert({
        provider_id: provider.id,
        name,
        booking_type: "appointment",
        duration_minutes: 120,
        description: name,
      })
      .select("id")
      .single<{ id: string }>();
    if (serviceError) throw serviceError;
    serviceIds.push(service.id);
  }

  return {
    providerId: provider.id,
    slug: provider.slug,
    serviceIds,
    client: await signedInClient(email),
  };
}

async function addInvitation(
  providerId: string,
  options: { seatLimit?: number; eventIds?: string[]; guests?: string[] } = {},
) {
  const token = `test-token-${randomSuffix()}-${randomSuffix()}-${randomSuffix()}`;
  const { data, error } = await admin
    .from("invitations")
    .insert({
      provider_id: providerId,
      display_name: "Familia Ortiz",
      seat_limit: options.seatLimit ?? 2,
      token,
      token_hash: Buffer.from(token).toString("hex").padEnd(64, "0").slice(0, 64),
    })
    .select("id")
    .single<{ id: string }>();
  if (error) throw error;

  for (const serviceId of options.eventIds ?? []) {
    const { error: eventError } = await admin
      .from("invitation_events")
      .insert({ invitation_id: data.id, service_id: serviceId });
    if (eventError) throw eventError;
  }

  const guestIds: string[] = [];
  for (const [position, name] of (options.guests ?? []).entries()) {
    const { data: guest, error: guestError } = await admin
      .from("invitation_guests")
      .insert({ invitation_id: data.id, position, name })
      .select("id")
      .single<{ id: string }>();
    if (guestError) throw guestError;
    guestIds.push(guest.id);
  }

  return { invitationId: data.id, guestIds };
}

afterAll(async () => {
  for (const userId of createdUsers) {
    await admin.from("providers").delete().eq("owner_user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
});

describe("invitation tables", () => {
  it("keeps a stranger out of another owner's guest list", async () => {
    const owner = await seedWedding("owner");
    const stranger = await seedWedding("stranger");
    await addInvitation(owner.providerId, { eventIds: owner.serviceIds, guests: ["Ana"] });

    const ownRead = await owner.client.from("invitations").select("id");
    expect(ownRead.error).toBeNull();
    expect(ownRead.data).toHaveLength(1);

    const strangerRead = await stranger.client
      .from("invitations")
      .select("id")
      .eq("provider_id", owner.providerId);
    expect(strangerRead.error).toBeNull();
    expect(strangerRead.data).toEqual([]);

    const guestsRead = await stranger.client.from("invitation_guests").select("id");
    expect(guestsRead.data).toEqual([]);

    const strangerInsert = await stranger.client.from("invitations").insert({
      provider_id: owner.providerId,
      display_name: "Intruder",
      seat_limit: 1,
      token: `intruder-${randomSuffix()}`,
      token_hash: "f".repeat(64),
    });
    expect(strangerInsert.error).not.toBeNull();

    const anonRead = await localAnonClient().from("invitations").select("id");
    expect(anonRead.data ?? []).toEqual([]);
  });

  it("refuses more guests than the seat limit", async () => {
    const wedding = await seedWedding("limit");
    const { invitationId } = await addInvitation(wedding.providerId, {
      seatLimit: 2,
      guests: ["Ana", "Luis"],
    });

    const third = await wedding.client
      .from("invitation_guests")
      .insert({ invitation_id: invitationId, position: 2, name: "Extra" });
    expect(third.error?.message).toContain("seat_limit_exceeded");
  });

  it("refuses a seat limit below the named guests", async () => {
    const wedding = await seedWedding("lower");
    const { invitationId } = await addInvitation(wedding.providerId, {
      seatLimit: 3,
      guests: ["Ana", "Luis", "Sofía"],
    });

    const lowered = await wedding.client
      .from("invitations")
      .update({ seat_limit: 2 })
      .eq("id", invitationId);
    expect(lowered.error?.message).toContain("seat_limit_below_guests");
  });

  it("refuses an event from another page", async () => {
    const wedding = await seedWedding("foreign");
    const other = await seedWedding("other");
    const { invitationId } = await addInvitation(wedding.providerId);

    const foreign = await admin
      .from("invitation_events")
      .insert({ invitation_id: invitationId, service_id: other.serviceIds[0] });
    expect(foreign.error?.message).toContain("service_not_on_this_page");
  });

  it("refuses attendance for an event the invitation is not invited to", async () => {
    const wedding = await seedWedding("uninvited");
    const { guestIds } = await addInvitation(wedding.providerId, {
      eventIds: [wedding.serviceIds[0]],
      guests: ["Ana"],
    });

    const invited = await wedding.client
      .from("guest_attendance")
      .insert({ guest_id: guestIds[0], service_id: wedding.serviceIds[0], attending: true });
    expect(invited.error).toBeNull();

    const uninvited = await wedding.client
      .from("guest_attendance")
      .insert({ guest_id: guestIds[0], service_id: wedding.serviceIds[1], attending: true });
    expect(uninvited.error?.message).toContain("service_not_invited");
  });

  it("drops attendance when the event is deleted", async () => {
    const wedding = await seedWedding("cascade");
    const { invitationId, guestIds } = await addInvitation(wedding.providerId, {
      eventIds: wedding.serviceIds,
      guests: ["Ana"],
    });
    await admin
      .from("guest_attendance")
      .insert({ guest_id: guestIds[0], service_id: wedding.serviceIds[1], attending: true });

    const { error } = await admin.from("services").delete().eq("id", wedding.serviceIds[1]);
    expect(error).toBeNull();

    const attendance = await admin.from("guest_attendance").select("service_id").eq("guest_id", guestIds[0]);
    expect(attendance.data).toEqual([]);

    const events = await admin
      .from("invitation_events")
      .select("service_id")
      .eq("invitation_id", invitationId);
    expect(events.data).toEqual([{ service_id: wedding.serviceIds[0] }]);

    const invitation = await admin.from("invitations").select("id").eq("id", invitationId);
    expect(invitation.data).toHaveLength(1);
  });

  it("accepts the weddings word set and rejects unknown modes", async () => {
    const wedding = await seedWedding("modes");

    const words = await wedding.client
      .from("providers")
      .update({ vocabulary: "weddings", default_invitation_seats: 4 })
      .eq("id", wedding.providerId);
    expect(words.error).toBeNull();

    const unknown = await wedding.client
      .from("providers")
      .update({ rsvp_mode: "secret" })
      .eq("id", wedding.providerId);
    expect(unknown.error).not.toBeNull();

    const tooMany = await wedding.client
      .from("providers")
      .update({ default_invitation_seats: 21 })
      .eq("id", wedding.providerId);
    expect(tooMany.error).not.toBeNull();

    const publicRow = await localAnonClient()
      .from("public_providers")
      .select("rsvp_mode")
      .eq("id", wedding.providerId)
      .maybeSingle<{ rsvp_mode: string }>();
    expect(publicRow.error).toBeNull();
  });

  it("resets the mode when switching away from events", async () => {
    const wedding = await seedWedding("switch");

    const { error } = await wedding.client.rpc("switch_provider_business_type", {
      p_vertical: "professional",
      p_availability: { monday: { enabled: true, startTime: "09:00", endTime: "17:00" } },
      p_max_bookings_per_day: null,
      p_services: [
        {
          name: "Session",
          slug: "session",
          booking_type: "appointment",
          duration_minutes: 60,
          description: "A session.",
          sort_order: 0,
        },
      ],
    });
    expect(error).toBeNull();

    const { data } = await admin
      .from("providers")
      .select("rsvp_mode, vocabulary")
      .eq("id", wedding.providerId)
      .single<{ rsvp_mode: string; vocabulary: string | null }>();
    expect(data).toEqual({ rsvp_mode: "open", vocabulary: null });
  });
});

describe("invitation data layer", () => {
  it("creates, lists, edits and answers an invitation", async () => {
    const wedding = await seedWedding("layer");
    const [ceremony, brunch] = wedding.serviceIds;

    const created = await createInvitations(wedding.client, wedding.providerId, [
      { displayName: "Familia Ortiz", seatLimit: 3, eventIds: [ceremony, brunch], guestNames: ["Ana", "Luis"] },
      { displayName: "Sofía Ruiz", seatLimit: 1, eventIds: [ceremony] },
    ]);
    expect(created.map((invitation) => invitation.displayName)).toEqual(["Familia Ortiz", "Sofía Ruiz"]);
    expect(created[0].guests.map((guest) => guest.name)).toEqual(["Ana", "Luis"]);
    expect(isWellFormedInvitationToken(created[0].token)).toBe(true);

    const listed = await listInvitations(wedding.client, wedding.providerId);
    expect(listed).toHaveLength(2);
    expect(listed[0].eventIds.sort()).toEqual([ceremony, brunch].sort());

    const [ana, luis] = listed[0].guests;
    const edited = await updateInvitation(wedding.client, wedding.providerId, listed[0].id, {
      guests: [{ id: luis.id, name: "Luis Ortiz" }, { name: "" }],
      attendance: { [ceremony]: [true, true], [brunch]: [false, true] },
      markAnswered: true,
    });
    expect(edited.guests.map((guest) => guest.name)).toEqual(["Luis Ortiz", ""]);
    expect(edited.guests.some((guest) => guest.id === ana.id)).toBe(false);
    expect(edited.guests[0].attending).toEqual({ [ceremony]: true, [brunch]: false });
    expect(edited.submittedAt).not.toBeNull();

    const fewer = await updateInvitation(wedding.client, wedding.providerId, listed[0].id, {
      eventIds: [ceremony],
    });
    expect(fewer.eventIds).toEqual([ceremony]);
    expect(fewer.guests[1].attending).toEqual({ [ceremony]: true });
  });

  it("refuses to lower seats below the named guests without removing one", async () => {
    const wedding = await seedWedding("lower-layer");
    const [invitation] = await createInvitations(wedding.client, wedding.providerId, [
      { displayName: "Familia Ruiz", seatLimit: 3, eventIds: wedding.serviceIds, guestNames: ["A", "B", "C"] },
    ]);

    await expect(
      updateInvitation(wedding.client, wedding.providerId, invitation.id, { seatLimit: 2 }),
    ).rejects.toMatchObject({ status: 400 });

    const lowered = await updateInvitation(wedding.client, wedding.providerId, invitation.id, {
      seatLimit: 2,
      guests: invitation.guests.slice(0, 2).map((guest) => ({ id: guest.id, name: guest.name })),
    });
    expect(lowered.seatLimit).toBe(2);
    expect(lowered.guests).toHaveLength(2);
  });

  it("lets a household answer through its link, and only through its link", async () => {
    const wedding = await seedWedding("public");
    const [ceremony, brunch] = wedding.serviceIds;
    const [invitation] = await createInvitations(wedding.client, wedding.providerId, [
      { displayName: "Familia Paz", seatLimit: 2, eventIds: [ceremony, brunch], guestNames: ["Marta"] },
    ]);
    const route = { vertical: "events" as const, providerSlug: wedding.slug, token: invitation.token };

    const found = await getPublicInvitation(admin, route);
    expect(found?.invitation.displayName).toBe("Familia Paz");
    expect(found?.invitation.submittedAt).toBeNull();

    const saved = await submitPublicRsvp(admin, route, {
      guests: [{ id: invitation.guests[0].id, name: "Marta Paz" }, { name: "" }],
      attendance: { [ceremony]: [true, true], [brunch]: [false, false] },
      contactEmail: "marta@example.invalid",
    });
    expect(saved.submittedAt).not.toBeNull();
    expect(saved.guests.map((guest) => guest.attending[ceremony])).toEqual([true, true]);
    expect(saved.contactEmail).toBe("marta@example.invalid");

    await expect(submitPublicRsvp(admin, route, { guests: [], attendance: {} })).rejects.toMatchObject({
      status: 429,
    });

    await expect(
      submitPublicRsvp(admin, { ...route, token: invitation.token.replace(/.$/, "x") }, { guests: [] }),
    ).rejects.toMatchObject({ status: 404 });

    const renewed = await regenerateInvitationToken(wedding.client, wedding.providerId, invitation.id);
    expect(renewed.token).not.toBe(invitation.token);
    expect(await getPublicInvitation(admin, route)).toBeNull();
    expect(await getPublicInvitation(admin, { ...route, token: renewed.token })).not.toBeNull();
  });

  it("refuses too many guests from a household", async () => {
    const wedding = await seedWedding("public-limit");
    const [invitation] = await createInvitations(wedding.client, wedding.providerId, [
      { displayName: "Familia Sol", seatLimit: 1, eventIds: wedding.serviceIds },
    ]);
    const route = { vertical: "events" as const, providerSlug: wedding.slug, token: invitation.token };

    await expect(
      submitPublicRsvp(admin, route, { guests: [{ name: "A" }, { name: "B" }], attendance: {} }),
    ).rejects.toMatchObject({ status: 400 });
    expect((await getPublicInvitation(admin, route))?.invitation.guests).toEqual([]);
  });

  it("hides invitations of a page that is not in invitation mode", async () => {
    const wedding = await seedWedding("open-mode");
    const [invitation] = await createInvitations(wedding.client, wedding.providerId, [
      { displayName: "Familia Luna", seatLimit: 2, eventIds: wedding.serviceIds },
    ]);
    await admin.from("providers").update({ rsvp_mode: "open" }).eq("id", wedding.providerId);

    expect(
      await getPublicInvitation(admin, { vertical: "events", providerSlug: wedding.slug, token: invitation.token }),
    ).toBeNull();
  });

  it("deletes one invitation or the whole list", async () => {
    const wedding = await seedWedding("delete");
    const created = await createInvitations(wedding.client, wedding.providerId, [
      { displayName: "Uno", seatLimit: 1, eventIds: [] },
      { displayName: "Dos", seatLimit: 1, eventIds: [] },
      { displayName: "Tres", seatLimit: 1, eventIds: [] },
    ]);

    expect(await deleteInvitation(wedding.client, wedding.providerId, created[0].id)).toBe(true);
    expect(await deleteInvitation(wedding.client, wedding.providerId, created[0].id)).toBe(false);
    expect(await deleteAllInvitations(wedding.client, wedding.providerId)).toBe(2);
    expect(await listInvitations(wedding.client, wedding.providerId)).toEqual([]);
  });
});
