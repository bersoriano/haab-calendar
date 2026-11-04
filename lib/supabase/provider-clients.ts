import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProviderClient } from "@/lib/provider-clients";

/** PostgREST returns at most this many rows per request by default. */
const PAGE_SIZE = 1000;

const CLIENT_SELECT =
  "id, client_name, client_email, client_phone, first_booked_at, last_booked_at, booking_count";

type ClientRow = {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  first_booked_at: string;
  last_booked_at: string;
  booking_count: number;
};

export type OwnerProvider = { id: string; timezone: string | null };

/** The signed-in owner's provider. Found from the session, never the request. */
export async function getOwnerProvider(supabase: SupabaseClient, ownerUserId: string) {
  const { data, error } = await supabase
    .from("providers")
    .select("id, timezone")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle<OwnerProvider>();

  if (error) throw error;
  return data;
}

/**
 * Every client, newest booking first.
 *
 * Paged by id rather than by offset: a booking arriving mid-read moves a row in
 * `last_booked_at` order, which offsets would turn into a repeated or missing
 * person in the export.
 */
export async function listProviderClients(
  supabase: SupabaseClient,
  providerId: string,
): Promise<ProviderClient[]> {
  const clients: ProviderClient[] = [];
  let lastId: string | undefined;

  while (true) {
    let query = supabase
      .from("provider_clients")
      .select(CLIENT_SELECT)
      .eq("provider_id", providerId)
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);

    if (lastId) query = query.gt("id", lastId);

    const { data, error } = await query.returns<ClientRow[]>();
    if (error) throw error;

    const rows = data ?? [];
    for (const row of rows) {
      clients.push({
        id: row.id,
        name: row.client_name,
        email: row.client_email,
        phone: row.client_phone,
        firstBookedAt: row.first_booked_at,
        lastBookedAt: row.last_booked_at,
        bookingCount: row.booking_count,
      });
    }

    if (rows.length < PAGE_SIZE) break;
    lastId = rows[rows.length - 1].id;
  }

  return clients.sort((a, b) => b.lastBookedAt.localeCompare(a.lastBookedAt));
}

/** False when no such record belongs to this provider. */
export async function deleteProviderClient(
  supabase: SupabaseClient,
  providerId: string,
  clientId: string,
) {
  const { data, error } = await supabase
    .from("provider_clients")
    .delete()
    .eq("provider_id", providerId)
    .eq("id", clientId)
    .select("id");

  if (error) throw error;
  return (data ?? []).length > 0;
}
