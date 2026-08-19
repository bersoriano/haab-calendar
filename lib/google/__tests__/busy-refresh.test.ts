import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("Busy refresh tests must inject a client.");
  },
}));

const hasEntitlement = vi.fn();
vi.mock("@/lib/entitlements/server", () => ({
  hasEntitlement: (...args: unknown[]) => hasEntitlement(...args),
}));

const getConnection = vi.fn();
vi.mock("@/lib/google/connections", () => ({
  getConnection: (...args: unknown[]) => getConnection(...args),
  createClientForConnection: async () => {
    throw new Error("Busy refresh tests must inject a Google client.");
  },
}));

import { busyHorizon, refreshProviderBusySnapshot } from "@/lib/google/busy-refresh";
import { createLogger } from "@/lib/observability/logger";

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const GENERATION = "00000000-0000-4000-8000-0000000000aa";
const NOW = new Date("2026-09-01T12:00:00.000Z");
const TARGET = "haab-target@example.invalid";

const silent = createLogger({ sink: () => undefined });

function source(overrides: Record<string, unknown> = {}) {
  return {
    id: "src-1",
    provider_id: PROVIDER,
    connection_id: "conn-1",
    connection_generation: GENERATION,
    calendar_id: "personal@example.invalid",
    enabled: true,
    ...overrides,
  };
}

type Options = {
  sources?: Array<Record<string, unknown>>;
  busyByCalendar?: Record<string, Array<{ start: string; end: string }>>;
  errorsByCalendar?: Record<string, string>;
  connection?: Record<string, unknown> | null;
  activateError?: boolean;
  insertError?: boolean;
};

