import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/lib/supabase/config";

/**
 * Creates a cookie-free client for published, anonymous Data API reads.
 *
 * Public booking pages must resolve with the `anon` Postgres role even when
 * the incoming Next.js request carries a signed-in user's Supabase cookies.
 * Using the base client keeps those request cookies out of this client while
 * the publishable key and the public views continue to enforce RLS.
 */
export function createPublicClient() {
  const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig();

  return createSupabaseClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
