import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("Capability tests must inject a client.");
  },
}));

const hasEntitlement = vi.fn();
vi.mock("@/lib/entitlements/server", () => ({
  hasEntitlement: (...args: unknown[]) => hasEntitlement(...args),
}));

const getConnection = vi.fn();
const listCalendars = vi.fn();
vi.mock("@/lib/google/connections", () => ({
  getConnection: (...args: unknown[]) => getConnection(...args),
  createClientForConnection: async () => ({ listCalendars }),
}));

import {
  CapabilityError,
  getCapabilities,
  updateCapabilities,
} from "@/lib/google/capabilities";
import { createLogger } from "@/lib/observability/logger";

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const GENERATION = "00000000-0000-4000-8000-0000000000aa";
const TARGET = "work@example.invalid";

const silent = createLogger({ sink: () => undefined });

function connectionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "conn-1",
    provider_id: PROVIDER,
    connection_generation: GENERATION,
    status: "connected",
    target_calendar_id: TARGET,
    busy_blocking_enabled: false,
    two_way_enabled: false,
    deletion_cancels_booking: false,
    ...overrides,
  };
}

type Options = {
  sources?: Array<Record<string, unknown>>;
  conflicts?: Array<Record<string, unknown>>;
};

function makeClient(options: Options = {}) {
  const upserts: Array<Array<Record<string, unknown>>> = [];
  const deletedIds: string[][] = [];
  const connectionUpdates: Array<Record<string, unknown>> = [];

  const client = {
    from: (table: string) => {
      if (table === "provider_google_calendar_busy_sources") {
        const query = {
          select: () => query,
          eq: () => query,
          order: () => query,
          delete: () => query,
          in: (_column: string, values: string[]) => {
            deletedIds.push(values);
            return { error: null };
          },
          upsert: async (rows: Array<Record<string, unknown>>) => {
            upserts.push(rows);
            return { error: null };
          },
          returns: async () => ({ data: options.sources ?? [], error: null }),
        };
        return query;
      }

      if (table === "google_calendar_sync_conflicts") {
        const query = {
          select: () => query,
          eq: () => query,
          in: () => query,
          order: () => query,
          limit: () => query,
          returns: async () => ({ data: options.conflicts ?? [], error: null }),
        };
        return query;
      }

      if (table === "provider_google_calendar_connections") {
        const query = {
          update: (row: Record<string, unknown>) => {
            connectionUpdates.push(row);
            return query;
          },
          eq: () => query,
        };
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  return { client, upserts, deletedIds, connectionUpdates };
}

const update = (client: SupabaseClient, patch: Record<string, unknown>) =>
  updateCapabilities(
    { providerId: PROVIDER, update: patch },
    { client, logger: silent },
  );

beforeEach(() => {
  vi.clearAllMocks();
  hasEntitlement.mockResolvedValue(true);
  getConnection.mockResolvedValue(connectionRow());
  listCalendars.mockResolvedValue({
    calendars: [
      {
        id: "personal@example.invalid",
        summary: "Personal",
        accessRole: "owner",
        primary: false,
        timeZone: "America/Mexico_City",
      },
      {
        id: TARGET,
        summary: "Work",
        accessRole: "owner",
        primary: true,
        timeZone: "America/Mexico_City",
      },
    ],
    truncated: false,
  });
});

describe("getCapabilities", () => {
  it("reports both capabilities as unavailable when entitlements cannot be read", async () => {
    // An unknown answer about paid access is a no, never a yes.
    hasEntitlement.mockRejectedValue(new Error("billing unreachable"));
    const { client } = makeClient();

    const view = await getCapabilities(PROVIDER, client);

    expect(view.busyBlockingAvailable).toBe(false);
    expect(view.twoWayAvailable).toBe(false);
  });

  it("shows the provider only safe conflict details", async () => {
    const { client } = makeClient({
      conflicts: [
        {
          id: "cf-1",
          conflict_type: "duration_changed",
          status: "open",
          created_at: "2026-09-01T12:00:00Z",
          safe_details: { bookingDate: "2026-09-10", bookingStartTime: "09:00" },
        },
      ],
    });

    const view = await getCapabilities(PROVIDER, client);

    expect(view.conflicts[0]).toEqual({
      id: "cf-1",
      conflictType: "duration_changed",
      status: "open",
      createdAt: "2026-09-01T12:00:00Z",
      bookingDate: "2026-09-10",
      bookingStartTime: "09:00",
    });
  });

  it("ignores a malformed detail rather than rendering it", async () => {
    const { client } = makeClient({
      conflicts: [
        {
          id: "cf-1",
          conflict_type: "duration_changed",
          status: "open",
          created_at: "2026-09-01T12:00:00Z",
          safe_details: { bookingDate: { nested: true } },
        },
      ],
    });

    const view = await getCapabilities(PROVIDER, client);

    expect(view.conflicts[0]?.bookingDate).toBeNull();
  });
});

describe("updateCapabilities", () => {
  it("refuses to switch on a capability the plan does not include", async () => {
    hasEntitlement.mockResolvedValue(false);
    const { client, connectionUpdates } = makeClient();

    await expect(update(client, { twoWayEnabled: true })).rejects.toMatchObject({
      status: 403,
    });
    expect(connectionUpdates).toHaveLength(0);
  });

  it("fails closed when the entitlement cannot be resolved", async () => {
    hasEntitlement.mockRejectedValue(new Error("billing unreachable"));
    const { client, connectionUpdates } = makeClient();

    await expect(update(client, { busyBlockingEnabled: true })).rejects.toMatchObject({
      status: 503,
    });
    expect(connectionUpdates).toHaveLength(0);
  });

  it("lets a provider switch a capability off without an entitlement", async () => {
    // Withdrawing consent cannot be a paid feature.
    hasEntitlement.mockResolvedValue(false);
    const { client, connectionUpdates } = makeClient();

    await update(client, { busyBlockingEnabled: false, twoWayEnabled: false });

    expect(connectionUpdates[0]).toMatchObject({
      busy_blocking_enabled: false,
      two_way_enabled: false,
    });
  });

  it("disarms deletion handling when two-way is switched off", async () => {
    // Otherwise it would silently re-arm the next time two-way came back on.
    const { client, connectionUpdates } = makeClient();

    await update(client, { twoWayEnabled: false });

    expect(connectionUpdates[0]).toMatchObject({ deletion_cancels_booking: false });
  });

  it("refuses deletion handling while two-way is off", async () => {
    const { client } = makeClient();

    await expect(
      update(client, { deletionCancelsBooking: true }),
    ).rejects.toBeInstanceOf(CapabilityError);
  });

  it("refuses two-way before a calendar has been chosen", async () => {
    getConnection.mockResolvedValue(connectionRow({ target_calendar_id: null }));
    const { client } = makeClient();

    await expect(update(client, { twoWayEnabled: true })).rejects.toMatchObject({
      status: 409,
    });
  });

  it("refuses a calendar this account cannot see", async () => {
    // A calendar id in a request body is not enough to make Haab read one.
    const { client, upserts } = makeClient();

    await expect(
      update(client, { busyCalendarIds: ["someone-elses@example.invalid"] }),
    ).rejects.toMatchObject({ status: 400 });
    expect(upserts).toHaveLength(0);
  });

  it("refuses the calendar Haab writes to as a busy source", async () => {
    const { client, upserts } = makeClient();

    await expect(update(client, { busyCalendarIds: [TARGET] })).rejects.toMatchObject({
      status: 400,
    });
    expect(upserts).toHaveLength(0);
  });

  it("refuses more calendars than the cap allows", async () => {
    const many = Array.from({ length: 11 }, (_, index) => `c${index}@example.invalid`);
    const { client, upserts } = makeClient();

    await expect(update(client, { busyCalendarIds: many })).rejects.toMatchObject({
      status: 400,
    });
    expect(upserts).toHaveLength(0);
  });

  it("records a chosen calendar with what Google says about it", async () => {
    const { client, upserts } = makeClient();

    await update(client, { busyCalendarIds: ["personal@example.invalid"] });

    expect(upserts[0]?.[0]).toMatchObject({
      calendar_id: "personal@example.invalid",
      calendar_summary: "Personal",
      access_role: "owner",
      enabled: true,
      connection_generation: GENERATION,
    });
  });

  it("removes the sources the provider deselected", async () => {
    const { client, deletedIds } = makeClient({
      sources: [
        { id: "src-old", calendar_id: "old@example.invalid" },
        { id: "src-keep", calendar_id: "personal@example.invalid" },
      ],
    });

    await update(client, { busyCalendarIds: ["personal@example.invalid"] });

    // Deleting by primary key, never by interpolating calendar ids into a
    // filter expression.
    expect(deletedIds[0]).toEqual(["src-old"]);
  });

  it("lets a provider remove every source", async () => {
    const { client, deletedIds, upserts } = makeClient({
      sources: [{ id: "src-old", calendar_id: "old@example.invalid" }],
    });

    await update(client, { busyCalendarIds: [] });

    expect(deletedIds[0]).toEqual(["src-old"]);
    expect(upserts).toHaveLength(0);
  });

  it("refuses when there is no connection to configure", async () => {
    getConnection.mockResolvedValue(null);
    const { client } = makeClient();

    await expect(update(client, { twoWayEnabled: true })).rejects.toMatchObject({
      status: 409,
    });
  });
});
