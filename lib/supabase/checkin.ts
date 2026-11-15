import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { buildDoorList, type DoorList } from "@/lib/door";
import { hashInvitationToken } from "@/lib/invitation-tokens";
import type { Lang } from "@/lib/types";
import { InvitationWriteError, listInvitations } from "@/lib/supabase/invitations";
import { listSeatingTables } from "@/lib/supabase/seating";

/** A check-in may be stamped this far ahead of the server's clock (phone clocks drift). */
const FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_CHECKINS_PER_REQUEST = 500;

/** One event's door list for the signed-in owner's page. Null if the event is not theirs. */
export async function getDoorList(
  supabase: SupabaseClient,
  providerId: string,
  serviceId: string,
  lang: Lang,
): Promise<DoorList | null> {
  const { data: service, error } = await supabase
    .from("services")
    .select("id, name")
    .eq("provider_id", providerId)
    .eq("id", serviceId)
    .maybeSingle<{ id: string; name: string }>();
  if (error || !service) return null;

  const [invitations, tables] = await Promise.all([
    listInvitations(supabase, providerId),
    listSeatingTables(supabase, providerId),
  ]);
  return buildDoorList({
    invitations,
    tables,
    serviceId: service.id,
    serviceName: service.name,
    lang,
    hashToken: hashInvitationToken,
  });
}

export type CheckinRequest = { guestId: string; at: string | null };

/**
 * Records arrivals at one event. A time keeps the earliest one already there
 * (two door phones never conflict); null undoes a check-in. Guests of other
 * pages, or not attending this event, are skipped. Returns how many changed.
 */
export async function recordCheckins(
  supabase: SupabaseClient,
  providerId: string,
  input: { serviceId?: unknown; entries?: unknown },
  now = new Date(),
): Promise<number> {
  const serviceId = typeof input.serviceId === "string" ? input.serviceId : "";
  const entries = Array.isArray(input.entries) ? input.entries : [];
  if (!serviceId || entries.length === 0 || entries.length > MAX_CHECKINS_PER_REQUEST) {
    throw new InvitationWriteError("Nothing to check in.", 400);
  }

  const cleaned: CheckinRequest[] = [];
  for (const raw of entries) {
    const entry = raw as Partial<CheckinRequest>;
    if (typeof entry?.guestId !== "string") throw new InvitationWriteError("Nothing to check in.", 400);
    if (entry.at === null) {
      cleaned.push({ guestId: entry.guestId, at: null });
      continue;
    }
    const time = typeof entry.at === "string" ? Date.parse(entry.at) : NaN;
    if (!Number.isFinite(time) || time > now.getTime() + FUTURE_SKEW_MS) {
      throw new InvitationWriteError("That check-in time is not valid.", 400);
    }
    cleaned.push({ guestId: entry.guestId, at: new Date(time).toISOString() });
  }

  // Only this page's guests; RLS hides anyone else's, this makes it explicit.
  const ids = [...new Set(cleaned.map((entry) => entry.guestId))];
  const { data: own, error: ownError } = await supabase
    .from("invitation_guests")
    .select("id, invitations!inner(provider_id)")
    .in("id", ids)
    .eq("invitations.provider_id", providerId)
    .returns<{ id: string }[]>();
  if (ownError) throw new InvitationWriteError("Could not check those guests in.", 500, ownError);
  const ownIds = new Set((own ?? []).map((row) => row.id));

  const { data: rows, error: rowsError } = await supabase
    .from("guest_attendance")
    .select("guest_id, checked_in_at")
    .eq("service_id", serviceId)
    .eq("attending", true)
    .in("guest_id", [...ownIds])
    .returns<{ guest_id: string; checked_in_at: string | null }[]>();
  if (rowsError) throw new InvitationWriteError("Could not check those guests in.", 500, rowsError);
  const current = new Map((rows ?? []).map((row) => [row.guest_id, row.checked_in_at]));

  let changed = 0;
  for (const entry of cleaned) {
    if (!current.has(entry.guestId)) continue;
    const existing = current.get(entry.guestId) ?? null;
    // Compared as times: the database writes "+00:00" where a phone sends "Z".
    const keepExisting = existing !== null && entry.at !== null && Date.parse(existing) <= Date.parse(entry.at);
    if (keepExisting || (entry.at === null && existing === null)) continue;
    const next = entry.at;

    const { error } = await supabase
      .from("guest_attendance")
      .update({ checked_in_at: next })
      .eq("guest_id", entry.guestId)
      .eq("service_id", serviceId);
    if (error) throw new InvitationWriteError("Could not check those guests in.", 500, error);
    current.set(entry.guestId, next);
    changed += 1;
  }
  return changed;
}
