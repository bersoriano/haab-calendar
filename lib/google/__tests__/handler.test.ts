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

import { GoogleApiError, type GoogleCalendarClient } from "@/lib/google/calendar-client";
import { createGoogleCalendarHandler } from "@/lib/google/handler";
import { managedEventId } from "@/lib/google/ids";
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
          maybeSingle: async () => ({ data: options.mapping ?? null, error: null }),
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

  return { client: client as unknown as SupabaseClient, upserts };
}

function makeGoogle(overrides: Partial<GoogleCalendarClient> = {}) {
  const calls: Array<{ op: string; args: unknown }> = [];

  const google: GoogleCalendarClient = {
    listCalendars: async () => [],
    upsertEvent: async (calendarId, input) => {
      calls.push({ op: "upsert", args: { calendarId, input } });
      return { id: input.eventId, etag: '"1"' };
    },
    cancelEvent: async (calendarId, eventId) => {
      calls.push({ op: "cancel", args: { calendarId, eventId } });
    },
    getEvent: async () => null,
    ...overrides,
  };

  return { google, calls };
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
    expect(calls[0].op).toBe("upsert");
    expect(calls[0].args).toMatchObject({
      calendarId: CALENDAR,
      input: {
        eventId: managedEventId({
          namespace: "test",
          providerId: PROVIDER,
          bookingId: BOOKING,
        }),
        summary: "Consultation",
      },
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
    const { input } = calls[0].args as { input: Record<string, unknown> };
    expect(input.summary).toBe("Consultation");
    expect(JSON.stringify(input)).not.toMatch(/client|@example|notes/i);
  });

  it("stamps ownership so the event can be recognised later", async () => {
    const supabase = makeSupabase();
    const { google, calls } = makeGoogle();

    await handlerFor(supabase, google).deliver(event());

    expect(
      (calls[0].args as { input: { privateProperties: Record<string, string> } }).input
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
    expect(calls[0].op).toBe("cancel");
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

    expect(calls[0].op).toBe("upsert");
  });

  it("records the version it projected", async () => {
    const supabase = makeSupabase();
    const { google } = makeGoogle();

    await handlerFor(supabase, google).deliver(event({ aggregateVersion: 4 }));

    expect(supabase.upserts[0]).toMatchObject({
      booking_id: BOOKING,
      connection_generation: GENERATION,
      last_projected_booking_version: 4,
    });
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
      upsertEvent: async () => {
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
      upsertEvent: async () => {
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
      upsertEvent: async () => {
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