function makeClient(options: Options = {}) {
  const inserted: Array<Record<string, unknown>> = [];
  const sourceUpdates: Array<Record<string, unknown>> = [];
  const activations: Array<Record<string, unknown>> = [];

  getConnection.mockResolvedValue(
    options.connection === undefined
      ? {
          id: "conn-1",
          provider_id: PROVIDER,
          connection_generation: GENERATION,
          status: "connected",
          target_calendar_id: TARGET,
        }
      : options.connection,
  );

  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      if (name === "activate_google_busy_snapshot") {
        activations.push(args);
        return { error: options.activateError ? { message: "nope" } : null };
      }

      return { data: null, error: null };
    },

    from: (table: string) => {
      if (table === "provider_google_calendar_busy_sources") {
        const query = {
          select: () => query,
          eq: () => query,
          returns: async () => ({
            data: options.sources ?? [source()],
            error: null,
          }),
          update: (row: Record<string, unknown>) => {
            sourceUpdates.push(row);
            return query;
          },
        };
        return query;
      }

      if (table === "provider_google_calendar_busy_intervals") {
        return {
          insert: async (rows: Array<Record<string, unknown>>) => {
            if (options.insertError) {
              return { error: { message: "nope" } };
            }
            inserted.push(...rows);
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  const google = {
    queryFreeBusy: vi.fn(async () => ({
      busyByCalendar: options.busyByCalendar ?? {},
      errorsByCalendar: options.errorsByCalendar ?? {},
    })),
  };

  return { client, google, inserted, sourceUpdates, activations };
}

const run = (client: SupabaseClient, google: unknown) =>
  refreshProviderBusySnapshot({
    providerId: PROVIDER,
    client,
    createClient: async () => google as never,
    now: NOW,
    logger: silent,
  });

beforeEach(() => {
  vi.clearAllMocks();
  hasEntitlement.mockResolvedValue(true);
});

describe("busyHorizon", () => {
  it("starts in the past so a meeting already under way still blocks", () => {
    const { timeMin, timeMax } = busyHorizon(NOW);

    expect(timeMin).toBe("2026-08-31T12:00:00.000Z");
    expect(new Date(timeMax).getTime()).toBeGreaterThan(NOW.getTime());
  });

  it("clamps an absurd horizon rather than asking Google for it", () => {
    const wide = busyHorizon(NOW, 100_000);
    const days =
      (new Date(wide.timeMax).getTime() - NOW.getTime()) / 86_400_000;

    expect(days).toBe(365);
  });
});

describe("refreshProviderBusySnapshot", () => {
  it("writes intervals and only then activates the generation", async () => {
    const { client, google, inserted, activations } = makeClient({
      busyByCalendar: {
        "personal@example.invalid": [
          { start: "2026-09-02T15:00:00Z", end: "2026-09-02T16:00:00Z" },
        ],
      },
    });

    const summary = await run(client, google);

    expect(summary).toMatchObject({ refreshed: 1, intervals: 1, failedSources: 0 });
    expect(inserted[0]).toMatchObject({
      busy_source_id: "src-1",
      starts_at: "2026-09-02T15:00:00Z",
    });
    // Availability must never read a half-written snapshot, so the generation
    // the rows were written under is the one activated.
    expect(activations[0]).toMatchObject({
      p_busy_source_id: "src-1",
      p_snapshot_generation: inserted[0]?.snapshot_generation,
    });
  });

  it("never reads the calendar Haab writes to as busy time", async () => {
    // Haab's own events are Haab's bookings; counting them again would make a
    // service with room for two look full after one.
    const { client, google } = makeClient({
      sources: [source({ id: "src-target", calendar_id: TARGET })],
    });

    expect(await run(client, google)).toMatchObject({ skipped: "no_sources" });
    expect(google.queryFreeBusy).not.toHaveBeenCalled();
  });

  it("still reads the other sources when one of them is the target", async () => {
    const { client, google } = makeClient({
      sources: [
        source({ id: "src-target", calendar_id: TARGET }),
        source({ id: "src-1", calendar_id: "personal@example.invalid" }),
      ],
      busyByCalendar: { "personal@example.invalid": [] },
    });

    await run(client, google);

    expect(google.queryFreeBusy).toHaveBeenCalledWith(
      expect.objectContaining({ calendarIds: ["personal@example.invalid"] }),
    );
  });

  it("asks for every source in one request", async () => {
    const { client, google } = makeClient({
      sources: [
        source({ id: "a", calendar_id: "a@example.invalid" }),
        source({ id: "b", calendar_id: "b@example.invalid" }),
        source({ id: "c", calendar_id: "c@example.invalid" }),
      ],
    });

    await run(client, google);

    expect(google.queryFreeBusy).toHaveBeenCalledTimes(1);
    expect(google.queryFreeBusy).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarIds: ["a@example.invalid", "b@example.invalid", "c@example.invalid"],
      }),
    );
  });

  it("counts an unreadable calendar as failed rather than free", async () => {
    const { client, google, sourceUpdates, activations } = makeClient({
      errorsByCalendar: { "personal@example.invalid": "notFound" },
    });

    const summary = await run(client, google);

    expect(summary).toMatchObject({ failedSources: 1, refreshed: 0 });
    // The previous snapshot stays authoritative: nothing was activated.
    expect(activations).toHaveLength(0);
    expect(sourceUpdates[0]).toMatchObject({ last_error_code: "notFound" });
  });

  it("keeps one failing calendar from discarding the others", async () => {
    const { client, google } = makeClient({
      sources: [
        source({ id: "a", calendar_id: "a@example.invalid" }),
        source({ id: "b", calendar_id: "b@example.invalid" }),
      ],
      errorsByCalendar: { "a@example.invalid": "notFound" },
      busyByCalendar: {
        "b@example.invalid": [
          { start: "2026-09-02T15:00:00Z", end: "2026-09-02T16:00:00Z" },
        ],
      },
    });

    expect(await run(client, google)).toMatchObject({
      refreshed: 1,
      failedSources: 1,
      intervals: 1,
    });
  });

  it("does not activate a generation whose rows failed to write", async () => {
    const { client, google, activations } = makeClient({
      insertError: true,
      busyByCalendar: {
        "personal@example.invalid": [
          { start: "2026-09-02T15:00:00Z", end: "2026-09-02T16:00:00Z" },
        ],
      },
    });

    expect(await run(client, google)).toMatchObject({
      failedSources: 1,
      refreshed: 0,
    });
    expect(activations).toHaveLength(0);
  });

  it("discards a zero-length or inverted interval", async () => {
    const { client, google, inserted } = makeClient({
      busyByCalendar: {
        "personal@example.invalid": [
          { start: "2026-09-02T15:00:00Z", end: "2026-09-02T15:00:00Z" },
          { start: "2026-09-02T17:00:00Z", end: "2026-09-02T16:00:00Z" },
          { start: "2026-09-02T18:00:00Z", end: "2026-09-02T19:00:00Z" },
        ],
      },
    });

    expect(await run(client, google)).toMatchObject({ intervals: 1 });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ starts_at: "2026-09-02T18:00:00Z" });
  });

  it("stops when the entitlement is gone, without calling Google", async () => {
    hasEntitlement.mockResolvedValue(false);
    const { client, google } = makeClient();

    expect(await run(client, google)).toMatchObject({ skipped: "not_entitled" });
    expect(google.queryFreeBusy).not.toHaveBeenCalled();
  });

  it("stops when there is no usable connection", async () => {
    const { client, google } = makeClient({ connection: null });

    expect(await run(client, google)).toMatchObject({
      skipped: "no_active_connection",
    });
    expect(google.queryFreeBusy).not.toHaveBeenCalled();
  });

  it("reports a failed activation without claiming a refresh", async () => {
    const { client, google } = makeClient({
      activateError: true,
      busyByCalendar: {
        "personal@example.invalid": [
          { start: "2026-09-02T15:00:00Z", end: "2026-09-02T16:00:00Z" },
        ],
      },
    });

    expect(await run(client, google)).toMatchObject({
      refreshed: 0,
      failedSources: 1,
    });
  });
});
