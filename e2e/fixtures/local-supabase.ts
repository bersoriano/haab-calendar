import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "host.docker.internal"]);

/**
 * The service-role client for the local stack, and only the local stack:
 * everything that uses it writes, so it refuses any other host. There is
 * deliberately no HTTP seed endpoint: a route that could reset state would
 * be reachable by anyone who found it.
 */
export function localAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "E2E seeding needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the local stack.",
    );
  }

  const host = new URL(url).hostname;

  if (!LOCAL_HOSTS.has(host)) {
    // The host only. Never the URL with a key in it, and never the key.
    throw new Error(`Refusing to seed E2E data against a non-local Supabase host: ${host}`);
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
