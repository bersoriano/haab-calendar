import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const entitlements = vi.hoisted(() => ({ entitled: true }));

vi.mock("@/lib/entitlements/server", () => ({
  hasEntitlement: async () => entitlements.entitled,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("Sync tests must inject a client.");
  },
}));

import {
  GoogleApiError,
  type GoogleCalendarClient,
  type GoogleEvent,
} from "@/lib/google/calendar-client";
import { buildManagedEventProperties } from "@/lib/google/ids";
import { runGoogleInboundSync } from "@/lib/google/inbound-sync";
import { createLogger } from "@/lib/observability/logger";

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const BOOKING = "00000000-0000-4000-8000-000000000002";
const GENERATION = "gen-1";
const silent = createLogger({ sink: () => undefined });

const managedProps = buildManagedEventProperties({
  namespace: "test",
  providerId: PROVIDER,
  bookingId: BOOKING,
  bookingVersion: 1,
});

function managedEvent(overrides: Partial<GoogleEvent> = {}): GoogleEvent {
  return {
    id: "haab-event-1",
    etag: '"1"',
    status: "confirmed",
    updated: "2026-09-01T12:00:00.000Z",
    start: { dateTime: "2026-09-02T09:00:00-06:00", timeZone: "America/Mexico_City" },
    end: { dateTime: "2026-09-02T09:30:00-06:00", timeZone: "America/Mexico_City" },
    extendedProperties: { private: managedProps },
    ...overrides,
  };
}

const foreignEvent: GoogleEvent = {
  id: "someone-elses-event",
  etag: '"9"',
  status: "confirmed",
  extendedProperties: { private: { note: "not ours" } },
};

type Options = {
  connection?: Record<string, unknown> | null;
  cursor?: Record<string, unknown> | null;
};

