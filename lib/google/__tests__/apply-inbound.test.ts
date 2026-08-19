import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("Apply tests must inject a client.");
  },
}));

const hasEntitlement = vi.fn();
vi.mock("@/lib/entitlements/server", () => ({
  hasEntitlement: (...args: unknown[]) => hasEntitlement(...args),
}));

const getConnection = vi.fn();
vi.mock("@/lib/google/connections", () => ({
  getConnection: (...args: unknown[]) => getConnection(...args),
}));

const reschedule = vi.fn();
const cancel = vi.fn();
vi.mock("@/lib/supabase/bookings", async (importOriginal) => {
  // The error class stays real: the applier branches on it, and a stand-in
  // would make that branch pass without proving anything.
  const actual = await importOriginal<typeof import("@/lib/supabase/bookings")>();

  return {
    ...actual,
    rescheduleProviderBooking: (...args: unknown[]) => reschedule(...args),
    cancelProviderBooking: (...args: unknown[]) => cancel(...args),
  };
});

import { runGoogleInboundApplyWorker } from "@/lib/google/apply-inbound";
import { createLogger } from "@/lib/observability/logger";
import { PublicBookingWriteError } from "@/lib/supabase/bookings";

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const GENERATION = "00000000-0000-4000-8000-0000000000aa";
const BOOKING = "00000000-0000-4000-8000-0000000000bb";

const silent = createLogger({ sink: () => undefined });

function changeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "chg-1",
    provider_id: PROVIDER,
    connection_id: "conn-1",
    connection_generation: GENERATION,
    booking_id: BOOKING,
    google_event_id: "evt-1",
    google_event_etag: '"etag-new"',
    google_updated_at: "2026-09-01T12:00:00.000Z",
    google_status: "confirmed",
    // 10:00–10:30 in Mexico City, matching the booking's own half hour.
    start_payload: { dateTime: "2026-09-10T11:00:00-06:00" },
    end_payload: { dateTime: "2026-09-10T11:30:00-06:00" },
    event_type: "default",
    recurring_event_id: null,
    haab_properties: {},
    attempt_count: 1,
    lease_token: "lease-1",
    ...overrides,
  };
}

function connectionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "conn-1",
    provider_id: PROVIDER,
    connection_generation: GENERATION,
    status: "connected",
    target_calendar_id: "cal-1",
    two_way_enabled: true,
    deletion_cancels_booking: false,
    busy_blocking_enabled: true,
    ...overrides,
  };
}

function mappingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "map-1",
    booking_id: BOOKING,
    google_event_id: "evt-1",
    google_calendar_id: "cal-1",
    google_event_etag: '"etag-old"',
    last_google_etag: null,
    last_google_updated_at: null,
    last_projected_booking_version: 2,
    google_applied_booking_version: null,
    ...overrides,
  };
}

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING,
    provider_id: PROVIDER,
    date: "2026-09-09",
    start_time: "09:00",
    end_time: "09:30",
    status: "confirmed",
    integration_version: 2,
    ...overrides,
  };
}

type Options = {
  change?: Record<string, unknown> | null;
  connection?: Record<string, unknown> | null;
  mapping?: Record<string, unknown> | null;
  booking?: Record<string, unknown> | null;
  providerTimezone?: string | null;
};

