import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("Repair tests must inject a client.");
  },
}));

const getConnection = vi.fn();
vi.mock("@/lib/google/connections", () => ({
  getConnection: (...args: unknown[]) => getConnection(...args),
  createClientForConnection: async () => {
    throw new Error("Repair tests must inject a Google client.");
  },
}));

import { runGoogleConflictRepairWorker } from "@/lib/google/repair";
import { createLogger } from "@/lib/observability/logger";

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const BOOKING = "00000000-0000-4000-8000-0000000000bb";

const silent = createLogger({ sink: () => undefined });

function conflictRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "cf-1",
    provider_id: PROVIDER,
    booking_id: BOOKING,
    event_mapping_id: "map-1",
    conflict_type: "duration_changed",
    status: "repairing",
    ...overrides,
  };
}

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING,
    provider_id: PROVIDER,
    service_name: "Consultation",
    date: "2026-09-09",
    start_time: "09:00",
    end_time: "09:30",
    status: "confirmed",
    integration_version: 3,
    ...overrides,
  };
}

type Options = {
  conflict?: Record<string, unknown> | null;
  booking?: Record<string, unknown> | null;
  connection?: Record<string, unknown> | null;
  existingEvent?: Record<string, unknown> | null;
};

function makeClient(options: Options = {}) {
  const conflictUpdates: Array<Record<string, unknown>> = [];
  const mappingUpdates: Array<Record<string, unknown>> = [];

  const conflict = options.conflict === undefined ? conflictRow() : options.conflict;
  const booking = options.booking === undefined ? bookingRow() : options.booking;

  getConnection.mockResolvedValue(
    options.connection === undefined
      ? {
          id: "conn-1",
          provider_id: PROVIDER,
          status: "connected",
          target_calendar_id: "cal-1",
          connection_generation: "gen-1",
        }
      : options.connection,
  );

  const client = {
    rpc: async (name: string) =>
      name === "claim_google_sync_conflict_for_repair"
        ? { data: conflict, error: null }
        : { data: null, error: null },

    from: (table: string) => {
      if (table === "google_calendar_sync_conflicts") {
        const query = {
          update: (row: Record<string, unknown>) => {
            conflictUpdates.push(row);
            return query;
          },
          eq: () => query,
        };
        return query;
      }

      if (table === "provider_google_calendar_event_mappings") {
        const query = {
          update: (row: Record<string, unknown>) => {
            mappingUpdates.push(row);
            return query;
          },
          eq: () => query,
        };
        return query;
      }

      if (table === "bookings") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({ data: booking, error: null }),
        };
        return query;
      }

      if (table === "providers") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({
            data: { id: PROVIDER, timezone: "America/Mexico_City" },
            error: null,
          }),
        };
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  const google = {
    getEvent: vi.fn(async () => options.existingEvent ?? null),
    insertEvent: vi.fn(async () => ({ id: "evt-1", etag: '"repaired"' })),
    patchEvent: vi.fn(async () => ({ id: "evt-1", etag: '"repaired"' })),
    deleteEvent: vi.fn(async () => undefined),
  };

  return { client, google, conflictUpdates, mappingUpdates };
}

const run = (client: SupabaseClient, google: unknown) =>
  runGoogleConflictRepairWorker({
    client,
    createClient: async () => google as never,
    logger: silent,
  });

beforeEach(() => vi.clearAllMocks());

describe("runGoogleConflictRepairWorker", () => {
  it("reports no work when the claim returns a row of nulls", async () => {
    const { client, google } = makeClient({ conflict: { id: null } });

    expect(await run(client, google)).toEqual({
      claimed: false,
      repaired: false,
      reason: null,
    });
  });

  it("restores the event from the booking and closes the conflict", async () => {
    const { client, google, conflictUpdates } = makeClient();

    expect(await run(client, google)).toMatchObject({ repaired: true });
    expect(google.insertEvent).toHaveBeenCalled();
    expect(conflictUpdates[0]).toMatchObject({
      status: "auto_repaired",
      resolution: "restored_from_haab",
    });
    expect(conflictUpdates[0]?.resolved_at).toEqual(expect.any(String));
  });

  it("records the repair's own etag so it is not read back as an edit", async () => {
    const { client, google, mappingUpdates } = makeClient();

    await run(client, google);

    expect(mappingUpdates[0]).toMatchObject({
      last_google_etag: '"repaired"',
      google_event_etag: '"repaired"',
      last_projected_booking_version: 3,
    });
  });

  it("recreates an event the provider deleted", async () => {
    const { client, google } = makeClient({
      conflict: conflictRow({ conflict_type: "deletion_not_allowed" }),
      existingEvent: null,
    });

    expect(await run(client, google)).toMatchObject({ repaired: true });
    expect(google.insertEvent).toHaveBeenCalled();
  });

  it("never writes over an event this booking does not own", async () => {
    const { client, google, conflictUpdates } = makeClient({
      conflict: conflictRow({ conflict_type: "ownership_mismatch" }),
    });

    expect(await run(client, google)).toMatchObject({
      repaired: false,
      reason: "not_repairable",
    });
    expect(google.insertEvent).not.toHaveBeenCalled();
    expect(google.patchEvent).not.toHaveBeenCalled();
    // Left open, because a person has to look at it.
    expect(conflictUpdates[0]).toMatchObject({ status: "open", resolved_at: null });
  });

  it("leaves a calendar change for reconnection rather than repairing it", async () => {
    const { client, google } = makeClient({
      conflict: conflictRow({ conflict_type: "calendar_changed" }),
    });

    expect(await run(client, google)).toMatchObject({ reason: "not_repairable" });
    expect(google.insertEvent).not.toHaveBeenCalled();
  });

  it("does not restore an event for a booking Haab also cancelled", async () => {
    const { client, google, conflictUpdates } = makeClient({
      booking: bookingRow({ status: "cancelled" }),
    });

    expect(await run(client, google)).toMatchObject({ repaired: false });
    expect(google.insertEvent).not.toHaveBeenCalled();
    expect(conflictUpdates[0]).toMatchObject({
      status: "ignored",
      resolution: "booking_cancelled",
    });
  });

  it("reopens the conflict when the connection is unusable", async () => {
    const { client, google, conflictUpdates } = makeClient({
      connection: { id: "conn-1", status: "needs_reauth", target_calendar_id: "cal-1" },
    });

    expect(await run(client, google)).toMatchObject({
      reason: "connection_unavailable",
    });
    expect(conflictUpdates[0]).toMatchObject({ status: "open" });
  });

  it("reopens the conflict when Google fails, so it is retried not lost", async () => {
    const { client, google, conflictUpdates } = makeClient();
    google.getEvent.mockRejectedValue(new Error("Google is down"));

    expect(await run(client, google)).toMatchObject({
      repaired: false,
      reason: "repair_failed",
    });
    expect(conflictUpdates[0]).toMatchObject({ status: "open", resolved_at: null });
  });

  it("stops rather than overwriting an event owned by another deployment", async () => {
    const { client, google, conflictUpdates } = makeClient({
      // An event at the same id carrying nobody's ownership markers.
      existingEvent: { id: "evt-1", etag: '"foreign"', extendedProperties: {} },
    });

    expect(await run(client, google)).toMatchObject({
      repaired: false,
      reason: "event_id_collision",
    });
    expect(google.patchEvent).not.toHaveBeenCalled();
    expect(conflictUpdates[0]).toMatchObject({ status: "open" });
  });
});
