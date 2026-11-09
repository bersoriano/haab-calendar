import type { SupabaseClient } from "@supabase/supabase-js";

import { generateInvitationToken, hashInvitationToken } from "@/lib/invitation-tokens";
import {
  CONTACT_PHONE_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  GUEST_NAME_MAX_LENGTH,
  INVITATION_NOTES_MAX_LENGTH,
  isValidContactEmail,
  isWellFormedInvitationToken,
  validateRsvpSubmission,
  type Invitation,
  type InvitationGuest,
  type RsvpRejection,
} from "@/lib/invitations";
import { isRsvpOpen, parseRsvpDeadline } from "@/lib/rsvp-deadline";
import { INVITATION_SEAT_LIMIT_MAX } from "@/lib/rsvp-mode";
import { isUnsetTimeZone, normalizeTimeZone } from "@/lib/timezone";
import { getPublishedProvider, PublicBookingWriteError } from "@/lib/supabase/bookings";
import type { VerticalId } from "@/lib/types";

/**
 * Reads and writes for invitation-only RSVPs. Owner calls pass the signed-in
 * client, so RLS scopes them to the owner's page; public calls pass the admin
 * client and are scoped by the invitation's token hash. The database triggers
 * (20261108120000) still guard the seat limit and the events an answer names.
 */

export class InvitationWriteError extends Error {
  constructor(
    public userMessage: string,
    public status: number,
    public cause?: unknown,
  ) {
    super(userMessage);
    this.name = "InvitationWriteError";
  }
}

export const MAX_INVITATIONS_PER_REQUEST = 500;
/** A household's second submit inside this window is refused as a double click or a script. */
const RESUBMIT_COOLDOWN_MS = 2_000;

const INVITATION_SELECT =
  "id, provider_id, display_name, contact_phone, contact_email, seat_limit, token, notes, submitted_at, last_contacted_at, created_at, updated_at, invitation_events(service_id), invitation_guests(id, name, position, guest_attendance(service_id, attending))";

type InvitationRow = {
  id: string;
  provider_id: string;
  display_name: string;
  contact_phone: string;
  contact_email: string;
  seat_limit: number;
  token: string;
  notes: string;
  submitted_at: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
  invitation_events: { service_id: string }[] | null;
  invitation_guests:
    | { id: string; name: string; position: number; guest_attendance: { service_id: string; attending: boolean }[] | null }[]
    | null;
};

