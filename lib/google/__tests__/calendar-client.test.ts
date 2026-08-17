import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createGoogleCalendarClient,
  GoogleApiError,
} from "@/lib/google/calendar-client";

type Call = { url: string; init: RequestInit };

function makeFetch(
  responses: Array<{ status?: number; body?: unknown; reason?: string }>,
) {
  const calls: Call[] = [];
  let index = 0;

  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses[Math.min(index, responses.length - 1)];
    index += 1;

    const status = next.status ?? 200;
    const payload = next.reason
      ? { error: { errors: [{ reason: next.reason }] } }
      : (next.body ?? {});

    // 204 legally carries no body, and constructing one with a body throws.
    return new Response(status === 204 ? null : JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;

  return { fetchImpl, calls };
}

function client(responses: Array<{ status?: number; body?: unknown; reason?: string }>) {
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

    const { calendars } = await api.listCalendars();

    const url = new URL(calls[0].url);
    expect(url.searchParams.get("minAccessRole")).toBe("writer");
    // nextPageToken is needed to follow pagination; the item fields stay
    // minimal.
    expect(url.searchParams.get("fields")).toBe(
      "nextPageToken,items(id,summary,timeZone,accessRole,primary)",
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

    expect((await api.listCalendars()).calendars[0]).toMatchObject({
      summary: "Calendar",
      accessRole: "reader",
      primary: false,
    });
  });

  it("follows nextPageToken until Google stops sending one", async () => {
    const { fetchImpl, calls } = makeFetch([
      { body: { items: [{ id: "c1" }], nextPageToken: "page-2" } },
      { body: { items: [{ id: "c2" }] } },
    ]);
    const api = createGoogleCalendarClient({ accessToken: "ya29", fetchImpl });

    const { calendars, truncated } = await api.listCalendars();

    expect(calendars.map((calendar) => calendar.id)).toEqual(["c1", "c2"]);
    expect(truncated).toBe(false);
    expect(new URL(calls[1].url).searchParams.get("pageToken")).toBe("page-2");
  });

  it("stops after a bounded number of pages and says it did", async () => {
    // An account with thousands of calendars must not turn one request into an
    // unbounded crawl.
    const { fetchImpl } = makeFetch([
      { body: { items: [{ id: "c1" }], nextPageToken: "more" } },
    ]);
    const api = createGoogleCalendarClient({
      accessToken: "ya29",
      fetchImpl,
      maxCalendarPages: 2,
    });

    const { calendars, truncated } = await api.listCalendars();

    expect(calendars).toHaveLength(2);
    expect(truncated).toBe(true);
  });

  it("returns nothing when the account has no calendars", async () => {
    const { api } = client([{ body: {} }]);

    await expect(api.listCalendars()).resolves.toEqual({
      calendars: [],
      truncated: false,
    });
  });
});

describe("insertEvent", () => {
  const body = {
    summary: "Consultation",
    start: { dateTime: "2026-09-01T09:00:00", timeZone: "America/Mexico_City" },
    end: { dateTime: "2026-09-01T09:30:00", timeZone: "America/Mexico_City" },
    privateProperties: { haabManaged: "true" },
  };

  it("POSTs to the collection with the deterministic id in the body", async () => {
    const { api, calls } = client([{ body: { id: "haab0123456789" } }]);

    await api.insertEvent("cal@example.invalid", "haab0123456789", body);

    expect(calls[0].init.method).toBe("POST");
    expect(new URL(calls[0].url).pathname).toMatch(/\/events$/);
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({
      id: "haab0123456789",
      extendedProperties: { private: { haabManaged: "true" } },
    });
  });

  it("suppresses Google's guest notifications", async () => {
    const { api, calls } = client([{ body: {} }]);

    await api.insertEvent("cal", "haab1", body);

    // Haab sends its own confirmations; Google must not email anyone as well.
    expect(new URL(calls[0].url).searchParams.get("sendUpdates")).toBe("none");
  });

  it("requests only the fields the projection reads back", async () => {
    const { api, calls } = client([{ body: {} }]);

    await api.insertEvent("cal", "haab1", body);

    const fields = new URL(calls[0].url).searchParams.get("fields") ?? "";
    expect(fields).toContain("id,etag,status,updated,start,end");
    expect(fields).not.toContain("summary");
    expect(fields).not.toContain("attendees");
  });

  it("reports a taken id as already_exists rather than retrying", async () => {
    const { api } = client([{ status: 409 }]);

    await expect(api.insertEvent("cal", "haab1", body)).rejects.toMatchObject({
      code: "already_exists",
      retryable: false,
    });
  });
});

