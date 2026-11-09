import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { TABLE_NAME_MAX_LENGTH, TABLE_SEAT_COUNT_MAX, type SeatingTable } from "@/lib/seating";
import { InvitationWriteError } from "@/lib/supabase/invitations";

/**
 * Tables, seats and publishing for the signed-in owner's page. Every call
 * runs as the owner, so RLS keeps it to their own page; the guest_attendance
 * trigger keeps seats to attending people at a table of the same event.
 */

export const MAX_TABLES_PER_EVENT = 100;

type TableRow = { id: string; service_id: string; name: string; seat_count: number | null; position: number };

function toTable(row: TableRow): SeatingTable {
  return { id: row.id, serviceId: row.service_id, name: row.name, seatCount: row.seat_count, position: row.position };
}

function fail(error: unknown, fallback: string): never {
  const message = typeof error === "object" && error && "message" in error ? String(error.message) : "";
  if (message.includes("table_not_at_this_event") || message.includes("service_not_on_this_page")) {
    throw new InvitationWriteError("That table is not at this event.", 400, error);
  }
  throw new InvitationWriteError(fallback, 500, error);
}

function cleanTable(input: { name?: unknown; seatCount?: unknown }) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > TABLE_NAME_MAX_LENGTH) {
    throw new InvitationWriteError("Give the table a name of up to 60 characters.", 400);
  }
  const seatCount =
    input.seatCount === null || input.seatCount === undefined || input.seatCount === "" ? null : Number(input.seatCount);
  if (seatCount !== null && (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > TABLE_SEAT_COUNT_MAX)) {
    throw new InvitationWriteError("Seats at a table must be a whole number from 1 to 100.", 400);
  }
  return { name, seatCount };
}

export async function listSeatingTables(supabase: SupabaseClient, providerId: string): Promise<SeatingTable[]> {
  const { data, error } = await supabase
    .from("seating_tables")
    .select("id, service_id, name, seat_count, position")
    .eq("provider_id", providerId)
    .order("position", { ascending: true })
    .order("name", { ascending: true })
    .returns<TableRow[]>();
  if (error) fail(error, "Could not load the tables.");
  return (data ?? []).map(toTable);
}

export async function createSeatingTable(
  supabase: SupabaseClient,
  providerId: string,
  input: { serviceId?: unknown; name?: unknown; seatCount?: unknown },
): Promise<SeatingTable> {
  const { name, seatCount } = cleanTable(input);
  const serviceId = typeof input.serviceId === "string" ? input.serviceId : "";

  const { data: existing, error: countError } = await supabase
    .from("seating_tables")
    .select("position")
    .eq("provider_id", providerId)
    .eq("service_id", serviceId)
    .returns<{ position: number }[]>();
  if (countError) fail(countError, "Could not add that table.");
  if ((existing ?? []).length >= MAX_TABLES_PER_EVENT) {
    throw new InvitationWriteError("An event can have up to 100 tables.", 400);
  }

  const position = Math.max(-1, ...(existing ?? []).map((row) => row.position)) + 1;
  const { data, error } = await supabase
    .from("seating_tables")
    .insert({ provider_id: providerId, service_id: serviceId, name, seat_count: seatCount, position })
    .select("id, service_id, name, seat_count, position")
    .single<TableRow>();
  if (error || !data) fail(error, "Could not add that table.");
  return toTable(data);
}

export async function updateSeatingTable(
  supabase: SupabaseClient,
  providerId: string,
  tableId: string,
  input: { name?: unknown; seatCount?: unknown },
): Promise<SeatingTable> {
  const { name, seatCount } = cleanTable(input);
  const { data, error } = await supabase
    .from("seating_tables")
    .update({ name, seat_count: seatCount })
    .eq("provider_id", providerId)
    .eq("id", tableId)
    .select("id, service_id, name, seat_count, position")
    .maybeSingle<TableRow>();
  if (error) fail(error, "Could not save that table.");
  if (!data) throw new InvitationWriteError("That table was not found.", 404);
  return toTable(data);
}

/** Removes a table; the people at it go back to "not seated". */
export async function deleteSeatingTable(supabase: SupabaseClient, providerId: string, tableId: string) {
  const { data, error } = await supabase
    .from("seating_tables")
    .delete()
    .eq("provider_id", providerId)
    .eq("id", tableId)
    .select("id");
  if (error) fail(error, "Could not delete that table.");
  return (data ?? []).length > 0;
}

/**
 * Seats these guests at a table of one event, or frees their seats with a null
 * table. Only guests of this page who attend the event are moved; returns how
 * many were.
 */
export async function assignSeats(
  supabase: SupabaseClient,
  providerId: string,
  input: { serviceId?: unknown; guestIds?: unknown; tableId?: unknown },
): Promise<number> {
  const serviceId = typeof input.serviceId === "string" ? input.serviceId : "";
  const tableId = typeof input.tableId === "string" && input.tableId ? input.tableId : null;
  const guestIds = Array.isArray(input.guestIds)
    ? [...new Set(input.guestIds.filter((id): id is string => typeof id === "string"))]
    : [];
  if (!serviceId || guestIds.length === 0 || guestIds.length > 500) {
    throw new InvitationWriteError("Choose who to seat.", 400);
  }

  // The guests must be this page's; RLS already hides anyone else's.
  const { data: own, error: ownError } = await supabase
    .from("invitation_guests")
    .select("id, invitations!inner(provider_id)")
    .in("id", guestIds)
    .eq("invitations.provider_id", providerId)
    .returns<{ id: string }[]>();
  if (ownError) fail(ownError, "Could not seat those guests.");
  if ((own ?? []).length !== guestIds.length) {
    throw new InvitationWriteError("Some of those guests are not on this guest list.", 400);
  }

  const { data, error } = await supabase
    .from("guest_attendance")
    .update({ table_id: tableId })
    .eq("service_id", serviceId)
    .eq("attending", true)
    .in("guest_id", guestIds)
    .select("guest_id");
  if (error) fail(error, "Could not seat those guests.");
  return (data ?? []).length;
}

export type SeatingState = { published: boolean; publishedAt: string | null };

export async function getSeatingState(supabase: SupabaseClient, providerId: string): Promise<SeatingState> {
  const { data, error } = await supabase
    .from("providers")
    .select("seating_published, seating_published_at")
    .eq("id", providerId)
    .single<{ seating_published: boolean; seating_published_at: string | null }>();
  if (error) fail(error, "Could not load the seating.");
  return { published: data.seating_published, publishedAt: data.seating_published_at };
}

/** Shows (or hides) every household its table. Publishing again restamps the date. */
export async function setSeatingPublished(
  supabase: SupabaseClient,
  providerId: string,
  published: boolean,
): Promise<SeatingState> {
  const { data, error } = await supabase
    .from("providers")
    .update(
      published
        ? { seating_published: true, seating_published_at: new Date().toISOString() }
        : { seating_published: false },
    )
    .eq("id", providerId)
    .select("seating_published, seating_published_at")
    .single<{ seating_published: boolean; seating_published_at: string | null }>();
  if (error) fail(error, "Could not change the seating.");
  return { published: data.seating_published, publishedAt: data.seating_published_at };
}
