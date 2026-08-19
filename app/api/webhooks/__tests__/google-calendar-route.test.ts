import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const store = vi.hoisted(() => ({
  channel: null as Record<string, unknown> | null,
  inserts: [] as Record<string, unknown>[],
  insertError: null as { code: string } | null,
  throwOnRead: false,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "provider_google_calendar_watch_channels") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => {
            if (store.throwOnRead) throw new Error("db down");
            return { data: store.channel, error: null };
          },
        };
        return query;
      }

      if (table === "google_calendar_webhook_inbox") {
        return {
          insert: async (row: Record<string, unknown>) => {
            if (!store.insertError) store.inserts.push(row);
            return { error: store.insertError };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

import { POST } from "@/app/api/webhooks/google-calendar/route";
import { hashChannelToken } from "@/lib/google/watch";

const TOKEN = "a-real-channel-token";

function request(headers: Record<string, string>, body = "") {
  return new Request("http://localhost/api/webhooks/google-calendar", {
    method: "POST",
    headers,
    body: body || undefined,
  }) as unknown as NextRequest;
}

const VALID = {
  "x-goog-channel-id": "chan-1",
  "x-goog-channel-token": TOKEN,
  "x-goog-message-number": "7",
  "x-goog-resource-state": "exists",
  "x-goog-resource-id": "res-1",
};

beforeEach(() => {
  store.channel = {
    id: "row-1",
    channel_id: "chan-1",
    channel_token_hash: hashChannelToken(TOKEN),
    resource_id: "res-1",
    status: "active",
    provider_id: "00000000-0000-4000-8000-000000000001",
    connection_generation: "gen-1",
    purpose: "managed_event_inbound",
    busy_source_id: null,
  };
  store.inserts = [];
  store.insertError = null;
  store.throwOnRead = false;
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/webhooks/google-calendar", () => {
  it("records a genuine notification and answers 204", async () => {
    const response = await POST(request(VALID));

    expect(response.status).toBe(204);
    expect(store.inserts[0]).toMatchObject({
      channel_id: "chan-1",
      message_number: 7,
      resource_state: "exists",
    });
  });

  it("never calls Google or touches a booking", async () => {
    // The notification body is empty; there is nothing to act on inline, and
    // doing so would let an unauthenticated caller dictate our request time.
    await POST(request(VALID));

    // The only tables reachable in this test are the channel and the inbox;
    // anything else throws in the mock.
    expect(store.inserts).toHaveLength(1);
  });

  it("answers 204 for an unknown channel, revealing nothing", async () => {
    store.channel = null;

    const response = await POST(request(VALID));

    expect(response.status).toBe(204);
    expect(store.inserts).toHaveLength(0);
  });

  it("answers 204 for a forged token, and does no work", async () => {
    const response = await POST(
      request({ ...VALID, "x-goog-channel-token": "forged" }),
    );

    // Same answer as an unknown channel: distinguishing them would map which
    // channels exist.
    expect(response.status).toBe(204);
    expect(store.inserts).toHaveLength(0);
  });

  it("refuses a resource id that does not match the channel", async () => {
    const response = await POST(request({ ...VALID, "x-goog-resource-id": "other" }));

    expect(response.status).toBe(204);
    expect(store.inserts).toHaveLength(0);
  });

  it("does no work for a retired channel", async () => {
    store.channel = { ...store.channel, status: "stopped" };

    await POST(request(VALID));

    expect(store.inserts).toHaveLength(0);
  });

  it("accepts the first sync notification before the channel was finalised", async () => {
    store.channel = { ...store.channel, status: "creating", resource_id: null };

    const response = await POST(
      request({
        "x-goog-channel-id": "chan-1",
        "x-goog-channel-token": TOKEN,
        "x-goog-message-number": "1",
        "x-goog-resource-state": "sync",
      }),
    );

    expect(response.status).toBe(204);
    expect(store.inserts).toHaveLength(1);
  });

  it("treats a redelivered notification as already handled", async () => {
    store.insertError = { code: "23505" };

    const response = await POST(request(VALID));

    // Google redelivers by design; the unique constraint makes that free.
    expect(response.status).toBe(204);
  });

  it("accepts an out-of-order message number", async () => {
    // Google does not promise ordering, and refusing a lower number would drop
    // a notification that simply overtook another.
    await POST(request({ ...VALID, "x-goog-message-number": "99" }));
    await POST(request({ ...VALID, "x-goog-message-number": "12" }));

    expect(store.inserts.map((row) => row.message_number)).toEqual([99, 12]);
  });

  it.each([
    ["no channel id", { ...VALID, "x-goog-channel-id": "" }],
    ["no token", { ...VALID, "x-goog-channel-token": "" }],
    ["bad message number", { ...VALID, "x-goog-message-number": "abc" }],
    ["unknown resource state", { ...VALID, "x-goog-resource-state": "deleted" }],
  ])("does no work for a notification with %s", async (_label, headers) => {
    const response = await POST(request(headers));

    expect(response.status).toBe(204);
    expect(store.inserts).toHaveLength(0);
  });

  it("refuses an oversized body without reading it", async () => {
    const response = await POST(
      request({ ...VALID, "content-length": "99999" }, "x".repeat(100)),
    );

    expect(response.status).toBe(204);
    expect(store.inserts).toHaveLength(0);
  });

  it("asks Google to retry when nothing could be recorded", async () => {
    store.insertError = { code: "42501" };

    const response = await POST(request(VALID));

    // The one case where a non-2xx is right: the nudge would otherwise be lost.
    expect(response.status).toBe(500);
  });

  it("asks Google to retry when the lookup itself failed", async () => {
    store.throwOnRead = true;

    expect((await POST(request(VALID))).status).toBe(500);
  });

  it("never puts the token in a response", async () => {
    const response = await POST(request({ ...VALID, "x-goog-channel-token": "forged" }));
    const text = await response.text();

    expect(text).not.toContain("forged");
    expect(text).toBe("");
  });
});