describe("patchEvent", () => {
  it("sends only the named fields, with If-Match", async () => {
    const { api, calls } = client([{ body: { id: "haab1", etag: '"2"' } }]);

    await api.patchEvent("cal", "haab1", { summary: "Consultation" }, '"1"');

    expect(calls[0].init.method).toBe("PATCH");
    expect(new Headers(calls[0].init.headers as HeadersInit).get("if-match")).toBe('"1"');
    // Nothing else is mentioned, so nothing else is touched.
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ summary: "Consultation" });
  });

  it("omits If-Match when there is no etag to compare", async () => {
    const { api, calls } = client([{ body: {} }]);

    await api.patchEvent("cal", "haab1", { summary: "x" });

    expect(new Headers(calls[0].init.headers as HeadersInit).get("if-match")).toBeNull();
  });

  it("surfaces a stale etag as precondition_failed", async () => {
    const { api } = client([{ status: 412 }]);

    await expect(
      api.patchEvent("cal", "haab1", { summary: "x" }, '"1"'),
    ).rejects.toMatchObject({ code: "precondition_failed" });
  });

  it("classifies a usage limit as retryable and a permission refusal as not", async () => {
    const limited = client([{ status: 403, reason: "rateLimitExceeded" }]);
    const refused = client([{ status: 403, reason: "insufficientPermissions" }]);

    await expect(
      limited.api.patchEvent("cal", "e", { summary: "x" }),
    ).rejects.toMatchObject({ retryable: true });
    await expect(
      refused.api.patchEvent("cal", "e", { summary: "x" }),
    ).rejects.toMatchObject({ retryable: false, code: "forbidden" });
  });

  it("treats a network failure as retryable", async () => {
    const failing = (async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;

    const api = createGoogleCalendarClient({ accessToken: "ya29", fetchImpl: failing });

    await expect(api.patchEvent("cal", "e", { summary: "x" })).rejects.toMatchObject({
      code: "network_failed",
      retryable: true,
    });
  });

  it("never puts Google's response body in the error", async () => {
    const { api } = client([
      { status: 403, body: { error: { message: "calendar owner@example.invalid" } } },
    ]);

    await expect(api.patchEvent("cal", "e", { summary: "x" })).rejects.toSatisfy(
      (error: Error) => !error.message.includes("owner@example.invalid"),
    );
  });
});

describe("deleteEvent", () => {
  it("deletes the event", async () => {
    const { api, calls } = client([{ status: 204 }]);

    await api.deleteEvent("cal", "haab0123");

    expect(calls[0].init.method).toBe("DELETE");
  });

  it("treats an already-deleted event as success", async () => {
    // A replayed cancellation must not fail forever on the second attempt.
    const gone = client([{ status: 404 }]);
    const alreadyGone = client([{ status: 410 }]);

    await expect(gone.api.deleteEvent("cal", "e")).resolves.toBeUndefined();
    await expect(alreadyGone.api.deleteEvent("cal", "e")).resolves.toBeUndefined();
  });

  it("still reports a real failure", async () => {
    const { api } = client([{ status: 500 }]);

    await expect(api.deleteEvent("cal", "e")).rejects.toBeInstanceOf(GoogleApiError);
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
