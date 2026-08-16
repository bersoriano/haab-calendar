import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createGoogleCalendarClient,
  GoogleApiError,
} from "@/lib/google/calendar-client";

type Call = { url: string; init: RequestInit };

function makeFetch(responses: Array<{ status?: number; body?: unknown }>) {
  const calls: Call[] = [];
  let index = 0;

  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses[Math.min(index, responses.length - 1)];
    index += 1;

    const status = next.status ?? 200;

    // 204 legally carries no body, and constructing one with a body throws.
    return new Response(status === 204 ? null : JSON.stringify(next.body ?? {}), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;

  return { fetchImpl, calls };
}

function client(responses: Array<{ status?: number; body?: unknown }>) {
  const { fetchImpl, calls } = makeFetch(responses);

  return {
    calls,
    api: createGoogleCalendarClient({ accessToken: "ya29.test", fetchImpl }),
  };
}

describe("listCalendars", () => {
  it("asks only for writable calendars and minimal fields", async () => {
    const { api, calls } = client([
      {
        body: {
          items: [
            {
              id: "primary@example.invalid",
              summary: "Work",
              timeZone: "America/Mexico_City",
              accessRole: "owner",
              primary: true,
            },
          ],
        },
      },
    ]);

    const calendars = await api.listCalendars();

    const url = new URL(calls[0].url);
    expect(url.searchParams.get("minAccessRole")).toBe("writer");
    expect(url.searchParams.get("fields")).toBe(
      "items(id,summary,timeZone,accessRole,primary)",
    );
    expect(calendars[0]).toEqual({
      id: "primary@example.invalid",
      summary: "Work",
      timeZone: "America/Mexico_City",
      accessRole: "owner",
      primary: true,
    });
  });

  it("survives a calendar with no summary", async () => {
    const { api } = client([{ body: { items: [{ id: "c1" }] } }]);

    expect((await api.listCalendars())[0]).toMatchObject({
      summary: "Calendar",
      accessRole: "reader",
      primary: false,
    });
  });

  it("returns nothing when the account has no calendars", async () => {
    const { api } = client([{ body: {} }]);

    await expect(api.listCalendars()).resolves.toEqual([]);
  });
});

describe("upsertEvent", () => {
  const event = {
    eventId: "haab0123456789",
    summary: "Consultation",
    start: { dateTime: "2026-09-01T09:00:00-06:00", timeZone: "America/Mexico_City" },
    end: { dateTime: "2026-09-01T09:30:00-06:00", timeZone: "America/Mexico_City" },
    privateProperties: { haabManaged: "true" },
  };

  it("PUTs to the client-chosen id, which makes a replay idempotent", async () => {
    const { api, calls } = client([{ body: { id: event.eventId, etag: '"1"' } }]);

    await api.upsertEvent("cal@example.invalid", event);

    expect(calls[0].init.method).toBe("PUT");
    expect(calls[0].url).toContain(`/events/${event.eventId}`);
    expect(calls[0].url).toContain("cal%40example.invalid");
  });

  it("suppresses Google's guest notifications", async () => {
    const { api, calls } = client([{ body: {} }]);

    await api.upsertEvent("cal", event);

    // Haab sends its own confirmations; Google must not email anyone as well.
    expect(new URL(calls[0].url).searchParams.get("sendUpdates")).toBe("none");
  });

  it("requests only the fields the projection reads back", async () => {
    const { api, calls } = client([{ body: {} }]);

    await api.upsertEvent("cal", event);

    const fields = new URL(calls[0].url).searchParams.get("fields") ?? "";
    expect(fields).toContain("id,etag,status,updated,start,end");
    expect(fields).not.toContain("summary");
    expect(fields).not.toContain("attendees");
  });

  it("sends the private properties that mark the event as ours", async () => {
    const { api, calls } = client([{ body: {} }]);

    await api.upsertEvent("cal", event);

    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({
      id: event.eventId,
      extendedProperties: { private: { haabManaged: "true" } },
    });
  });

  it("classifies a rate limit and an outage as retryable", async () => {
    const limited = client([{ status: 429 }]);
    const down = client([{ status: 503 }]);

    await expect(limited.api.upsertEvent("cal", event)).rejects.toMatchObject({
      code: "rate_limited",
      retryable: true,
    });
    await expect(down.api.upsertEvent("cal", event)).rejects.toMatchObject({
      retryable: true,
    });
  });

  it("classifies a revoked grant as permanent", async () => {
    const { api } = client([{ status: 401 }]);

    // Retrying a revoked token forever would just burn quota; the connection
    // needs a human to reconnect.
    await expect(api.upsertEvent("cal", event)).rejects.toMatchObject({
      code: "unauthorized",
      retryable: false,
    });
  });

  it("never puts Google's response body in the error", async () => {
    const { api } = client([
      { status: 403, body: { error: { message: "calendar owner@example.invalid" } } },
    ]);

    await expect(api.upsertEvent("cal", event)).rejects.toSatisfy(
      (error: Error) => !error.message.includes("owner@example.invalid"),
    );
  });

  it("treats a network failure as retryable", async () => {
    const failing = (async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;

    const api = createGoogleCalendarClient({
      accessToken: "ya29",
      fetchImpl: failing,
    });

    await expect(api.upsertEvent("cal", event)).rejects.toMatchObject({
      code: "network_failed",
      retryable: true,
    });
  });
});

describe("cancelEvent", () => {
  it("deletes the event", async () => {
    const { api, calls } = client([{ status: 204 }]);

    await api.cancelEvent("cal", "haab0123");

    expect(calls[0].init.method).toBe("DELETE");
  });

  it("treats an already-deleted event as success", async () => {
    // A replayed cancellation must not fail forever on the second attempt.
    const gone = client([{ status: 404 }]);
    const alreadyGone = client([{ status: 410 }]);

    await expect(gone.api.cancelEvent("cal", "e")).resolves.toBeUndefined();
    await expect(alreadyGone.api.cancelEvent("cal", "e")).resolves.toBeUndefined();
  });

  it("still reports a real failure", async () => {
    const { api } = client([{ status: 500 }]);

    await expect(api.cancelEvent("cal", "e")).rejects.toBeInstanceOf(GoogleApiError);
  });
});

describe("getEvent", () => {
  it("returns null for an event that is not there", async () => {
    const { api } = client([{ status: 404 }]);

    await expect(api.getEvent("cal", "e")).resolves.toBeNull();
  });

  it("returns the event when it exists", async () => {
    const { api } = client([{ body: { id: "e1", status: "confirmed" } }]);

    await expect(api.getEvent("cal", "e1")).resolves.toMatchObject({ id: "e1" });
  });
});
