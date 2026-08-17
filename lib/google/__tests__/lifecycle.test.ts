import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const entitlements = vi.hoisted(() => ({ entitled: true, throws: false }));

vi.mock("@/lib/entitlements/server", () => ({
  hasEntitlement: async () => {
    if (entitlements.throws) throw new Error("entitlement read failed");
    return entitlements.entitled;
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("Lifecycle tests must inject a client.");
  },
}));

import { syncGoogleConnectionToEntitlement } from "@/lib/google/lifecycle";

const PROVIDER = "00000000-0000-4000-8000-000000000001";

function makeClient(connection: Record<string, unknown> | null) {
  const writes: Array<{ table: string; op: string; payload: unknown }> = [];

  const client = {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: connection, error: null }),
        update: (payload: unknown) => {
          writes.push({ table, op: "update", payload });
          return query;
        },
        upsert: async (payload: unknown) => {
          writes.push({ table, op: "upsert", payload });
          return { error: null };
        },
      };
      return query;
    },
  };

  return { client: client as unknown as SupabaseClient, writes };
}

const connected = {
  id: "conn-1",
  provider_id: PROVIDER,
  connection_generation: "gen-1",
  target_calendar_id: "cal-1",
  status: "connected",
};

const paused = { ...connected, status: "paused" };

beforeEach(() => {
  entitlements.entitled = true;
  entitlements.throws = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("losing the entitlement", () => {
  it("pauses the connection rather than deleting the grant", async () => {
    entitlements.entitled = false;
    const supabase = makeClient(connected);

    const result = await syncGoogleConnectionToEntitlement({
      providerId: PROVIDER,
      client: supabase.client,
    });

    // The grant is the provider's. Forcing a reconnect because a subscription
    // lapsed for a week would be a punishment, not a safety measure.
    expect(result).toEqual({ changed: true, status: "paused" });
    expect(supabase.writes[0].payload).toMatchObject({
      status: "paused",
      last_error_code: "not_entitled",
    });
  });

  it("does nothing to an already paused connection", async () => {
    entitlements.entitled = false;
    const supabase = makeClient(paused);

    const result = await syncGoogleConnectionToEntitlement({
      providerId: PROVIDER,
      client: supabase.client,
    });

    expect(result).toEqual({ changed: false, reason: "already_paused" });
    expect(supabase.writes).toHaveLength(0);
  });
});

describe("regaining the entitlement", () => {
  it("resumes the connection and queues a full reconciliation", async () => {
    const supabase = makeClient(paused);

    const result = await syncGoogleConnectionToEntitlement({
      providerId: PROVIDER,
      client: supabase.client,
    });

    expect(result).toEqual({ changed: true, status: "connected" });
    expect(supabase.writes[0].payload).toMatchObject({ status: "connected" });

    // Bookings changed while it was paused, and those outbox events are gone.
    // Reconciliation replays the current state instead of the lost history.
    const queued = supabase.writes.find((write) => write.op === "upsert");
    expect(queued?.table).toBe("provider_google_reconciliation_jobs");
    expect(queued?.payload).toMatchObject({
      provider_id: PROVIDER,
      connection_generation: "gen-1",
      status: "pending",
    });
  });

  it("resumes without reconciling when no calendar was ever chosen", async () => {
    const supabase = makeClient({ ...paused, target_calendar_id: null });

    await syncGoogleConnectionToEntitlement({
      providerId: PROVIDER,
      client: supabase.client,
    });

    expect(supabase.writes.some((write) => write.op === "upsert")).toBe(false);
  });

  it("leaves an already active connection alone", async () => {
    const supabase = makeClient(connected);

    const result = await syncGoogleConnectionToEntitlement({
      providerId: PROVIDER,
      client: supabase.client,
    });

    expect(result).toEqual({ changed: false, reason: "already_active" });
    expect(supabase.writes).toHaveLength(0);
  });
});

describe("edges", () => {
  it("never resumes when the entitlement could not be resolved", async () => {
    entitlements.throws = true;
    const supabase = makeClient(paused);

    const result = await syncGoogleConnectionToEntitlement({
      providerId: PROVIDER,
      client: supabase.client,
    });

    // Unknown is not "yes". Resuming here would be granting access on a failure.
    expect(result).toEqual({ changed: false, reason: "entitlement_unresolved" });
    expect(supabase.writes).toHaveLength(0);
  });

  it("never pauses when the entitlement could not be resolved", async () => {
    entitlements.throws = true;
    const supabase = makeClient(connected);

    await syncGoogleConnectionToEntitlement({
      providerId: PROVIDER,
      client: supabase.client,
    });

    expect(supabase.writes).toHaveLength(0);
  });

  it("has nothing to do for a provider with no connection", async () => {
    const supabase = makeClient(null);

    await expect(
      syncGoogleConnectionToEntitlement({
        providerId: PROVIDER,
        client: supabase.client,
      }),
    ).resolves.toEqual({ changed: false, reason: "no_connection" });
  });

  it("does not resurrect a connection the provider disconnected", async () => {
    const supabase = makeClient({ ...connected, status: "disconnected" });

    const result = await syncGoogleConnectionToEntitlement({
      providerId: PROVIDER,
      client: supabase.client,
    });

    expect(result).toEqual({ changed: false, reason: "disconnected" });
    expect(supabase.writes).toHaveLength(0);
  });

  it("does not resume a connection that needs reauthorization", async () => {
    // A grant that expired needs the provider, not an entitlement change.
    const supabase = makeClient({ ...connected, status: "needs_reauth" });

    const result = await syncGoogleConnectionToEntitlement({
      providerId: PROVIDER,
      client: supabase.client,
    });

    expect(result).toEqual({ changed: false, reason: "already_active" });
  });
});