function toInvitation(row: InvitationRow): Invitation {
  const guests: InvitationGuest[] = (row.invitation_guests ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((guest) => ({
      id: guest.id,
      name: guest.name,
      position: guest.position,
      attending: Object.fromEntries(
        (guest.guest_attendance ?? []).map((answer) => [answer.service_id, answer.attending]),
      ),
    }));

  return {
    id: row.id,
    displayName: row.display_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    seatLimit: row.seat_limit,
    token: row.token,
    notes: row.notes,
    eventIds: (row.invitation_events ?? []).map((event) => event.service_id),
    guests,
    submittedAt: row.submitted_at,
    lastContactedAt: row.last_contacted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Database refusals the planner or a household can cause, in their words. */
function rethrow(error: unknown, fallback: string): never {
  const message = typeof error === "object" && error && "message" in error ? String(error.message) : "";

  if (message.includes("seat_limit_exceeded")) {
    throw new InvitationWriteError("That is more guests than this invitation has seats.", 400, error);
  }
  if (message.includes("seat_limit_below_guests")) {
    throw new InvitationWriteError("This invitation names more guests than that. Remove one first.", 400, error);
  }
  if (message.includes("service_not_on_this_page") || message.includes("service_not_invited")) {
    throw new InvitationWriteError("One of those events is not on this invitation.", 400, error);
  }
  throw new InvitationWriteError(fallback, 500, error);
}

async function readInvitation(supabase: SupabaseClient, providerId: string, invitationId: string) {
  const { data, error } = await supabase
    .from("invitations")
    .select(INVITATION_SELECT)
    .eq("provider_id", providerId)
    .eq("id", invitationId)
    .maybeSingle<InvitationRow>();

  if (error) rethrow(error, "Could not load that invitation.");
  return data ? toInvitation(data) : null;
}

const PAGE_SIZE = 500;

/** The whole guest list, oldest invitation first, ties by name. */
export async function listInvitations(supabase: SupabaseClient, providerId: string): Promise<Invitation[]> {
  const invitations: Invitation[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("invitations")
      .select(INVITATION_SELECT)
      .eq("provider_id", providerId)
      .order("created_at", { ascending: true })
      // A pasted list shares one created_at; within it, alphabetical.
      .order("display_name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
      .returns<InvitationRow[]>();

    if (error) rethrow(error, "Could not load your guest list.");
    invitations.push(...(data ?? []).map(toInvitation));
    if (!data || data.length < PAGE_SIZE) return invitations;
  }
}

export type InvitationDraft = {
  displayName: string;
  contactPhone?: string;
  contactEmail?: string;
  seatLimit: number;
  eventIds: string[];
  notes?: string;
  guestNames?: string[];
};

type CleanDraft = Required<InvitationDraft>;

function cleanDraft(draft: unknown): CleanDraft {
  const source = (typeof draft === "object" && draft ? draft : {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const displayName = text(source.displayName);
  const contactPhone = text(source.contactPhone);
  const contactEmail = text(source.contactEmail);
  const notes = text(source.notes);
  const seatLimit = Number(source.seatLimit);
  const eventIds = Array.isArray(source.eventIds)
    ? [...new Set(source.eventIds.filter((id): id is string => typeof id === "string"))]
    : [];
  const guestNames = Array.isArray(source.guestNames)
    ? source.guestNames.map(text).filter(Boolean)
    : [];

  if (!displayName || displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new InvitationWriteError("Every invitation needs a name of up to 120 characters.", 400);
  }
  if (!Number.isInteger(seatLimit) || seatLimit < 1 || seatLimit > INVITATION_SEAT_LIMIT_MAX) {
    throw new InvitationWriteError("Seats must be a whole number from 1 to 20.", 400);
  }
  if (contactPhone.length > CONTACT_PHONE_MAX_LENGTH || !isValidContactEmail(contactEmail)) {
    throw new InvitationWriteError("Check the phone number and email address.", 400);
  }
  if (notes.length > INVITATION_NOTES_MAX_LENGTH) {
    throw new InvitationWriteError("Notes can be up to 1,000 characters.", 400);
  }
  if (guestNames.length > seatLimit || guestNames.some((name) => name.length > GUEST_NAME_MAX_LENGTH)) {
    throw new InvitationWriteError("That is more guests than this invitation has seats.", 400);
  }

  return { displayName, contactPhone, contactEmail, seatLimit, eventIds, notes, guestNames };
}

/**
 * Adds invitations, each with a fresh link. A failure part-way removes the
 * invitations this call created, so a paste is all or nothing.
 */
export async function createInvitations(
  supabase: SupabaseClient,
  providerId: string,
  drafts: unknown[],
): Promise<Invitation[]> {
  if (drafts.length === 0) return [];
  if (drafts.length > MAX_INVITATIONS_PER_REQUEST) {
    throw new InvitationWriteError("Add up to 500 invitations at a time.", 400);
  }

  const clean = drafts.map(cleanDraft);
  const { data: created, error } = await supabase
    .from("invitations")
    .insert(
      clean.map((draft) => {
        const { token, tokenHash } = generateInvitationToken();
        return {
          provider_id: providerId,
          display_name: draft.displayName,
          contact_phone: draft.contactPhone,
          contact_email: draft.contactEmail,
          seat_limit: draft.seatLimit,
          notes: draft.notes,
          token,
          token_hash: tokenHash,
        };
      }),
    )
    .select("id")
    .returns<{ id: string }[]>();

  if (error || !created) rethrow(error, "Could not add those invitations.");

  const ids = created.map((row) => row.id);

  try {
    const events = clean.flatMap((draft, index) =>
      draft.eventIds.map((serviceId) => ({ invitation_id: ids[index], service_id: serviceId })),
    );
    if (events.length > 0) {
      const { error: eventsError } = await supabase.from("invitation_events").insert(events);
      if (eventsError) rethrow(eventsError, "Could not add those invitations.");
    }

    const guests = clean.flatMap((draft, index) =>
      draft.guestNames.map((name, position) => ({ invitation_id: ids[index], name, position })),
    );
    if (guests.length > 0) {
      const { error: guestsError } = await supabase.from("invitation_guests").insert(guests);
      if (guestsError) rethrow(guestsError, "Could not add those invitations.");
    }
  } catch (failure) {
    await supabase.from("invitations").delete().in("id", ids);
    throw failure;
  }

  // One insert shares one created_at, so the drafts' order comes from the ids.
  const byId = new Map((await listInvitations(supabase, providerId)).map((invitation) => [invitation.id, invitation]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

export type InvitationPatch = {
  displayName?: string;
  contactPhone?: string;
  contactEmail?: string;
  seatLimit?: number;
  eventIds?: string[];
  notes?: string;
  /** Replaces the guest list in order. A guest with an id keeps their answers. */
  guests?: { id?: string; name: string }[];
  /** service id → attending, aligned with `guests` (or the current guests). */
  attendance?: Record<string, boolean[]>;
  /** true records an answer given on the household's behalf; false clears it. */
  markAnswered?: boolean;
  /** Set when the planner sent the link by WhatsApp or email. */
  markContacted?: boolean;
};

/**
 * Writes a new guest list and answers onto an invitation. Removed guests go
 * first so a lower seat limit fits, then the invitation's own fields, then the
 * remaining names, then new guests (the insert trigger counts against the new
 * limit), then answers for every event the invitation covers.
 */
async function applyGuestsAndAnswers(
  supabase: SupabaseClient,
  current: Invitation,
  next: {
    fields: Record<string, unknown>;
    eventIds: string[];
    guests?: { id?: string; name: string }[];
    attendance?: Record<string, boolean[]>;
  },
) {
  const removedEvents = current.eventIds.filter((id) => !next.eventIds.includes(id));
  const addedEvents = next.eventIds.filter((id) => !current.eventIds.includes(id));
  const guests = next.guests ?? current.guests.map((guest) => ({ id: guest.id, name: guest.name }));
  const keptIds = new Set(guests.flatMap((guest) => (guest.id ? [guest.id] : [])));
  const removedGuests = current.guests.filter((guest) => !keptIds.has(guest.id)).map((guest) => guest.id);

  if (removedGuests.length > 0) {
    const { error } = await supabase.from("invitation_guests").delete().in("id", removedGuests);
    if (error) rethrow(error, "Could not update that invitation.");
  }

  if (removedEvents.length > 0) {
    const remaining = current.guests.filter((guest) => keptIds.has(guest.id)).map((guest) => guest.id);
    if (remaining.length > 0) {
      const { error } = await supabase
        .from("guest_attendance")
        .delete()
        .in("guest_id", remaining)
        .in("service_id", removedEvents);
      if (error) rethrow(error, "Could not update that invitation.");
    }
    const { error } = await supabase
      .from("invitation_events")
      .delete()
      .eq("invitation_id", current.id)
      .in("service_id", removedEvents);
    if (error) rethrow(error, "Could not update that invitation.");
  }

  if (Object.keys(next.fields).length > 0) {
    const { error } = await supabase.from("invitations").update(next.fields).eq("id", current.id);
    if (error) rethrow(error, "Could not update that invitation.");
  }

  if (addedEvents.length > 0) {
    const { error } = await supabase
      .from("invitation_events")
      .insert(addedEvents.map((serviceId) => ({ invitation_id: current.id, service_id: serviceId })));
    if (error) rethrow(error, "Could not update that invitation.");
  }

  const guestIds: string[] = [];
  if (next.guests) {
    for (const [position, guest] of next.guests.entries()) {
      if (guest.id) {
        const { error } = await supabase
          .from("invitation_guests")
          .update({ name: guest.name, position })
          .eq("id", guest.id)
          .eq("invitation_id", current.id);
        if (error) rethrow(error, "Could not update that invitation.");
        guestIds.push(guest.id);
      } else {
        const { data, error } = await supabase
          .from("invitation_guests")
          .insert({ invitation_id: current.id, name: guest.name, position })
          .select("id")
          .single<{ id: string }>();
        if (error || !data) rethrow(error, "Could not update that invitation.");
        guestIds.push(data.id);
      }
    }
  } else {
    guestIds.push(...current.guests.map((guest) => guest.id));
  }

  if (next.attendance) {
    const rows = next.eventIds.flatMap((serviceId) => {
      const answers = next.attendance?.[serviceId] ?? [];
      return guestIds.map((guestId, index) => ({
        guest_id: guestId,
        service_id: serviceId,
        attending: answers[index] === true,
      }));
    });
    if (rows.length > 0) {
      const { error } = await supabase
        .from("guest_attendance")
        .upsert(rows, { onConflict: "guest_id,service_id" });
      if (error) rethrow(error, "Could not save those answers.");
    }
  }
}

export async function updateInvitation(
  supabase: SupabaseClient,
  providerId: string,
  invitationId: string,
  patch: InvitationPatch,
): Promise<Invitation> {
  const current = await readInvitation(supabase, providerId, invitationId);
  if (!current) throw new InvitationWriteError("That invitation was not found.", 404);

  const merged = cleanDraft({
    displayName: patch.displayName ?? current.displayName,
    contactPhone: patch.contactPhone ?? current.contactPhone,
    contactEmail: patch.contactEmail ?? current.contactEmail,
    seatLimit: patch.seatLimit ?? current.seatLimit,
    notes: patch.notes ?? current.notes,
    eventIds: patch.eventIds ?? current.eventIds,
  });

  let guests: { id?: string; name: string }[] | undefined;
  let attendance: Record<string, boolean[]> | undefined;

  if (patch.guests !== undefined || patch.attendance !== undefined) {
    const validation = validateRsvpSubmission(
      {
        guests: patch.guests ?? current.guests.map((guest) => ({ id: guest.id, name: guest.name })),
        attendance: patch.attendance ?? {},
      },
      { seatLimit: merged.seatLimit, eventIds: merged.eventIds, guests: current.guests },
    );
    if (!validation.ok) throw new InvitationWriteError(rejectionMessage(validation.reason, merged.seatLimit), 400);
    guests = patch.guests === undefined ? undefined : validation.value.guests;
    attendance = patch.attendance === undefined ? undefined : validation.value.attendance;
  } else if (merged.seatLimit < current.guests.length) {
    throw new InvitationWriteError(
      `This invitation already names ${current.guests.length} guests. Remove one before lowering its seats.`,
      400,
    );
  }

  const fields: Record<string, unknown> = {
    display_name: merged.displayName,
    contact_phone: merged.contactPhone,
    contact_email: merged.contactEmail,
    seat_limit: merged.seatLimit,
    notes: merged.notes,
  };
  if (patch.markAnswered === true) fields.submitted_at = new Date().toISOString();
  if (patch.markAnswered === false) fields.submitted_at = null;
  if (patch.markContacted === true) fields.last_contacted_at = new Date().toISOString();

  await applyGuestsAndAnswers(supabase, current, { fields, eventIds: merged.eventIds, guests, attendance });

  const updated = await readInvitation(supabase, providerId, invitationId);
  if (!updated) throw new InvitationWriteError("That invitation was not found.", 404);
  return updated;
}

/** One invitation of the owner's page, or null. */
export async function getInvitation(supabase: SupabaseClient, providerId: string, invitationId: string) {
  return readInvitation(supabase, providerId, invitationId);
}

/** Records that the planner sent these households their link. */
export async function markContacted(supabase: SupabaseClient, providerId: string, invitationIds: string[]) {
  if (invitationIds.length === 0) return;
  const { error } = await supabase
    .from("invitations")
    .update({ last_contacted_at: new Date().toISOString() })
    .eq("provider_id", providerId)
    .in("id", invitationIds);
  if (error) rethrow(error, "Could not record that those households were contacted.");
}

export async function deleteInvitation(
  supabase: SupabaseClient,
  providerId: string,
  invitationId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("invitations")
    .delete()
    .eq("provider_id", providerId)
    .eq("id", invitationId)
    .select("id");

  if (error) rethrow(error, "Could not delete that invitation.");
  return (data ?? []).length > 0;
}

export async function deleteAllInvitations(supabase: SupabaseClient, providerId: string): Promise<number> {
  const { data, error } = await supabase.from("invitations").delete().eq("provider_id", providerId).select("id");
  if (error) rethrow(error, "Could not delete your guest list.");
  return (data ?? []).length;
}

/** A new link for an invitation. The old link stops working at once. */
export async function regenerateInvitationToken(
  supabase: SupabaseClient,
  providerId: string,
  invitationId: string,
): Promise<Invitation> {
  const { token, tokenHash } = generateInvitationToken();
  const { data, error } = await supabase
    .from("invitations")
    .update({ token, token_hash: tokenHash })
    .eq("provider_id", providerId)
    .eq("id", invitationId)
    .select("id");

  if (error) rethrow(error, "Could not make a new link.");
  if (!data || data.length === 0) throw new InvitationWriteError("That invitation was not found.", 404);

  const updated = await readInvitation(supabase, providerId, invitationId);
  if (!updated) throw new InvitationWriteError("That invitation was not found.", 404);
  return updated;
}

// ---------------------------------------------------------------------------
// The household's side

export type PublicInvitation = {
  displayName: string;
  seatLimit: number;
  guests: { id: string; name: string; attending: Record<string, boolean> }[];
  eventIds: string[];
  contactPhone: string;
  contactEmail: string;
  submittedAt: string | null;
};

type PublicRoute = { vertical: VerticalId; providerSlug: string; token: string };

function toPublicInvitation(invitation: Invitation): PublicInvitation {
  return {
    displayName: invitation.displayName,
    seatLimit: invitation.seatLimit,
    guests: invitation.guests.map((guest) => ({ id: guest.id, name: guest.name, attending: guest.attending })),
    eventIds: invitation.eventIds,
    contactPhone: invitation.contactPhone,
    contactEmail: invitation.contactEmail,
    submittedAt: invitation.submittedAt,
  };
}

/**
 * The invitation behind a link, on a published page in invitation mode. Null
 * for anything else, including a malformed or replaced token, so a stranger
 * cannot tell which part was wrong.
 */
async function findByToken(admin: SupabaseClient, route: PublicRoute) {
  if (!isWellFormedInvitationToken(route.token)) return null;

  let provider: Awaited<ReturnType<typeof getPublishedProvider>>;
  try {
    provider = await getPublishedProvider(admin, route.vertical, route.providerSlug);
  } catch (error) {
    if (error instanceof PublicBookingWriteError && error.status === 404) return null;
    rethrow(error, "Could not load this invitation.");
  }
  if (provider.rsvp_mode !== "invitations") return null;
  const deadline = parseRsvpDeadline(provider.rsvp_deadline);
  // An unchosen zone is stored as a placeholder; judge the deadline in UTC then.
  const timeZone = isUnsetTimeZone(provider.timezone) ? "UTC" : normalizeTimeZone(provider.timezone) || "UTC";

  const { data, error } = await admin
    .from("invitations")
    .select(INVITATION_SELECT)
    .eq("provider_id", provider.id)
    .eq("token_hash", hashInvitationToken(route.token))
    .maybeSingle<InvitationRow>();

  if (error) rethrow(error, "Could not load this invitation.");
  return data ? { providerId: provider.id, deadline, timeZone, invitation: toInvitation(data) } : null;
}

export async function getPublicInvitation(
  admin: SupabaseClient,
  route: PublicRoute,
): Promise<{ providerId: string; invitation: PublicInvitation } | null> {
  const found = await findByToken(admin, route);
  return found ? { providerId: found.providerId, invitation: toPublicInvitation(found.invitation) } : null;
}

const REJECTION_MESSAGES: Record<RsvpRejection, string> = {
  too_many_guests: "Your invitation is for {seats}. Remove a guest to continue.",
  unknown_event: "One of those events is not on your invitation.",
  unknown_guest: "Your invitation changed while you were answering. Reload the page and try again.",
  bad_attendance: "We could not read your answer. Reload the page and try again.",
  name_too_long: "Names can be up to 120 characters.",
  bad_contact: "Check the phone number and email address.",
};

function rejectionMessage(reason: RsvpRejection, seats: number) {
  return REJECTION_MESSAGES[reason].replace("{seats}", String(seats));
}

/** Saves a household's answer. Every submit replaces the previous one. */
export async function submitPublicRsvp(
  admin: SupabaseClient,
  route: PublicRoute,
  input: unknown,
): Promise<PublicInvitation> {
  const found = await findByToken(admin, route);
  if (!found) throw new InvitationWriteError("This invitation link is not valid.", 404);

  const { invitation } = found;
  if (!isRsvpOpen(found.deadline, found.timeZone)) {
    throw new InvitationWriteError(
      "The RSVP deadline has passed. Contact the organizer to change your answer.",
      409,
    );
  }
  if (invitation.submittedAt && Date.now() - Date.parse(invitation.submittedAt) < RESUBMIT_COOLDOWN_MS) {
    throw new InvitationWriteError("We just saved your answer. Wait a moment before sending it again.", 429);
  }

  const validation = validateRsvpSubmission(input, invitation);
  if (!validation.ok) {
    throw new InvitationWriteError(rejectionMessage(validation.reason, invitation.seatLimit), 400);
  }

  const { value } = validation;
  const fields: Record<string, unknown> = { submitted_at: new Date().toISOString() };
  if (value.contactPhone !== undefined) fields.contact_phone = value.contactPhone;
  if (value.contactEmail !== undefined) fields.contact_email = value.contactEmail;

  await applyGuestsAndAnswers(admin, invitation, {
    fields,
    eventIds: invitation.eventIds,
    guests: value.guests,
    attendance: value.attendance,
  });

  const saved = await findByToken(admin, route);
  if (!saved) throw new InvitationWriteError("This invitation link is not valid.", 404);
  return toPublicInvitation(saved.invitation);
}
