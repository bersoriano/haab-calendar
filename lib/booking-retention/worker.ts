import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type BookingRetentionSummary = { deletedBookings: number; hasMore: boolean };

/** Policy is resolved inside the deletion transaction, never from client state. */
export async function runBookingRetentionWorker(client?: SupabaseClient): Promise<BookingRetentionSummary> {
  const admin = client ?? createAdminClient();
  const { data, error } = await admin.rpc("purge_expired_bookings", { p_batch_size: 500 });
  if (error) throw error;

  if (!data || typeof data !== "object" ||
    !Number.isInteger(data.deletedBookings) || data.deletedBookings < 0 || data.deletedBookings > 500 ||
    typeof data.hasMore !== "boolean") {
    throw new Error("Invalid booking cleanup response.");
  }
  return { deletedBookings: data.deletedBookings, hasMore: data.hasMore };
}
