import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createGoogleCalendarClient,
  classifyGoogleFailure,
} from "@/lib/google/calendar-client";
import { buildManagedEventProperties } from "@/lib/google/ids";
import { projectManagedEvent, retractManagedEvent } from "@/lib/google/project-event";

/**
 * A fake Google that answers by method and path, so these assert the real REST
 * sequence — GET then POST, 409 then GET, PATCH with If-Match — rather than a
 * permissive mock that would accept any call order at all.
 */

const NAMESPACE = "test";
const PROVIDER = "00000000-0000-4000-8000-000000000001";
const BOOKING = "00000000-0000-4000-8000-000000000002";
const CALENDAR = "owner@example.invalid";
const EVENT_ID = "haab0123456789";

const OWNER = { namespace: NAMESPACE, providerId: PROVIDER };

const MANAGED_PROPERTIES = buildManagedEventProperties({
  namespace: NAMESPACE,
  providerId: PROVIDER,
  bookingId: BOOKING,
  bookingVersion: 2,
});

const BODY = {
  summary: "Consultation",
  start: { dateTime: "2026-09-01T09:00:00", timeZone: "America/Mexico_City" },
  end: { dateTime: "2026-09-01T09:30:00", timeZone: "America/Mexico_City" },
  privateProperties: MANAGED_PROPERTIES,
};

type Reply = { status?: number; body?: unknown; reason?: string };
type Exchange = { method: string; path: string; headers: Headers; body?: unknown };

