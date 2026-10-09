import { notFound } from "next/navigation";

import { SuperAdminAccessError } from "@/lib/supabase/publication";

/**
 * Runs a super-admin read; anyone who is not a super admin gets the ordinary
 * not-found page rather than a hint that the area exists.
 */
export async function loadOrNotFound<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof SuperAdminAccessError) {
      notFound();
    }

    throw error;
  }
}
