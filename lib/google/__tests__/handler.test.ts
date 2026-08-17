import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    throw new Error("Handler tests must inject a client.");
  },
}));

import {
  GoogleApiError,
  type GoogleCalendarClient,
  type GoogleEvent,
} from "@/lib/google/calendar-client";
import { createGoogleCalendarHandler } from "@/lib/google/handler";
import { buildManagedEventProperties, managedEventId } from "@/lib/google/ids";
import type { IntegrationOutboxEvent } from "@/lib/integrations/outbox/types";

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const BOOKING = "00000000-0000-4000-8000-000000000002";
const GENERATION = "00000000-0000-4000-8000-0000000000aa";
const CALENDAR = "owner@example.invalid";

function event(overrides: Partial<IntegrationOutboxEvent> = {}): IntegrationOutboxEvent {
  return {
    id: "00000000-0000-4000-8000-00000000000e",
    providerId: PROVIDER,
    bookingId: BOOKING,
    aggregateVersion: 2,
    eventType: "booking.updated",
    payloadSchemaVersion: 1,
    payload: {
      bookingId: BOOKING,
      providerId: PROVIDER,
      aggregateVersion: 2,
      change: "booking.updated",
    },
    attemptCount: 1,
    leaseToken: "lease-1",
    ...overrides,
  };
}

type Options = {
  providerTimezone?: string | null;
  mappingError?: { message: string };
  upsertError?: { message: string };
  connection?: Record<string, unknown> | null;
  booking?: Record<string, unknown> | null;
  bookingError?: { message: string };
  mapping?: Record<string, unknown> | null;
};

function makeSupabase(options: Options = {}) {
  const upserts: Array<Record<string, unknown>> = [];

  const connection =
    options.connection === undefined
      ? {
          id: "conn-1",
          provider_id: PROVIDER,
          connection_generation: GENERATION,
          target_calendar_id: CALENDAR,
          target_calendar_timezone: "America/Mexico_City",
          status: "connected",
          refresh_token_ciphertext: "c",
          refresh_token_iv: "i",
          refresh_token_auth_tag: "t",
          refresh_token_key_version: 1,
          granted_scopes: [],
        }
      : options.connection;

  const booking =
    options.booking === undefined
      ? {
          id: BOOKING,
          provider_id: PROVIDER,
          service_name: "Consultation",
          date: "2026-09-01",
          start_time: "09:00",
          end_time: "09:30",
          status: "confirmed",
          integration_version: 2,
        }
      : options.booking;

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

      if (table === "providers") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({
            data:
              options.providerTimezone === null
                ? { id: PROVIDER, timezone: null }
                : { id: PROVIDER, timezone: options.providerTimezone ?? "America/Mexico_City" },
            error: null,
          }),
        };
        return query;
      }

      if (table === "bookings") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({
            data: options.bookingError ? null : booking,
            error: options.bookingError ?? null,
          }),
        };
        return query;
      }

      if (table === "provider_google_calendar_event_mappings") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({
            data: options.mappingError ? null : (options.mapping ?? null),
            error: options.mappingError ?? null,
          }),
          upsert: async (row: Record<string, unknown>) => {
            upserts.push(row);
            return { error: options.upsertError ?? null };
          },
        };
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return { client: client as unknown as SupabaseClient, upserts };
}

function makeGoogle(overrides: Partial<GoogleCalendarClient> = {}) {
  const calls: Array<{ op: string; args: unknown }> = [];
  let stored: GoogleEvent | null = null;

  const google: GoogleCalendarClient = {
    listCalendars: async () => ({ calendars: [], truncated: false }),
    getEvent: async () => stored,
    insertEvent: async (calendarId, eventId, body) => {
      calls.push({ op: "insert", args: { calendarId, eventId, body } });
      stored = {
        id: eventId,
        etag: '"1"',
        extendedProperties: { private: body.privateProperties },
      };
      return stored;
    },
    patchEvent: async (calendarId, eventId, body) => {
      calls.push({ op: "patch", args: { calendarId, eventId, body } });
      return { id: eventId, etag: '"2"' };
    },
    deleteEvent: async (calendarId, eventId) => {
      calls.push({ op: "delete", args: { calendarId, eventId } });
    },
    ...overrides,
  };

  return { google, calls };
}

/** A fake holding an event already owned by this provider and booking. */
function makeGoogleWithManagedEvent(overrides: Partial<GoogleCalendarClient> = {}) {
  const existing: GoogleEvent = {
    id: "existing",
    etag: '"1"',
    extendedProperties: {
      private: buildManagedEventProperties({
        namespace: "test",
        providerId: PROVIDER,
        bookingId: BOOKING,
        bookingVersion: 1,
      }),
    },
  };

  return makeGoogle({ getEvent: async () => existing, ...overrides });
}