function fakeGoogle(replies: Reply[]) {
  const exchanges: Exchange[] = [];
  let index = 0;

  const fetchImpl = (async (url: string, init: RequestInit) => {
    const parsed = new URL(url);
    exchanges.push({
      method: init.method ?? "GET",
      path: parsed.pathname,
      headers: new Headers(init.headers as HeadersInit),
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });

    const reply = replies[Math.min(index, replies.length - 1)];
    index += 1;
    const status = reply.status ?? 200;

    const payload = reply.reason
      ? { error: { errors: [{ reason: reply.reason }] } }
      : (reply.body ?? {});

    return new Response(status === 204 ? null : JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;

  return {
    exchanges,
    client: createGoogleCalendarClient({ accessToken: "ya29.test", fetchImpl }),
  };
}

const managedEvent = (etag = '"1"') => ({
  id: EVENT_ID,
  etag,
  status: "confirmed",
  extendedProperties: { private: MANAGED_PROPERTIES },
});

describe("projectManagedEvent — creating", () => {
  it("reads first, then inserts when nothing is there", async () => {
    const { client, exchanges } = fakeGoogle([
      { status: 404 },
      { body: managedEvent() },
    ]);

    const result = await projectManagedEvent({
      client,
      calendarId: CALENDAR,
      eventId: EVENT_ID,
      bookingId: BOOKING,
      owner: OWNER,
      body: BODY,
    });

    expect(result.outcome).toBe("inserted");
    expect(exchanges.map((exchange) => exchange.method)).toEqual(["GET", "POST"]);
    // Insert goes to the collection, carrying the deterministic id in the body.
    expect(exchanges[1].path).toMatch(/\/events$/);
    expect(exchanges[1].body).toMatchObject({ id: EVENT_ID });
  });

  it("recovers from a 409 by reading and verifying ownership", async () => {
    const { client, exchanges } = fakeGoogle([
      { status: 404 },
      { status: 409 },
      { body: managedEvent('"7"') },
      { body: managedEvent('"8"') },
    ]);

    const result = await projectManagedEvent({
      client,
      calendarId: CALENDAR,
      eventId: EVENT_ID,
      bookingId: BOOKING,
      owner: OWNER,
      body: BODY,
    });

    expect(result.outcome).toBe("patched");
    expect(exchanges.map((exchange) => exchange.method)).toEqual([
      "GET",
      "POST",
      "GET",
      "PATCH",
    ]);
  });

  it("refuses when the 409 turns out to be somebody else's event", async () => {
    const { client, exchanges } = fakeGoogle([
      { status: 404 },
      { status: 409 },
      { body: { id: EVENT_ID, etag: '"9"', extendedProperties: { private: {} } } },
    ]);

    const result = await projectManagedEvent({
      client,
      calendarId: CALENDAR,
      eventId: EVENT_ID,
      bookingId: BOOKING,
      owner: OWNER,
      body: BODY,
    });

    expect(result.outcome).toBe("collision");
    // Nothing was written to an event we do not own.
    expect(exchanges.filter((exchange) => exchange.method === "PATCH")).toHaveLength(0);
  });
});

describe("projectManagedEvent — updating", () => {
  it("patches an existing managed event with its etag", async () => {
    const { client, exchanges } = fakeGoogle([
      { body: managedEvent('"5"') },
      { body: managedEvent('"6"') },
    ]);

    const result = await projectManagedEvent({
      client,
      calendarId: CALENDAR,
      eventId: EVENT_ID,
      bookingId: BOOKING,
      owner: OWNER,
      body: BODY,
    });

    expect(result.outcome).toBe("patched");
    expect(exchanges[1].method).toBe("PATCH");
    expect(exchanges[1].headers.get("if-match")).toBe('"5"');
  });

  it("patches only Haab's fields, leaving the rest of the event alone", async () => {
    const { client, exchanges } = fakeGoogle([
      { body: managedEvent() },
      { body: managedEvent() },
    ]);

    await projectManagedEvent({
      client,
      calendarId: CALENDAR,
      eventId: EVENT_ID,
      bookingId: BOOKING,
      owner: OWNER,
      body: BODY,
    });

    const patch = exchanges[1].body as Record<string, unknown>;
    // Attendees, reminders, colour, conferencing: not ours, not mentioned.
    expect(Object.keys(patch).sort()).toEqual([
      "end",
      "extendedProperties",
      "start",
      "summary",
    ]);
  });

  it("merges private properties instead of replacing them", async () => {
    const existing = {
      id: EVENT_ID,
      etag: '"1"',
      extendedProperties: {
        private: { ...MANAGED_PROPERTIES, someoneElsesMarker: "keep-me" },
      },
    };
    const { client, exchanges } = fakeGoogle([{ body: existing }, { body: existing }]);

    await projectManagedEvent({
      client,
      calendarId: CALENDAR,
      eventId: EVENT_ID,
      bookingId: BOOKING,
      owner: OWNER,
      body: BODY,
    });

    expect(
      (exchanges[1].body as { extendedProperties: { private: Record<string, string> } })
        .extendedProperties.private,
    ).toMatchObject({ someoneElsesMarker: "keep-me", haabManaged: "true" });
  });

  it("never touches an event belonging to another provider", async () => {
    const foreign = {
      id: EVENT_ID,
      etag: '"1"',
      extendedProperties: {
        private: { ...MANAGED_PROPERTIES, haabProviderId: "00000000-0000-4000-8000-0000000000ff" },
      },
    };
    const { client, exchanges } = fakeGoogle([{ body: foreign }]);

    const result = await projectManagedEvent({
      client,
      calendarId: CALENDAR,
      eventId: EVENT_ID,
      bookingId: BOOKING,
      owner: OWNER,
      body: BODY,
    });

    expect(result.outcome).toBe("collision");
    expect(exchanges).toHaveLength(1);
  });

  it("never touches an event from another deployment", async () => {
    const staging = {
      id: EVENT_ID,
      etag: '"1"',
      extendedProperties: {
        private: { ...MANAGED_PROPERTIES, haabNamespace: "staging" },
      },
    };
    const { client } = fakeGoogle([{ body: staging }]);

    await expect(
      projectManagedEvent({
        client,
        calendarId: CALENDAR,
        eventId: EVENT_ID,
        bookingId: BOOKING,
        owner: OWNER,
        body: BODY,
      }),
    ).resolves.toEqual({ outcome: "collision" });
  });

  it("never touches an event mapped to a different booking", async () => {
    const otherBooking = {
      id: EVENT_ID,
      etag: '"1"',
      extendedProperties: {
        private: { ...MANAGED_PROPERTIES, haabBookingId: "00000000-0000-4000-8000-00000000beef" },
      },
    };
    const { client } = fakeGoogle([{ body: otherBooking }]);

    await expect(
      projectManagedEvent({
        client,
        calendarId: CALENDAR,
        eventId: EVENT_ID,
        bookingId: BOOKING,
        owner: OWNER,
        body: BODY,
      }),
    ).resolves.toEqual({ outcome: "collision" });
  });

  it("re-reads and retries once when the etag went stale", async () => {
    const { client, exchanges } = fakeGoogle([
      { body: managedEvent('"1"') },
      { status: 412 },
      { body: managedEvent('"2"') },
      { body: managedEvent('"3"') },
    ]);

    const result = await projectManagedEvent({
      client,
      calendarId: CALENDAR,
      eventId: EVENT_ID,
      bookingId: BOOKING,
      owner: OWNER,
      body: BODY,
    });

    expect(result.outcome).toBe("patched");
    expect(exchanges.map((exchange) => exchange.method)).toEqual([
      "GET",
      "PATCH",
      "GET",
      "PATCH",
    ]);
    expect(exchanges[3].headers.get("if-match")).toBe('"2"');
  });

  it("re-verifies ownership after a 412 before retrying", async () => {
    const { client, exchanges } = fakeGoogle([
      { body: managedEvent('"1"') },
      { status: 412 },
      { body: { id: EVENT_ID, etag: '"2"', extendedProperties: { private: {} } } },
    ]);

    const result = await projectManagedEvent({
      client,
      calendarId: CALENDAR,
      eventId: EVENT_ID,
      bookingId: BOOKING,
      owner: OWNER,
      body: BODY,
    });

    // Somebody replaced the event between our read and our write; it is no
    // longer ours to patch.
    expect(result.outcome).toBe("collision");
    expect(exchanges.filter((exchange) => exchange.method === "PATCH")).toHaveLength(1);
  });

  it("inserts when the event vanished between read and patch", async () => {
    const { client } = fakeGoogle([
      { body: managedEvent('"1"') },
      { status: 412 },
      { status: 404 },
      { body: managedEvent('"2"') },
    ]);

    await expect(
      projectManagedEvent({
        client,
        calendarId: CALENDAR,
        eventId: EVENT_ID,
        bookingId: BOOKING,
        owner: OWNER,
        body: BODY,
      }),
    ).resolves.toMatchObject({ outcome: "inserted" });
  });
});

describe("retractManagedEvent", () => {
  it("reads, verifies, then deletes with the etag", async () => {
    const { client, exchanges } = fakeGoogle([
      { body: managedEvent('"4"') },
      { status: 204 },
    ]);

    const result = await retractManagedEvent({
      client,
      calendarId: CALENDAR,
      eventId: EVENT_ID,
      bookingId: BOOKING,
      owner: OWNER,
    });

    expect(result).toEqual({ outcome: "deleted" });
    expect(exchanges[1].method).toBe("DELETE");
    expect(exchanges[1].headers.get("if-match")).toBe('"4"');
  });

  it("treats an absent event as done", async () => {
    const { client, exchanges } = fakeGoogle([{ status: 404 }]);

    await expect(
      retractManagedEvent({
        client,
        calendarId: CALENDAR,
        eventId: EVENT_ID,
        bookingId: BOOKING,
        owner: OWNER,
      }),
    ).resolves.toEqual({ outcome: "already_absent" });
    expect(exchanges).toHaveLength(1);
  });

  it("refuses to delete an event it does not own", async () => {
    const { client, exchanges } = fakeGoogle([
      { body: { id: EVENT_ID, extendedProperties: { private: {} } } },
    ]);

    const result = await retractManagedEvent({
      client,
      calendarId: CALENDAR,
      eventId: EVENT_ID,
      bookingId: BOOKING,
      owner: OWNER,
    });

    expect(result).toEqual({ outcome: "collision" });
    expect(exchanges.filter((exchange) => exchange.method === "DELETE")).toHaveLength(0);
  });
});

describe("classifyGoogleFailure", () => {
  it("separates a usage limit from a permission refusal on 403", () => {
    // The same status means opposite things, and retrying the wrong one either
    // burns quota forever or gives up on a request that would have succeeded.
    expect(classifyGoogleFailure(403, "rateLimitExceeded")).toEqual({
      code: "rate_limited",
      retryable: true,
    });
    expect(classifyGoogleFailure(403, "userRateLimitExceeded").retryable).toBe(true);
    expect(classifyGoogleFailure(403, "insufficientPermissions")).toEqual({
      code: "forbidden",
      retryable: false,
    });
    expect(classifyGoogleFailure(403, undefined).retryable).toBe(false);
  });

  it("treats a revoked grant as permanent", () => {
    expect(classifyGoogleFailure(401)).toEqual({
      code: "unauthorized",
      retryable: false,
    });
  });

  it("treats rate limits and outages as retryable", () => {
    expect(classifyGoogleFailure(429).retryable).toBe(true);
    expect(classifyGoogleFailure(500).retryable).toBe(true);
    expect(classifyGoogleFailure(503).retryable).toBe(true);
  });

  it("treats a malformed request as permanent", () => {
    expect(classifyGoogleFailure(400)).toEqual({
      code: "invalid_request",
      retryable: false,
    });
  });

  it("names the conditions the projection recovers from", () => {
    expect(classifyGoogleFailure(409).code).toBe("already_exists");
    expect(classifyGoogleFailure(412).code).toBe("precondition_failed");
  });

  it("keeps calendar identifiers out of the error", async () => {
    const { client } = fakeGoogle([
      { status: 403, body: { error: { message: `no access to ${CALENDAR}` } } },
    ]);

    await expect(client.getEvent(CALENDAR, EVENT_ID)).rejects.toSatisfy(
      (error: Error) => !error.message.includes(CALENDAR),
    );
  });
});
