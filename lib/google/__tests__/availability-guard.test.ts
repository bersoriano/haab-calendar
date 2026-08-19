import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const entitlements = vi.hoisted(() => ({ entitled: true, throws: false }));
const refresh = vi.hoisted(() => ({
  impl: vi.fn(),
}));

vi.mock("@/lib/entitlements/server", () => ({
  hasEntitlement: async () => {
    if (entitlements.throws) throw new Error("unresolvable");
    return entitlements.entitled;
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("Guard tests must inject a client.");
  },
}));

vi.mock("@/lib/google/busy-refresh", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/google/busy-refresh")>();
  return { ...actual, refreshProviderBusySnapshot: refresh.impl };
});

import { assertGoogleAvailability } from "@/lib/google/availability-guard";
import { createLogger } from "@/lib/observability/logger";

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-09-01T12:00:00.000Z");
const silent = createLogger({ sink: () => undefined });

const PROPOSED = {
  startsAt: "2026-09-01T15:00:00.000Z",
  endsAt: "2026-09-01T16:00:00.000Z",
};

type Options = {
  connection?: Record<string, unknown> | null;
  sources?: Array<Record<string, unknown>>;
  intervals?: Array<Record<string, unknown>>;
  refreshedAt?: string | null;
};

function makeClient(options: Options = {}) {
  const connection =
    options.connection === undefined
      ? { id: "conn-1", provider_id: PROVIDER, status: "connected", connection_generation: "gen-1" }
      : options.connection;

  const sources =
    options.sources ??
    [
      {
        id: "src-1",
        active_snapshot_generation: "snap-1",
        // `??` would turn an explicit null back into "now", which is exactly
        // the case these tests need to distinguish.
        last_refreshed_at:
          "refreshedAt" in options ? options.refreshedAt : NOW.toISOString(),
      },
    ];

  const client = {
    from: (table: string) => {
      if (table === "provider_google_calendar_connections") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({ data: connection, error: null }),
        };
        return query;
      }

      if (table === "provider_google_calendar_busy_sources") {
        const query = {
          select: () => query,
          eq: () => query,
          returns: async () => ({ data: sources, error: null }),
        };
        return query;
      }

      if (table === "provider_google_calendar_busy_intervals") {
        const query = {
          select: () => query,
          eq: () => query,
          lt: () => query,
          gt: () => query,
          returns: async () => ({ data: options.intervals ?? [], error: null }),
        };
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return client as unknown as SupabaseClient;
}

const busyRow = {
  starts_at: "2026-09-01T15:30:00.000Z",
  ends_at: "2026-09-01T16:30:00.000Z",
  snapshot_generation: "snap-1",
  busy_source_id: "src-1",
};

function guard(client: SupabaseClient, now = NOW) {
  return assertGoogleAvailability({
    providerId: PROVIDER,
    ...PROPOSED,
    client,
    now,
    logger: silent,
  });
}

beforeEach(() => {
  entitlements.entitled = true;
  entitlements.throws = false;
  refresh.impl.mockReset();
  refresh.impl.mockResolvedValue({ refreshed: 1, intervals: 0, failedSources: 0 });
});

describe("when busy blocking is not in play", () => {
  it("allows the booking when the provider is not entitled", async () => {
    entitlements.entitled = false;

    await expect(guard(makeClient())).resolves.toEqual({
      allowed: true,
      reason: "not_enabled",
    });
  });

  it("allows the booking when there is no connection", async () => {
    await expect(guard(makeClient({ connection: null }))).resolves.toMatchObject({
      allowed: true,
    });
  });

  it("allows the booking when the connection is paused", async () => {
    await expect(
      guard(makeClient({ connection: { id: "c", provider_id: PROVIDER, status: "paused" } })),
    ).resolves.toMatchObject({ allowed: true });
  });

  it("allows the booking when no calendars were selected", async () => {
    await expect(guard(makeClient({ sources: [] }))).resolves.toEqual({
      allowed: true,
      reason: "no_sources",
    });
  });

  it("allows the booking when the entitlement itself cannot be resolved", async () => {
    entitlements.throws = true;

    // Refusing every booking for every provider because one lookup failed would
    // be worse than the risk this guards against; Haab's own rules still apply
    // transactionally.
    await expect(guard(makeClient())).resolves.toMatchObject({ allowed: true });
  });
});

describe("when the cache is fresh", () => {
  it("blocks on a cached overlap without asking Google", async () => {
    const decision = await guard(makeClient({ intervals: [busyRow] }));

    expect(decision).toEqual({ allowed: false, reason: "busy", retryable: false });
    expect(refresh.impl).not.toHaveBeenCalled();
  });

  it("still asks Google when the cache says free", async () => {
    // The window between the last refresh and now is exactly where a newly
    // created meeting hides.
    const decision = await guard(makeClient({ intervals: [] }));

    expect(refresh.impl).toHaveBeenCalledTimes(1);
    expect(decision).toEqual({ allowed: true, reason: "free" });
  });

  it("ignores intervals from a superseded snapshot", async () => {
    const stale = { ...busyRow, snapshot_generation: "snap-0" };

    const decision = await guard(makeClient({ intervals: [stale] }));

    // A half-written or replaced refresh must not decide availability.
    expect(decision).toMatchObject({ allowed: true });
  });

  it("treats adjacent busy time as free", async () => {
    const adjacent = {
      ...busyRow,
      starts_at: "2026-09-01T16:00:00.000Z",
      ends_at: "2026-09-01T17:00:00.000Z",
    };

    await expect(guard(makeClient({ intervals: [adjacent] }))).resolves.toMatchObject({
      allowed: true,
    });
  });
});

describe("when Google answers the live check", () => {
  it("blocks when the live snapshot shows an overlap", async () => {
    let call = 0;
    const client = makeClient({ intervals: [] });
    const original = client.from.bind(client);

    // Second read (after refresh) returns the newly discovered meeting.
    (client as { from: unknown }).from = (table: string) => {
      if (table === "provider_google_calendar_busy_intervals") {
        call += 1;
        const query = {
          select: () => query,
          eq: () => query,
          lt: () => query,
          gt: () => query,
          returns: async () => ({ data: call > 1 ? [busyRow] : [], error: null }),
        };
        return query;
      }
      return original(table);
    };

    await expect(guard(client)).resolves.toEqual({
      allowed: false,
      reason: "busy",
      retryable: false,
    });
  });

  it("refuses when a calendar could not be read", async () => {
    refresh.impl.mockResolvedValue({ refreshed: 0, intervals: 0, failedSources: 1 });

    // "No busy time returned" and "we could not ask" must not look alike.
    await expect(guard(makeClient({ intervals: [] }))).resolves.toEqual({
      allowed: false,
      reason: "unverifiable",
      retryable: true,
    });
  });
});

describe("when Google is unreachable", () => {
  beforeEach(() => {
    refresh.impl.mockRejectedValue(new Error("ETIMEDOUT"));
  });

  it("falls back to a still-recent cache", async () => {
    const decision = await guard(
      makeClient({ intervals: [], refreshedAt: "2026-09-01T11:58:00.000Z" }),
    );

    expect(decision).toEqual({ allowed: true, reason: "free" });
  });

  it("still blocks if that recent cache says busy", async () => {
    const decision = await guard(
      makeClient({ intervals: [busyRow], refreshedAt: "2026-09-01T11:52:00.000Z" }),
    );

    expect(decision).toMatchObject({ allowed: false, reason: "busy" });
  });

  it("fails closed once the cache is hard-stale", async () => {
    // Past this the cache is not evidence of anything, and a provider who asked
    // for their commitments to be respected must not be booked over.
    const decision = await guard(
      makeClient({ intervals: [], refreshedAt: "2026-09-01T11:00:00.000Z" }),
    );

    expect(decision).toEqual({
      allowed: false,
      reason: "unverifiable",
      retryable: true,
    });
  });

  it("fails closed when there is no snapshot at all", async () => {
    const decision = await guard(makeClient({ intervals: [], refreshedAt: null }));

    expect(decision).toMatchObject({ allowed: false, reason: "unverifiable" });
  });

  it("says the refusal is retryable, so the caller can offer to try again", async () => {
    const decision = await guard(makeClient({ intervals: [], refreshedAt: null }));

    expect(decision).toMatchObject({ retryable: true });
  });
});