function makeClient(options: Options = {}) {
  const conflicts: Array<Record<string, unknown>> = [];
  const changeUpdates: Array<Record<string, unknown>> = [];
  const mappingUpdates: Array<Record<string, unknown>> = [];

  const change = options.change === undefined ? changeRow() : options.change;
  const mapping = options.mapping === undefined ? mappingRow() : options.mapping;
  const booking = options.booking === undefined ? bookingRow() : options.booking;

  getConnection.mockResolvedValue(
    options.connection === undefined ? connectionRow() : options.connection,
  );

  const client = {
    rpc: async (name: string) =>
      name === "claim_google_inbound_change"
        ? { data: change, error: null }
        : { data: null, error: null },

    from: (table: string) => {
      if (table === "google_calendar_inbound_changes") {
        const query = {
          update: (row: Record<string, unknown>) => {
            changeUpdates.push(row);
            return query;
          },
          eq: () => query,
        };
        return query;
      }

      if (table === "provider_google_calendar_event_mappings") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({ data: mapping, error: null }),
          update: (row: Record<string, unknown>) => {
            mappingUpdates.push(row);
            return query;
          },
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
            data: {
              id: PROVIDER,
              timezone:
                options.providerTimezone === null
                  ? null
                  : (options.providerTimezone ?? "America/Mexico_City"),
            },
            error: null,
          }),
        };
        return query;
      }

      if (table === "google_calendar_sync_conflicts") {
        return {
          insert: async (row: Record<string, unknown>) => {
            conflicts.push(row);
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  return { client, conflicts, changeUpdates, mappingUpdates };
}

const run = (client: SupabaseClient) =>
  runGoogleInboundApplyWorker({ client, workerId: "w1", logger: silent });

beforeEach(() => {
  vi.clearAllMocks();
  hasEntitlement.mockResolvedValue(true);
  reschedule.mockResolvedValue({ booking: {} });
  cancel.mockResolvedValue({ booking: {} });
});

describe("runGoogleInboundApplyWorker", () => {
  it("reports no work when the claim returns a row of nulls", async () => {
    // PostgREST serialises a composite-returning function as an object of
    // nulls, so a truthiness check on the row alone claims phantom work.
    const { client } = makeClient({ change: { id: null, provider_id: null } });

    expect(await run(client)).toEqual({
      claimed: false,
      outcome: null,
      conflictType: null,
    });
  });

  it("applies a move through the same reschedule the UI calls", async () => {
    const { client, mappingUpdates } = makeClient();

    const summary = await run(client);

    expect(summary).toMatchObject({ claimed: true, outcome: "applied" });
    expect(reschedule).toHaveBeenCalledWith(
      client,
      { bookingId: BOOKING, dateKey: "2026-09-10", time: "11:00" },
      "google_calendar",
    );
    // Attribution is the point: the audit must not say the provider did this.
    expect(mappingUpdates[0]).toMatchObject({
      last_google_etag: '"etag-new"',
      last_applied_inbound_change_id: "chg-1",
      google_applied_booking_version: 2,
    });
  });

  it("converts to the provider's timezone, not the event's offset", async () => {
    // Same instant expressed from Tokyo. The booking must still land on the
    // provider's 11:00, not on a Tokyo wall time.
    const { client } = makeClient({
      change: changeRow({
        start_payload: { dateTime: "2026-09-11T02:00:00+09:00" },
        end_payload: { dateTime: "2026-09-11T02:30:00+09:00" },
      }),
    });

    await run(client);

    expect(reschedule).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ dateKey: "2026-09-10", time: "11:00" }),
      "google_calendar",
    );
  });

  it("suppresses Haab's own write coming back as a notification", async () => {
    const { client } = makeClient({
      change: changeRow({ google_event_etag: '"etag-old"' }),
    });

    expect(await run(client)).toMatchObject({ outcome: "echo_suppressed" });
    expect(reschedule).not.toHaveBeenCalled();
  });

  it("suppresses an echo recognised by the last applied etag too", async () => {
    const { client } = makeClient({
      mapping: mappingRow({ last_google_etag: '"etag-new"' }),
    });

    expect(await run(client)).toMatchObject({ outcome: "echo_suppressed" });
    expect(reschedule).not.toHaveBeenCalled();
  });

  it("drops a notification older than the one already applied", async () => {
    const { client } = makeClient({
      change: changeRow({ google_updated_at: "2026-09-01T11:00:00.000Z" }),
      mapping: mappingRow({ last_google_updated_at: "2026-09-01T12:00:00.000Z" }),
    });

    expect(await run(client)).toMatchObject({ outcome: "stale" });
    expect(reschedule).not.toHaveBeenCalled();
  });

  it("refuses a resize and files it as a conflict", async () => {
    // A 45-minute drag on a 30-minute service sells something that was never
    // booked. The booking stays put and the provider is told.
    const { client, conflicts } = makeClient({
      change: changeRow({
        start_payload: { dateTime: "2026-09-10T11:00:00-06:00" },
        end_payload: { dateTime: "2026-09-10T11:45:00-06:00" },
      }),
    });

    expect(await run(client)).toMatchObject({
      outcome: "conflict",
      conflictType: "duration_changed",
    });
    expect(reschedule).not.toHaveBeenCalled();
    expect(conflicts[0]).toMatchObject({
      conflict_type: "duration_changed",
      booking_id: BOOKING,
      safe_details: expect.objectContaining({
        expectedDurationMinutes: 30,
        googleDurationMinutes: 45,
      }),
    });
  });

  it("refuses an all-day rewrite of a timed booking", async () => {
    const { client, conflicts } = makeClient({
      change: changeRow({
        start_payload: { date: "2026-09-10" },
        end_payload: { date: "2026-09-11" },
      }),
    });

    expect(await run(client)).toMatchObject({ conflictType: "duration_changed" });
    expect(conflicts[0]?.safe_details).toMatchObject({ googleShape: "all_day" });
  });

  it("refuses a recurring event rather than applying one instance", async () => {
    const { client } = makeClient({
      change: changeRow({ recurring_event_id: "rec-1" }),
    });

    expect(await run(client)).toMatchObject({
      conflictType: "recurrence_not_supported",
    });
    expect(reschedule).not.toHaveBeenCalled();
  });

  it("does not cancel a booking when the provider never opted in", async () => {
    const { client, conflicts } = makeClient({
      change: changeRow({ google_status: "cancelled" }),
      connection: connectionRow({ deletion_cancels_booking: false }),
    });

    expect(await run(client)).toMatchObject({
      conflictType: "deletion_not_allowed",
    });
    expect(cancel).not.toHaveBeenCalled();
    expect(conflicts).toHaveLength(1);
  });

  it("cancels when the provider opted in, attributed to Google", async () => {
    const { client } = makeClient({
      change: changeRow({ google_status: "cancelled" }),
      connection: connectionRow({ deletion_cancels_booking: true }),
    });

    expect(await run(client)).toMatchObject({ outcome: "cancelled" });
    expect(cancel).toHaveBeenCalledWith(client, BOOKING, "google_calendar");
  });

  it("files a conflict when the booking layer refuses the new slot", async () => {
    reschedule.mockRejectedValue(
      new PublicBookingWriteError("That time was just booked. Choose another slot.", 409),
    );
    const { client, conflicts } = makeClient();

    expect(await run(client)).toMatchObject({
      conflictType: "haab_booking_overlap",
    });
    expect(conflicts[0]).toMatchObject({ conflict_type: "haab_booking_overlap" });
  });

  it("files a non-overlap refusal as an immovable booking", async () => {
    reschedule.mockRejectedValue(
      new PublicBookingWriteError("Cancelled bookings cannot be rescheduled.", 409),
    );
    const { client } = makeClient();

    expect(await run(client)).toMatchObject({ conflictType: "booking_not_mutable" });
  });

  it("refuses to touch an event this booking does not own", async () => {
    const { client, conflicts } = makeClient({
      mapping: mappingRow({ google_event_id: "someone-elses-event" }),
    });

    expect(await run(client)).toMatchObject({ conflictType: "ownership_mismatch" });
    expect(reschedule).not.toHaveBeenCalled();
    expect(conflicts).toHaveLength(1);
  });

  it("stops when two-way was switched off after staging", async () => {
    const { client } = makeClient({
      connection: connectionRow({ two_way_enabled: false }),
    });

    expect(await run(client)).toMatchObject({ outcome: "skipped" });
    expect(reschedule).not.toHaveBeenCalled();
  });

  it("stops when the connection was replaced since staging", async () => {
    const { client } = makeClient({
      connection: connectionRow({
        connection_generation: "00000000-0000-4000-8000-0000000000ff",
      }),
    });

    expect(await run(client)).toMatchObject({ outcome: "skipped" });
    expect(reschedule).not.toHaveBeenCalled();
  });

  it("stops when the entitlement is gone", async () => {
    hasEntitlement.mockResolvedValue(false);
    const { client } = makeClient();

    expect(await run(client)).toMatchObject({ outcome: "skipped" });
    expect(reschedule).not.toHaveBeenCalled();
  });

  it("fails closed and retries when the entitlement cannot be resolved", async () => {
    // Unresolvable is not "entitled". It is also not a permanent refusal, so
    // the change is retried rather than discarded.
    hasEntitlement.mockRejectedValue(new Error("billing unreachable"));
    const { client, changeUpdates } = makeClient();

    expect(await run(client)).toMatchObject({ outcome: null });
    expect(reschedule).not.toHaveBeenCalled();
    expect(changeUpdates[0]).toMatchObject({ status: "failed" });
  });

  it("dead-letters a change that has failed too many times", async () => {
    hasEntitlement.mockRejectedValue(new Error("still unreachable"));
    const { client, changeUpdates } = makeClient({
      change: changeRow({ attempt_count: 5 }),
    });

    await run(client);

    expect(changeUpdates[0]).toMatchObject({ status: "dead_letter" });
  });

  it("does nothing when the schedule did not actually move", async () => {
    const { client } = makeClient({
      booking: bookingRow({ date: "2026-09-10", start_time: "11:00", end_time: "11:30" }),
    });

    expect(await run(client)).toMatchObject({ outcome: "skipped" });
    expect(reschedule).not.toHaveBeenCalled();
  });

  it("leaves an already-cancelled booking alone", async () => {
    const { client } = makeClient({ booking: bookingRow({ status: "cancelled" }) });

    expect(await run(client)).toMatchObject({ outcome: "skipped" });
    expect(reschedule).not.toHaveBeenCalled();
  });

  it("releases the lease on every settled outcome", async () => {
    const { client, changeUpdates } = makeClient();

    await run(client);

    expect(changeUpdates[0]).toMatchObject({
      lease_token: null,
      leased_by: null,
      lease_expires_at: null,
      status: "applied",
    });
  });

  it("keeps the event's content out of the conflict it records", async () => {
    const { client, conflicts } = makeClient({
      change: changeRow({ recurring_event_id: "rec-1" }),
    });

    await run(client);

    const serialised = JSON.stringify(conflicts[0]);
    expect(serialised).not.toContain("summary");
    expect(serialised).not.toContain("attendee");
    expect(serialised).not.toContain("description");
  });
});
