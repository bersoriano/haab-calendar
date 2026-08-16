import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Clients for the database integration tests, and the guard that keeps them
 * pointed at a local database.
 *
 * These tests write and delete rows. Running them against a shared or hosted
 * project would destroy real data, so the host is checked before anything is
 * created and the suite refuses to run rather than asking nicely.
 */

const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "host.docker.internal",
  "kong",
]);

export class RemoteDatabaseRefusedError extends Error {
  constructor(host: string) {
    // The host only — never the URL with its key, and never the key itself.
    super(
      `Refusing to run destructive tests against a non-local Supabase host: ${host}`,
    );
    this.name = "RemoteDatabaseRefusedError";
  }
}

export function assertLocalSupabase(url: string | undefined): string {
  if (!url) {
    throw new Error(
      "SUPABASE_URL is not set. Start the local stack with `npx supabase start`.",
    );
  }

  const host = new URL(url).hostname;

  if (!LOCAL_HOSTS.has(host)) {
    throw new RemoteDatabaseRefusedError(host);
  }

  return url;
}

export function localAdminClient(): SupabaseClient {
  const url = assertLocalSupabase(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set for the local stack.");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function localAnonClient(): SupabaseClient {
  const url = assertLocalSupabase(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const key =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!key) {
    throw new Error("SUPABASE_ANON_KEY is not set for the local stack.");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
