import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("Reconcile tests must inject a client.");
  },
}));

import type { GoogleCalendarClient } from "@/lib/google/calendar-client";
import { reconcileProviderCalendar } from "@/lib/google/reconcile";

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-09-01T12:00:00.000Z");

type BookingSeed = {
  id: string;
  integration_version: number;
  date?: string;
};

function booking(seed: BookingSeed) {
  return {
    id: seed.id,
    provider_id: PROVIDER,
    service_name: "Consultation",
    date: seed.date ?? "2026-09-10",
    start_time: "09:00",
    end_time: "09:30",
    status: "confirmed",
    integration_version: seed.integration_version,
  };
}

function makeClient(options: {
  connection?: Record<string, unknown> | null;
  bookings?: ReturnType<typeof booking>[];
  mappings?: Record<string, number>;
}) {
  const filters: Array<[string, unknown]> = [];
  const upserts: Array<Record<string, unknown>> = [];

  const connection =
    options.connection === undefined
      ? {
          id: "conn-1",
          provider_id: PROVIDER,
          connection_generation: "gen-1",
          target_calendar_id: "cal-1",
          target_calendar_timezone: "UTC",
          status: "connected",
        }
      : options.connection;

  let mappingLookupId = "";

  const client = {
    from: (table: string) => {
      if (table === "provider_google_calendar_connections") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({ data: connection, error: null }),
          update: () => query,
        };
        return query;
      }

      if (table === "bookings") {
        const query = {
          select: () => query,
          eq: (column: string, value: unknown) => {
            filters.push([column, value]);
            return query;
          },
          gte: (column: string, value: unknown) => {
            filters.push([column, value]);
            return query;
          },
          neq: (column: string, value: unknown) => {
            filters.push([column, value]);
            return query;
          },
          order: () => query,
          limit: (value: number) => {
            filters.push(["limit", value]);
            return query;
          },
          returns: async () => ({ data: options.bookings ?? [], error: null }),
        };
        return query;
      }

      if (table === "provider_google_calendar_event_mappings") {
        const query = {
          select: () => query,
          eq: (column: string, value: unknown) => {
            if (column === "booking_id") mappingLookupId = String(value);
            return query;
          },
          maybeSingle: async () => ({
            data:
              options.mappings && mappingLookupId in options.mappings
                ? { last_projected_booking_version: options.mappings[mappingLookupId] }
                : null,
            error: null,
          }),
          upsert: async (row: Record<string, unknown>) => {
            upserts.push(row);
            return { error: null };
          },
        };
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return { client: client as unknown as SupabaseClient, filters, upserts };
}

function makeGoogle(overrides: Partial<GoogleCalendarClient> = {}) {
  const written: string[] = [];

  const google: GoogleCalendarClient = {
    listCalendars: async () => [],
    upsertEvent: async (_calendarId, event) => {
      written.push(event.eventId);
      return { id: event.eventId };
    },
    cancelEvent: async () => undefined,
    getEvent: async () => null,
    ...overrides,
  };

  return { google, written };
}

beforeEach(() => {
  vi.stubEnv("HAAB_DEPLOYMENT_NAMESPACE", "test");
});

afterEach(() => vi.unstubAllEnvs());

describe("reconcileProviderCalendar", () => {
  it("writes the bookings that predate the connection", async () => {
    const supabase = makeClient({
      bookings: [booking({ id: "b1", integration_version: 1 })],
    });
    const { google, written } = makeGoogle();

    const summary = await reconcileProviderCalendar({
      providerId: PROVIDER,
      client: supabase.client,
      createClient: async () => google,
      now: NOW,
    });

    expect(summary).toMatchObject({ considered: 1, written: 1, skipped: 0, failed: 0 });
    expect(written).toHaveLength(1);
  });

  it("looks only forward, and only at live bookings", async () => {
    const supabase = makeClient({ bookings: [] });
    const { google } = makeGoogle();

    await reconcileProviderCalendar({
      providerId: PROVIDER,
      client: supabase.client,
      createClient: async () => google,
      now: NOW,
    });

    // Back-filling history would write hundreds of events nobody will read.
    expect(supabase.filters).toContainEqual(["date", "2026-09-01"]);
    expect(supabase.filters).toContainEqual(["status", "cancelled"]);
  });

  it("bounds how much one run will do", async () => {
    const supabase = makeClient({ bookings: [] });
    const { google } = makeGoogle();

    await reconcileProviderCalendar({
      providerId: PROVIDER,
      client: supabase.client,
      createClient: async () => google,
      now: NOW,
    });

    const limit = supabase.filters.find(([column]) => column === "limit");
    expect(limit?.[1]).toBeLessThanOrEqual(200);
  });

  it("skips a booking Google already reflects", async () => {
    const supabase = makeClient({
      bookings: [booking({ id: "b1", integration_version: 2 })],
      mappings: { b1: 2 },
    });
    const { google, written } = makeGoogle();

    const summary = await reconcileProviderCalendar({
      providerId: PROVIDER,
      client: supabase.client,
      createClient: async () => google,
      now: NOW,
    });

    expect(summary).toMatchObject({ considered: 1, written: 0, skipped: 1 });
    expect(written).toHaveLength(0);
  });

  it("rewrites a booking whose mapping is behind", async () => {
    const supabase = makeClient({
      bookings: [booking({ id: "b1", integration_version: 3 })],
      mappings: { b1: 1 },
    });
    const { google, written } = makeGoogle();

    await reconcileProviderCalendar({
      providerId: PROVIDER,
      client: supabase.client,
      createClient: async () => google,
      now: NOW,
    });

    expect(written).toHaveLength(1);
    expect(supabase.upserts[0]).toMatchObject({ last_projected_booking_version: 3 });
  });

  it("keeps going when one booking fails, and leaves it unmapped", async () => {
    const supabase = makeClient({
      bookings: [
        booking({ id: "b1", integration_version: 1 }),
        booking({ id: "b2", integration_version: 1 }),
      ],
    });
    let first = true;
    const { google } = makeGoogle({
      upsertEvent: async (_calendarId, event) => {
        if (first) {
          first = false;
          throw new Error("Google said no");
        }
        return { id: event.eventId };
      },
    });

    const summary = await reconcileProviderCalendar({
      providerId: PROVIDER,
      client: supabase.client,
      createClient: async () => google,
      now: NOW,
    });

    // The failure is not fatal, and the next run retries it because its
    // mapping was never advanced.
    expect(summary).toMatchObject({ considered: 2, written: 1, failed: 1 });
    expect(supabase.upserts).toHaveLength(1);
  });

  it("does nothing for a provider with no connection", async () => {
    const supabase = makeClient({ connection: null });
    const { google, written } = makeGoogle();

    const summary = await reconcileProviderCalendar({
      providerId: PROVIDER,
      client: supabase.client,
      createClient: async () => google,
      now: NOW,
    });

    expect(summary).toMatchObject({ considered: 0, written: 0 });
    expect(written).toHaveLength(0);
  });

  it("does nothing for a connection that still needs reauth", async () => {
    const supabase = makeClient({
      connection: {
        id: "conn-1",
        connection_generation: "gen-1",
        target_calendar_id: "cal-1",
        status: "needs_reauth",
      },
    });
    const { google, written } = makeGoogle();

    await reconcileProviderCalendar({
      providerId: PROVIDER,
      client: supabase.client,
      createClient: async () => google,
      now: NOW,
    });

    expect(written).toHaveLength(0);
  });

  it("does nothing before a calendar has been chosen", async () => {
    const supabase = makeClient({
      connection: {
        id: "conn-1",
        connection_generation: "gen-1",
        target_calendar_id: null,
        status: "connected",
      },
    });
    const { google, written } = makeGoogle();

    await reconcileProviderCalendar({
      providerId: PROVIDER,
      client: supabase.client,
      createClient: async () => google,
      now: NOW,
    });

    expect(written).toHaveLength(0);
  });
});
