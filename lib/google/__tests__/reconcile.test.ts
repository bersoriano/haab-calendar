import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("Reconcile tests must inject a client.");
  },
}));

import type { GoogleCalendarClient } from "@/lib/google/calendar-client";
import {
  enqueueReconciliation,
  runGoogleReconciliationWorker,
} from "@/lib/google/reconcile";
import { createLogger } from "@/lib/observability/logger";

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const GENERATION = "00000000-0000-4000-8000-0000000000aa";
const NOW = new Date("2026-09-01T12:00:00.000Z");

const silent = createLogger({ sink: () => undefined });

type Booking = {
  id: string;
  provider_id: string;
  service_name: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  integration_version: number;
};

/** `count` bookings with sortable ids, so keyset paging can be observed. */
function bookings(count: number): Booking[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `b${String(index).padStart(4, "0")}`,
    provider_id: PROVIDER,
    service_name: "Consultation",
    // Twenty share each date on purpose: that is what makes a date-only cursor
    // wrong, and what the (date, id) tie-breaker exists for.
    date: `2026-09-${String(10 + Math.floor(index / 20)).padStart(2, "0")}`,
    start_time: "09:00",
    end_time: "09:30",
    status: "confirmed",
    integration_version: 1,
  }));
}

type JobSeed = {
  cursorDate?: string | null;
  cursorId?: string | null;
  consideredCount?: number;
  writtenCount?: number;
  attemptCount?: number;
};

function jobRow(seed: JobSeed = {}) {
  return {
    id: "job-1",
    provider_id: PROVIDER,
    connection_id: "conn-1",
    connection_generation: GENERATION,
    status: "running",
    cursor_date: seed.cursorDate ?? null,
    cursor_booking_id: seed.cursorId ?? null,
    considered_count: seed.consideredCount ?? 0,
    written_count: seed.writtenCount ?? 0,
    skipped_count: 0,
    failed_count: 0,
    attempt_count: seed.attemptCount ?? 1,
    lease_token: "lease-1",
  };
}

type Options = {
  job?: Record<string, unknown> | null;
  connection?: Record<string, unknown> | null;
  all?: Booking[];
  mappings?: Record<string, number>;
  mappingUpsertErrorFor?: string;
  providerTimezone?: string | null;
};