function handlerFor(supabase: ReturnType<typeof makeSupabase>, google: GoogleCalendarClient) {
  return createGoogleCalendarHandler({
    client: supabase.client,
    createClient: async () => google,
  });
}

beforeEach(() => {
  entitlements.entitled = true;
  entitlements.throws = false;
  vi.stubEnv("GOOGLE_CLIENT_ID", "id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
  vi.stubEnv("GOOGLE_OAUTH_REDIRECT_URI", "https://haab.test/cb");
  vi.stubEnv("GOOGLE_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 3).toString("base64"));
  vi.stubEnv("HAAB_DEPLOYMENT_NAMESPACE", "test");
});

afterEach(() => vi.unstubAllEnvs());

describe("google calendar handler", () => {
  it("takes every booking event", () => {
    const handler = createGoogleCalendarHandler();

    expect(handler.supports(event({ eventType: "booking.created" }))).toBe(true);
    expect(handler.supports(event({ eventType: "booking.cancelled" }))).toBe(true);
  });

  it("writes the event to the connected calendar", async () => {
    const supabase = makeSupabase();
    const { google, calls } = makeGoogle();

    const result = await handlerFor(supabase, google).deliver(event());

    expect(result).toEqual({ outcome: "succeeded" });
    expect(calls[0].op).toBe("insert");
    expect(calls[0].args).toMatchObject({
      calendarId: CALENDAR,
      eventId: managedEventId({
        namespace: "test",
        providerId: PROVIDER,
        bookingId: BOOKING,
      }),
      body: { summary: "Consultation" },
    });
  });

  it("titles the event with the service, never the client", async () => {
    const supabase = makeSupabase({
      booking: {
        id: BOOKING,
        provider_id: PROVIDER,
        service_name: "Consultation",
        date: "2026-09-01",
        start_time: "09:00",
        end_time: "09:30",
        status: "confirmed",
        integration_version: 2,
      },
    });
    const { google, calls } = makeGoogle();

    await handlerFor(supabase, google).deliver(event());

    // A calendar can be shared. Haab is not the system that decides who may
    // see a client's name. Asserted on the event body only — the calendar id
    // legitimately is the account's address.
    const { body } = calls[0].args as { body: Record<string, unknown> };
    expect(body.summary).toBe("Consultation");
    expect(JSON.stringify(body)).not.toMatch(/client|@example|notes/i);
  });

  it("stamps ownership so the event can be recognised later", async () => {
    const supabase = makeSupabase();
    const { google, calls } = makeGoogle();

    await handlerFor(supabase, google).deliver(event());

    expect(
      (calls[0].args as { body: { privateProperties: Record<string, string> } }).body
        .privateProperties,
    ).toMatchObject({
      haabManaged: "true",
      haabNamespace: "test",
      haabProviderId: PROVIDER,
      haabBookingId: BOOKING,
      haabBookingVersion: "2",
    });
  });

  it("deletes the Google event when the booking is cancelled", async () => {
    const supabase = makeSupabase({
      booking: {
        id: BOOKING,
        provider_id: PROVIDER,
        service_name: "Consultation",
        date: "2026-09-01",
        start_time: "09:00",
        end_time: "09:30",
        status: "cancelled",
        integration_version: 3,
      },
    });
    const { google, calls } = makeGoogle();

    const result = await handlerFor(supabase, google).deliver(
      event({ eventType: "booking.cancelled", aggregateVersion: 3 }),
    );

    expect(result).toEqual({ outcome: "succeeded" });
    // Nothing to delete: the fake holds no event, so the retraction is a no-op.
    expect(calls.filter((call) => call.op === "delete")).toHaveLength(0);
  });

  it("answers a replayed delivery without calling Google", async () => {
    const supabase = makeSupabase({
      mapping: {
        id: "map-1",
        google_event_id: "haabxxx",
        google_calendar_id: CALENDAR,
        last_projected_booking_version: 2,
      },
    });
    const { google, calls } = makeGoogle();

    // Google already reflects version 2; this is the same delivery again.
    const result = await handlerFor(supabase, google).deliver(event({ aggregateVersion: 2 }));

    expect(result).toEqual({ outcome: "succeeded" });
    expect(calls).toHaveLength(0);
  });

  it("still projects a newer version over an older mapping", async () => {
    const supabase = makeSupabase({
      mapping: {
        id: "map-1",
        google_event_id: "haabxxx",
        google_calendar_id: CALENDAR,
        last_projected_booking_version: 1,
      },
    });
    const { google, calls } = makeGoogle();

    await handlerFor(supabase, google).deliver(event({ aggregateVersion: 2 }));

    expect(calls[0].op).toBe("insert");
  });

  it("records the booking's current version, not the event's", async () => {
    const supabase = makeSupabase();
    const { google } = makeGoogle();

    // The outbox event is older than the booking. The booking's current state
    // is what belongs on the calendar, and the mapping records that — recording
    // the event's version would make a later replay look like new work.
    await handlerFor(supabase, google).deliver(event({ aggregateVersion: 1 }));

    expect(supabase.upserts[0]).toMatchObject({
      booking_id: BOOKING,
      connection_generation: GENERATION,
      last_projected_booking_version: 2,
    });
  });

  it("stamps the projected version into the event's ownership properties", async () => {
    const supabase = makeSupabase();
    const { google, calls } = makeGoogle();

    await handlerFor(supabase, google).deliver(event({ aggregateVersion: 1 }));

    expect(
      (calls[0].args as { body: { privateProperties: Record<string, string> } }).body
        .privateProperties.haabBookingVersion,
    ).toBe("2");
  });

  it("refuses a booking that belongs to another provider", async () => {
    // The fake answers the (id, provider_id) query with nothing, which is what
    // a cross-tenant booking id looks like from here.
    const supabase = makeSupabase({ booking: null });
    const { google, calls } = makeGoogle();

    const result = await handlerFor(supabase, google).deliver(event());

    expect(result).toEqual({ outcome: "skipped", reasonCode: "booking_gone" });
    expect(calls).toHaveLength(0);
  });

  it("refuses a connection belonging to a different provider", async () => {
    const supabase = makeSupabase({
      connection: {
        id: "conn-1",
        provider_id: "00000000-0000-4000-8000-0000000000ff",
        connection_generation: GENERATION,
        target_calendar_id: CALENDAR,
        status: "connected",
      },
    });
    const { google, calls } = makeGoogle();

    const result = await handlerFor(supabase, google).deliver(event());

    expect(result).toEqual({
      outcome: "permanent_failure",
      errorCode: "connection_tenant_mismatch",
    });
    expect(calls).toHaveLength(0);
  });

  it("retries when the mapping could not be read", async () => {
    const supabase = makeSupabase({ mappingError: { message: "timeout" } });
    const { google, calls } = makeGoogle();

    const result = await handlerFor(supabase, google).deliver(event());

    // Without the mapping there is no way to tell a replay from new work.
    expect(result).toEqual({
      outcome: "retryable_failure",
      errorCode: "mapping_read_failed",
    });
    expect(calls).toHaveLength(0);
  });

  it("retries when the mapping could not be written, despite the Google write", async () => {
    const supabase = makeSupabase({ upsertError: { message: "deadlock" } });
    const { google } = makeGoogle();

    const result = await handlerFor(supabase, google).deliver(event());

    // Reporting success would lose the record of what was written; the
    // projection is idempotent, so retrying is safe.
    expect(result).toEqual({
      outcome: "retryable_failure",
      errorCode: "mapping_write_failed",
    });
  });

  it("refuses permanently when the id belongs to somebody else's event", async () => {
    const supabase = makeSupabase();
    const foreign = makeGoogle({
      getEvent: async () => ({
        id: "existing",
        etag: '"1"',
        extendedProperties: { private: { haabManaged: "true" } },
      }),
    });

    const result = await handlerFor(supabase, foreign.google).deliver(event());

    expect(result).toEqual({
      outcome: "permanent_failure",
      errorCode: "event_id_collision",
    });
    expect(foreign.calls.filter((call) => call.op === "patch")).toHaveLength(0);
  });

  it("patches an event it already owns rather than inserting again", async () => {
    const supabase = makeSupabase();
    const { google, calls } = makeGoogleWithManagedEvent();

    await handlerFor(supabase, google).deliver(event());

    expect(calls[0].op).toBe("patch");
  });

  it("deletes the owned event when the booking is cancelled", async () => {
    const supabase = makeSupabase({
      booking: {
        id: BOOKING,
        provider_id: PROVIDER,
        service_name: "Consultation",
        date: "2026-09-01",
        start_time: "09:00",
        end_time: "09:30",
        status: "cancelled",
        integration_version: 3,
      },
    });
    const { google, calls } = makeGoogleWithManagedEvent();

    const result = await handlerFor(supabase, google).deliver(
      event({ eventType: "booking.cancelled", aggregateVersion: 3 }),
    );

    expect(result).toEqual({ outcome: "succeeded" });
    expect(calls[0].op).toBe("delete");
  });

  it("uses the provider's timezone, never the calendar's", async () => {
    const supabase = makeSupabase({ providerTimezone: "America/New_York" });
    const { google, calls } = makeGoogle();

    await handlerFor(supabase, google).deliver(event());

    // The connection's calendar is America/Mexico_City; the provider works in
    // New York, and the booking's wall time is theirs.
    expect((calls[0].args as { body: { start: { timeZone: string } } }).body.start.timeZone).toBe(
      "America/New_York",
    );
  });

  it("fails permanently when the provider has no timezone to project with", async () => {
    const supabase = makeSupabase({ providerTimezone: null });
    const { google, calls } = makeGoogle();

    const result = await handlerFor(supabase, google).deliver(event());

    expect(result).toEqual({
      outcome: "permanent_failure",
      errorCode: "provider_timezone_missing",
    });
    expect(calls).toHaveLength(0);
  });

  it("skips a provider with no connection", async () => {
    const supabase = makeSupabase({ connection: null });
    const { google, calls } = makeGoogle();

    const result = await handlerFor(supabase, google).deliver(event());

    expect(result).toEqual({ outcome: "skipped", reasonCode: "no_google_connection" });
    expect(calls).toHaveLength(0);
  });

  it("skips a connection that has not chosen a calendar", async () => {
    const supabase = makeSupabase({
      connection: {
        id: "conn-1",
        provider_id: PROVIDER,
        connection_generation: GENERATION,
        target_calendar_id: null,
        status: "connected",
      },
    });
    const { google } = makeGoogle();

    await expect(handlerFor(supabase, google).deliver(event())).resolves.toMatchObject({
      outcome: "skipped",
    });
  });

  it.each(["needs_reauth", "paused", "disconnected"])(
    "skips a %s connection rather than retrying it",
    async (status) => {
      const supabase = makeSupabase({
        connection: {
          id: "conn-1",
          provider_id: PROVIDER,
          connection_generation: GENERATION,
          target_calendar_id: CALENDAR,
          status,
        },
      });
      const { google, calls } = makeGoogle();

      const result = await handlerFor(supabase, google).deliver(event());

      // A human has to fix these; retrying would only burn attempts.
      expect(result).toEqual({ outcome: "skipped", reasonCode: `connection_${status}` });
      expect(calls).toHaveLength(0);
    },
  );

  it("skips when the entitlement has gone, re-checked at delivery time", async () => {
    entitlements.entitled = false;
    const supabase = makeSupabase();
    const { google, calls } = makeGoogle();

    const result = await handlerFor(supabase, google).deliver(event());

    expect(result).toEqual({ outcome: "skipped", reasonCode: "not_entitled" });
    expect(calls).toHaveLength(0);
  });

  it("skips when Google is not configured at all", async () => {
    vi.unstubAllEnvs();
    const supabase = makeSupabase();
    const { google } = makeGoogle();

    await expect(handlerFor(supabase, google).deliver(event())).resolves.toEqual({
      outcome: "skipped",
      reasonCode: "google_not_configured",
    });
  });

  it("skips a booking that no longer exists", async () => {
    const supabase = makeSupabase({ booking: null });
    const { google } = makeGoogle();

    await expect(handlerFor(supabase, google).deliver(event())).resolves.toEqual({
      outcome: "skipped",
      reasonCode: "booking_gone",
    });
  });

  it("retries when the booking could not be read", async () => {
    const supabase = makeSupabase({ bookingError: { message: "timeout" } });
    const { google } = makeGoogle();

    await expect(handlerFor(supabase, google).deliver(event())).resolves.toEqual({
      outcome: "retryable_failure",
      errorCode: "booking_read_failed",
    });
  });

  it("passes Google's retryable failures through as retryable", async () => {
    const supabase = makeSupabase();
    const { google } = makeGoogle({
      insertEvent: async () => {
        throw new GoogleApiError("rate_limited", 429, true);
      },
    });

    await expect(handlerFor(supabase, google).deliver(event())).resolves.toEqual({
      outcome: "retryable_failure",
      errorCode: "rate_limited",
    });
  });

  it("dead-letters a revoked grant instead of retrying forever", async () => {
    const supabase = makeSupabase();
    const { google } = makeGoogle({
      insertEvent: async () => {
        throw new GoogleApiError("unauthorized", 401, false);
      },
    });

    await expect(handlerFor(supabase, google).deliver(event())).resolves.toEqual({
      outcome: "permanent_failure",
      errorCode: "unauthorized",
    });
  });

  it("treats an unrecognised failure as retryable", async () => {
    const supabase = makeSupabase();
    const { google } = makeGoogle({
      insertEvent: async () => {
        throw new Error("something unexpected");
      },
    });

    await expect(handlerFor(supabase, google).deliver(event())).resolves.toMatchObject({
      outcome: "retryable_failure",
      errorCode: "google_handler_failed",
    });
  });

  it("retries when the entitlement itself could not be resolved", async () => {
    entitlements.throws = true;
    const supabase = makeSupabase();
    const { google, calls } = makeGoogle();

    const result = await handlerFor(supabase, google).deliver(event());

    // Unknown is not "yes": nothing is written to Google on an unresolved
    // entitlement.
    expect(result).toMatchObject({ outcome: "retryable_failure" });
    expect(calls).toHaveLength(0);
  });
});
