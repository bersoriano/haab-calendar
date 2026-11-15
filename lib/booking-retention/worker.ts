import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type BookingRetentionSummary = {
  deletedBookings: number;
  hasMore: boolean;
  /** Guest and household answers cleared a month after their event. */
  clearedInvitationAnswers: number;
};

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
  // RSVP answers (diet notes among them) go a month after the page's last event.
  const { data: cleared, error: answersError } = await admin.rpc("purge_invitation_answers");
  if (answersError) throw answersError;
  if (!Number.isInteger(cleared) || cleared < 0) throw new Error("Invalid invitation answers cleanup response.");

  return { deletedBookings: data.deletedBookings, hasMore: data.hasMore, clearedInvitationAnswers: cleared };
}