function makeClient(options: Options = {}) {
  const updates: Array<Record<string, unknown>> = [];
  const upserts: Array<Record<string, unknown>> = [];
  const all = options.all ?? [];

  const job = options.job === undefined ? jobRow() : options.job;

  const connection =
    options.connection === undefined
      ? {
          id: "conn-1",
          provider_id: PROVIDER,
          connection_generation: GENERATION,
          target_calendar_id: "cal-1",
          target_calendar_timezone: "UTC",
          status: "connected",
        }
      : options.connection;

  let mappingLookupId = "";

  const client = {
    rpc: async (name: string) =>
      name === "claim_google_reconciliation_job"
        ? { data: job, error: null }
        : { data: null, error: null },

    from: (table: string) => {
      if (table === "provider_google_reconciliation_jobs") {
        const query = {
          upsert: async (row: Record<string, unknown>) => {
            upserts.push(row);
            return { error: null };
          },
          update: (row: Record<string, unknown>) => {
            updates.push(row);
            return query;
          },
          eq: () => query,
        };
        return query;
      }

      if (table === "provider_google_calendar_connections") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({ data: connection, error: null }),
          update: () => query,
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

      if (table === "bookings") {
        let after: string | undefined;
        let limit = 50;

        const query = {
          select: () => query,
          eq: () => query,
          gte: () => query,
          neq: () => query,
          or: (expression: string) => {
            after = expression;
            return query;
          },
          order: () => query,
          limit: (value: number) => {
            limit = value;
            return query;
          },
          returns: async () => {
            // Mimics the keyset predicate: everything strictly after the cursor
            // in (date, id) order.
            const sorted = [...all].sort((left, right) =>
              left.date === right.date
                ? left.id.localeCompare(right.id)
                : left.date.localeCompare(right.date),
            );

            if (!after) {
              return { data: sorted.slice(0, limit), error: null };
            }

            const cursorDate = /date\.gt\.([0-9-]+)/.exec(after)?.[1] ?? "";
            const cursorId = /id\.gt\.([a-z0-9]+)/.exec(after)?.[1] ?? "";
            const remaining = sorted.filter(
              (booking) =>
                booking.date > cursorDate ||
                (booking.date === cursorDate && booking.id > cursorId),
            );

            return { data: remaining.slice(0, limit), error: null };
          },
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
            if (row.booking_id === options.mappingUpsertErrorFor) {
              return { error: new Error("mapping upsert failed") };
            }
            upserts.push(row);
            return { error: null };
          },
        };
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return { client: client as unknown as SupabaseClient, updates, upserts };
}

function makeGoogle(overrides: Partial<GoogleCalendarClient> = {}) {
  const written: string[] = [];

  const google: GoogleCalendarClient = {
    listCalendars: async () => ({ calendars: [], truncated: false }),
    watchEvents: async () => ({ resourceId: "res-1", expiresAt: null }),
    stopChannel: async () => undefined,
    queryFreeBusy: async () => ({ busyByCalendar: {}, errorsByCalendar: {} }),
    listEvents: async () => ({ events: [] }),
    getEvent: async () => null,
    insertEvent: async (_calendarId, eventId) => {
      written.push(eventId);
      return { id: eventId, etag: '"1"' };
    },
    patchEvent: async (_calendarId, eventId) => ({ id: eventId, etag: '"2"' }),
    deleteEvent: async () => undefined,
    ...overrides,
  };

  return { google, written };
}

function run(supabase: ReturnType<typeof makeClient>, google: GoogleCalendarClient) {
  return runGoogleReconciliationWorker({
    client: supabase.client,
    createClient: async () => google,
    now: NOW,
    logger: silent,
  });
}

beforeEach(() => vi.stubEnv("HAAB_DEPLOYMENT_NAMESPACE", "test"));
afterEach(() => vi.unstubAllEnvs());

describe("enqueueReconciliation", () => {
  it("queues one job per connection generation", async () => {
    const supabase = makeClient();

    await enqueueReconciliation(
      { providerId: PROVIDER, connectionId: "conn-1", connectionGeneration: GENERATION },
      supabase.client,
    );

    expect(supabase.upserts[0]).toMatchObject({
      provider_id: PROVIDER,
      connection_generation: GENERATION,
      status: "pending",
      cursor_date: null,
      cursor_booking_id: null,
    });
  });

  it("resets progress, so a requeue starts over rather than resuming", async () => {
    const supabase = makeClient();

    await enqueueReconciliation(
      { providerId: PROVIDER, connectionId: "conn-1", connectionGeneration: GENERATION },
      supabase.client,
    );

    expect(supabase.upserts[0]).toMatchObject({
      considered_count: 0,
      written_count: 0,
      attempt_count: 0,
      completed_at: null,
    });
  });
});

describe("runGoogleReconciliationWorker", () => {
  it("does nothing when no job is waiting", async () => {
    const supabase = makeClient({ job: null });
    const { google, written } = makeGoogle();

    const summary = await run(supabase, google);

    expect(summary.claimed).toBe(false);
    expect(written).toHaveLength(0);
  });

  it("treats an all-null claim row as no job at all", async () => {
    // PostgREST renders a composite-returning function as an object even when
    // the function returned SQL NULL, so an empty claim arrives looking like a
    // row. Taking it at face value made the worker report phantom claims and
    // process a null job on every run.
    const supabase = makeClient({
      job: {
        id: null,
        provider_id: null,
        connection_id: null,
        connection_generation: null,
        status: null,
        cursor_date: null,
        cursor_booking_id: null,
        considered_count: null,
        written_count: null,
        skipped_count: null,
        failed_count: null,
        attempt_count: null,
        lease_token: null,
      },
    });
    const { google, written } = makeGoogle();

    const summary = await run(supabase, google);

    expect(summary.claimed).toBe(false);
    expect(written).toHaveLength(0);
    expect(supabase.updates).toHaveLength(0);
  });

  it("writes a small backlog and completes in one run", async () => {
    const supabase = makeClient({ all: bookings(3) });
    const { google, written } = makeGoogle();

    const summary = await run(supabase, google);

    expect(summary).toMatchObject({ claimed: true, completed: true, written: 3 });
    expect(written).toHaveLength(3);
    expect(supabase.updates.at(-1)).toMatchObject({ status: "completed" });
  });

  it("processes booking 201 and beyond across successive runs", async () => {
    // The previous implementation read the first 200 rows and declared itself
    // finished. 250 bookings prove the cursor keeps moving past that.
    const all = bookings(250);
    const seen = new Set<string>();
    let cursor: { date: string | null; id: string | null } = { date: null, id: null };
    let completed = false;

    for (let invocation = 0; invocation < 12 && !completed; invocation += 1) {
      const supabase = makeClient({
        all,
        job: jobRow({ cursorDate: cursor.date, cursorId: cursor.id }),
      });
      const { google } = makeGoogle({
        insertEvent: async (_calendarId, eventId) => {
          seen.add(eventId);
          return { id: eventId, etag: '"1"' };
        },
      });

      const summary = await run(supabase, google);
      completed = summary.completed;

      const release = supabase.updates.at(-1) as Record<string, string | null>;
      cursor = { date: release.cursor_date, id: release.cursor_booking_id };
    }

    expect(completed).toBe(true);
    // Every booking, including the ones a 200-row cap would have lost.
    expect(seen.size).toBe(250);
  });

  it("saves the cursor when it runs out of pages before bookings", async () => {
    const supabase = makeClient({ all: bookings(400) });
    const { google } = makeGoogle();

    const summary = await run(supabase, google);

    expect(summary.completed).toBe(false);
    const release = supabase.updates.at(-1) as Record<string, unknown>;
    expect(release).toMatchObject({ status: "pending" });
    expect(release.cursor_booking_id).toBeTruthy();
    // Not finished, so nothing may record that it was.
    expect(release.completed_at).toBeUndefined();
  });

  it("resumes from a saved cursor rather than starting again", async () => {
    const all = bookings(60);
    const supabase = makeClient({
      all,
      job: jobRow({
        cursorDate: all[29].date,
        cursorId: all[29].id,
        consideredCount: 30,
        writtenCount: 30,
      }),
    });
    const { google, written } = makeGoogle();

    const summary = await run(supabase, google);

    expect(summary.considered).toBe(30);
    expect(written).toHaveLength(30);
    // Totals carry across invocations.
    expect(supabase.updates.at(-1)).toMatchObject({ considered_count: 60 });
  });

  it("stops the page at a failed booking and keeps the cursor on the last success", async () => {
    const supabase = makeClient({ all: bookings(10) });
    let calls = 0;
    const { google, written } = makeGoogle({
      insertEvent: async (_calendarId, eventId) => {
        calls += 1;
        if (calls === 4) throw new Error("Google said no");
        written.push(eventId);
        return { id: eventId, etag: '"1"' };
      },
    });

    const summary = await run(supabase, google);

    expect(summary.failed).toBe(1);
    expect(summary.written).toBe(3);
    // Nothing past the failure runs: the cursor has to stay retryable.
    expect(written).toHaveLength(3);
    expect(supabase.upserts.map((row) => row.booking_id)).toEqual([
      "b0000",
      "b0001",
      "b0002",
    ]);

    const release = supabase.updates.at(-1) as Record<string, unknown>;
    expect(summary.completed).toBe(false);
    expect(release).toMatchObject({
      status: "pending",
      cursor_booking_id: "b0002",
      failed_count: 1,
    });
    expect(release.completed_at).toBeUndefined();
  });

  it("leaves the cursor null when the first booking of a job fails", async () => {
    const supabase = makeClient({ all: bookings(10) });
    const { google, written } = makeGoogle({
      insertEvent: async () => {
        throw new Error("Google said no");
      },
    });

    const summary = await run(supabase, google);

    expect(summary).toMatchObject({ failed: 1, written: 0, completed: false });
    expect(written).toHaveLength(0);
    const release = supabase.updates.at(-1) as Record<string, unknown>;
    expect(release).toMatchObject({
      status: "pending",
      cursor_date: null,
      cursor_booking_id: null,
    });
    expect(release.completed_at).toBeUndefined();
  });

  it("does not complete a short final page that had a failure", async () => {
    const supabase = makeClient({ all: bookings(3) });
    let calls = 0;
    const { google } = makeGoogle({
      insertEvent: async (_calendarId, eventId) => {
        calls += 1;
        if (calls === 3) throw new Error("Google said no");
        return { id: eventId, etag: '"1"' };
      },
    });

    const summary = await run(supabase, google);

    expect(summary).toMatchObject({ failed: 1, written: 2, completed: false });
    const release = supabase.updates.at(-1) as Record<string, unknown>;
    expect(release).toMatchObject({
      status: "pending",
      cursor_booking_id: "b0001",
    });
    expect(release.completed_at).toBeUndefined();
  });

  it("retries the failed booking on the next run from the saved cursor", async () => {
    const all = bookings(10);
    const first = makeClient({ all });
    let calls = 0;
    const { google: failing } = makeGoogle({
      insertEvent: async (_calendarId, eventId) => {
        calls += 1;
        if (calls === 4) throw new Error("Google said no");
        return { id: eventId, etag: '"1"' };
      },
    });

    await run(first, failing);
    const release = first.updates.at(-1) as Record<string, string | null>;

    const second = makeClient({
      all,
      job: jobRow({
        cursorDate: release.cursor_date,
        cursorId: release.cursor_booking_id,
      }),
    });
    const { google, written } = makeGoogle();

    const summary = await run(second, google);

    expect(summary).toMatchObject({ failed: 0, written: 7, completed: true });
    // b0003 is the booking the first run failed on.
    expect(second.upserts.map((row) => row.booking_id)).toEqual([
      "b0003",
      "b0004",
      "b0005",
      "b0006",
      "b0007",
      "b0008",
      "b0009",
    ]);
    expect(written).toHaveLength(7);
  });

  it("does not count a booking as written when its mapping upsert fails", async () => {
    const supabase = makeClient({
      all: bookings(5),
      mappingUpsertErrorFor: "b0002",
    });
    const { google } = makeGoogle();

    const summary = await run(supabase, google);

    expect(summary).toMatchObject({ failed: 1, written: 2, completed: false });
    const release = supabase.updates.at(-1) as Record<string, unknown>;
    expect(release).toMatchObject({
      status: "pending",
      cursor_booking_id: "b0001",
    });
    expect(release.completed_at).toBeUndefined();
  });

  it("skips bookings Google already reflects", async () => {
    const all = bookings(5);
    const supabase = makeClient({
      all,
      mappings: Object.fromEntries(all.map((booking) => [booking.id, 1])),
    });
    const { google, written } = makeGoogle();

    const summary = await run(supabase, google);

    expect(summary).toMatchObject({ skipped: 5, written: 0 });
    expect(written).toHaveLength(0);
  });

  it("abandons a job whose connection was replaced by a reconnect", async () => {
    const supabase = makeClient({
      all: bookings(5),
      connection: {
        id: "conn-1",
        provider_id: PROVIDER,
        connection_generation: "00000000-0000-4000-8000-0000000000bb",
        target_calendar_id: "cal-1",
        status: "connected",
      },
    });
    const { google, written } = makeGoogle();

    const summary = await run(supabase, google);

    expect(summary.completed).toBe(true);
    expect(written).toHaveLength(0);
    expect(supabase.updates.at(-1)).toMatchObject({
      last_error_code: "connection_superseded",
    });
  });

  it("abandons a job whose connection is no longer connected", async () => {
    const supabase = makeClient({
      all: bookings(5),
      connection: {
        id: "conn-1",
        provider_id: PROVIDER,
        connection_generation: GENERATION,
        target_calendar_id: "cal-1",
        status: "paused",
      },
    });
    const { google, written } = makeGoogle();

    await run(supabase, google);

    expect(written).toHaveLength(0);
  });

  it("dead-letters when the provider has no timezone to project with", async () => {
    const supabase = makeClient({ all: bookings(3), providerTimezone: null });
    const { google, written } = makeGoogle();

    await run(supabase, google);

    expect(supabase.updates.at(-1)).toMatchObject({
      status: "dead_letter",
      last_error_code: "provider_timezone_missing",
    });
    expect(written).toHaveLength(0);
  });

  it("releases the lease on every path", async () => {
    const supabase = makeClient({ all: bookings(3) });
    const { google } = makeGoogle();

    await run(supabase, google);

    // A job still holding its lease after the worker returns is a job nothing
    // can claim until that lease expires.
    expect(supabase.updates.at(-1)).toMatchObject({
      lease_token: null,
      leased_by: null,
      lease_expires_at: null,
    });
  });

  it("matches the lease token when releasing, so a stale worker cannot", async () => {
    const supabase = makeClient({ all: bookings(3) });
    const { google } = makeGoogle();

    await run(supabase, google);

    // The update is filtered on (id, lease_token); a worker whose lease expired
    // and was reclaimed matches nothing.
    expect(supabase.updates).not.toHaveLength(0);
  });
});