function makeClient(options: Options = {}) {
  const upserts: Array<{ table: string; rows: unknown }> = [];
  const updates: Array<Record<string, unknown>> = [];

  const connection =
    options.connection === undefined
      ? {
          id: "conn-1",
          provider_id: PROVIDER,
          connection_generation: GENERATION,
          target_calendar_id: "cal-1",
          status: "connected",
          two_way_enabled: true,
        }
      : options.connection;

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

      if (table === "provider_google_calendar_sync_cursors") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({ data: options.cursor ?? null, error: null }),
          update: (row: Record<string, unknown>) => {
            updates.push(row);
            return query;
          },
          upsert: async (rows: unknown) => {
            upserts.push({ table, rows });
            return { error: null };
          },
        };
        return query;
      }

      if (table === "google_calendar_inbound_changes") {
        return {
          upsert: async (rows: unknown) => {
            upserts.push({ table, rows });
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return { client: client as unknown as SupabaseClient, upserts, updates };
}

function makeGoogle(pages: Array<Parameters<GoogleCalendarClient["listEvents"]> extends never ? never : {
  events: GoogleEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}> | (() => never)) {
  const calls: Array<{ syncToken?: string; pageToken?: string }> = [];
  let index = 0;

  const google = {
    listCalendars: async () => ({ calendars: [], truncated: false }),
    queryFreeBusy: async () => ({ busyByCalendar: {}, errorsByCalendar: {} }),
    listEvents: async (request: { syncToken?: string; pageToken?: string }) => {
      calls.push({ syncToken: request.syncToken, pageToken: request.pageToken });

      if (typeof pages === "function") pages();

      const page = (pages as Array<{ events: GoogleEvent[]; nextPageToken?: string; nextSyncToken?: string }>)[
        Math.min(index, pages.length - 1)
      ];
      index += 1;
      return page;
    },
    getEvent: async () => null,
    insertEvent: async () => ({ id: "x" }),
    patchEvent: async () => ({ id: "x" }),
    deleteEvent: async () => undefined,
  } as unknown as GoogleCalendarClient;

  return { google, calls };
}

function run(
  supabase: ReturnType<typeof makeClient>,
  google: GoogleCalendarClient,
) {
  return runGoogleInboundSync({
    providerId: PROVIDER,
    client: supabase.client,
    createClient: async () => google,
    logger: silent,
  });
}

beforeEach(() => {
  entitlements.entitled = true;
  vi.stubEnv("HAAB_DEPLOYMENT_NAMESPACE", "test");
});

describe("gating", () => {
  it("does nothing without an active connection", async () => {
    const supabase = makeClient({ connection: null });
    const { google, calls } = makeGoogle([{ events: [] }]);

    await expect(run(supabase, google)).resolves.toMatchObject({
      skipped: "no_active_connection",
    });
    expect(calls).toHaveLength(0);
  });

  it("does nothing when the entitlement is gone", async () => {
    entitlements.entitled = false;
    const supabase = makeClient();
    const { google, calls } = makeGoogle([{ events: [] }]);

    // An entitlement lost since the notification arrived must stop the read,
    // not merely the write.
    await expect(run(supabase, google)).resolves.toMatchObject({
      skipped: "two_way_disabled",
    });
    expect(calls).toHaveLength(0);
  });

  it("does nothing when the provider has not opted in", async () => {
    const supabase = makeClient({
      connection: {
        id: "conn-1",
        provider_id: PROVIDER,
        connection_generation: GENERATION,
        target_calendar_id: "cal-1",
        status: "connected",
        two_way_enabled: false,
      },
    });
    const { google, calls } = makeGoogle([{ events: [] }]);

    await expect(run(supabase, google)).resolves.toMatchObject({
      skipped: "two_way_disabled",
    });
    expect(calls).toHaveLength(0);
  });
});

describe("staging", () => {
  it("stages a managed event and ignores everything else", async () => {
    const supabase = makeClient();
    const { google } = makeGoogle([
      { events: [managedEvent(), foreignEvent], nextSyncToken: "tok-1" },
    ]);

    const summary = await run(supabase, google);

    expect(summary).toMatchObject({ staged: 1, ignored: 1, completed: true });
  });

  it("stages times and ownership, never event content", async () => {
    const supabase = makeClient();
    const { google } = makeGoogle([
      { events: [managedEvent()], nextSyncToken: "tok-1" },
    ]);

    await run(supabase, google);

    const staged = supabase.upserts.find(
      (entry) => entry.table === "google_calendar_inbound_changes",
    );
    const row = (staged?.rows as Array<Record<string, unknown>>)[0];

    expect(row).toMatchObject({ booking_id: BOOKING, google_status: "confirmed" });
    expect(Object.keys(row)).not.toContain("summary");
    expect(Object.keys(row)).not.toContain("attendees");
  });

  it("stages a deleted managed event, which is the change that matters most", async () => {
    const supabase = makeClient();
    const { google } = makeGoogle([
      { events: [managedEvent({ status: "cancelled" })], nextSyncToken: "tok-1" },
    ]);

    await run(supabase, google);

    const row = (
      supabase.upserts.find((e) => e.table === "google_calendar_inbound_changes")
        ?.rows as Array<Record<string, unknown>>
    )[0];

    expect(row.google_status).toBe("cancelled");
  });

  it("ignores an event belonging to another deployment", async () => {
    const supabase = makeClient();
    const staging = managedEvent({
      extendedProperties: { private: { ...managedProps, haabNamespace: "production" } },
    });
    const { google } = makeGoogle([{ events: [staging], nextSyncToken: "tok-1" }]);

    await expect(run(supabase, google)).resolves.toMatchObject({ staged: 0, ignored: 1 });
  });
});

describe("pagination and the sync token", () => {
  it("exhausts every page before storing the token", async () => {
    const supabase = makeClient();
    const { google, calls } = makeGoogle([
      { events: [managedEvent()], nextPageToken: "p2" },
      { events: [managedEvent({ id: "haab-event-2", etag: '"2"' })], nextSyncToken: "tok-final" },
    ]);

    const summary = await run(supabase, google);

    expect(summary).toMatchObject({ pages: 2, staged: 2, completed: true });
    expect(calls[1].pageToken).toBe("p2");

    const cursor = supabase.upserts.find(
      (entry) => entry.table === "provider_google_calendar_sync_cursors",
    );
    expect(cursor?.rows).toMatchObject({ sync_token: "tok-final" });
  });

  it("stores no token when the run did not reach the last page", async () => {
    const supabase = makeClient();
    // Every page reports another page, so the run stops on its own bound.
    const { google } = makeGoogle([
      { events: [managedEvent()], nextPageToken: "more" },
    ]);

    const summary = await run(supabase, google);

    // Storing a token here would skip whatever was in the pages never fetched.
    expect(summary.completed).toBe(false);
    expect(
      supabase.upserts.some((e) => e.table === "provider_google_calendar_sync_cursors"),
    ).toBe(false);
  });

  it("sends a stored token as an incremental request", async () => {
    const supabase = makeClient({
      cursor: { id: "c1", sync_token: "tok-stored", sync_mode: "incremental", query_version: 1 },
    });
    const { google, calls } = makeGoogle([{ events: [], nextSyncToken: "tok-2" }]);

    const summary = await run(supabase, google);

    expect(calls[0].syncToken).toBe("tok-stored");
    expect(summary.mode).toBe("incremental");
  });

  it("discards a token issued under a different query shape", async () => {
    const supabase = makeClient({
      cursor: { id: "c1", sync_token: "tok-old", sync_mode: "incremental", query_version: 0 },
    });
    const { google, calls } = makeGoogle([{ events: [], nextSyncToken: "tok-new" }]);

    const summary = await run(supabase, google);

    // A token is only valid for the query that produced it; replaying it under
    // a changed query silently misses events.
    expect(calls[0].syncToken).toBeUndefined();
    expect(summary.mode).toBe("full");
  });

  it("clears the cursor and resyncs when Google rejects the token", async () => {
    const supabase = makeClient({
      cursor: { id: "c1", sync_token: "tok-expired", sync_mode: "incremental", query_version: 1 },
    });
    const { google } = makeGoogle(() => {
      throw new GoogleApiError("gone", 410, false);
    });

    const summary = await run(supabase, google);

    expect(summary.skipped).toBe("sync_token_invalid");
    expect(supabase.updates[0]).toMatchObject({
      sync_token: null,
      sync_mode: "resyncing",
    });
  });

  it("does not touch bookings or mappings on a 410", async () => {
    const supabase = makeClient({
      cursor: { id: "c1", sync_token: "tok", sync_mode: "incremental", query_version: 1 },
    });
    const { google } = makeGoogle(() => {
      throw new GoogleApiError("gone", 410, false);
    });

    await run(supabase, google);

    // Only the cursor is written; the mock throws on any other table.
    expect(
      supabase.upserts.some((e) => e.table === "google_calendar_inbound_changes"),
    ).toBe(false);
  });

  it("lets a non-410 failure propagate for the caller to retry", async () => {
    const supabase = makeClient();
    const { google } = makeGoogle(() => {
      throw new GoogleApiError("google_unavailable", 503, true);
    });

    await expect(run(supabase, google)).rejects.toBeInstanceOf(GoogleApiError);
  });
});
