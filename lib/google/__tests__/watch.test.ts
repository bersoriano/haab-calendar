import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  authorizeNotification,
  channelNeedsRenewal,
  channelTokenMatches,
  createChannelCredentials,
  hashChannelToken,
  parseWatchHeaders,
  WATCH_RENEWAL_WINDOW_MS,
  type StoredChannel,
} from "@/lib/google/watch";

const NOW = new Date("2026-09-01T12:00:00.000Z");

function channel(overrides: Partial<StoredChannel> = {}): StoredChannel {
  return {
    id: "row-1",
    channel_id: "chan-1",
    channel_token_hash: hashChannelToken("the-token"),
    resource_id: "res-1",
    status: "active",
    provider_id: "00000000-0000-4000-8000-000000000001",
    connection_generation: "gen-1",
    purpose: "managed_event_inbound",
    busy_source_id: null,
    ...overrides,
  };
}

function headers(values: Record<string, string>) {
  return new Headers(values);
}

const VALID_HEADERS = {
  "x-goog-channel-id": "chan-1",
  "x-goog-channel-token": "the-token",
  "x-goog-message-number": "42",
  "x-goog-resource-state": "exists",
  "x-goog-resource-id": "res-1",
};

describe("createChannelCredentials", () => {
  it("issues a distinct channel and token each time", () => {
    const first = createChannelCredentials();
    const second = createChannelCredentials();

    expect(first.channelId).not.toBe(second.channelId);
    expect(first.token).not.toBe(second.token);
  });

  it("stores only the hash", () => {
    const { token, tokenHash } = createChannelCredentials();

    // A leaked table must not let anyone forge a notification.
    expect(tokenHash).not.toContain(token);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("uses enough entropy to be unguessable", () => {
    // 32 random bytes, base64url — 43 characters.
    expect(createChannelCredentials().token.length).toBeGreaterThanOrEqual(43);
  });
});

describe("channelTokenMatches", () => {
  it("accepts the right token", () => {
    expect(channelTokenMatches("the-token", hashChannelToken("the-token"))).toBe(true);
  });

  it("rejects the wrong one", () => {
    expect(channelTokenMatches("other", hashChannelToken("the-token"))).toBe(false);
  });

  it("rejects empty input rather than matching an empty hash", () => {
    expect(channelTokenMatches("", hashChannelToken("the-token"))).toBe(false);
    expect(channelTokenMatches("the-token", "")).toBe(false);
  });
});

describe("parseWatchHeaders", () => {
  it("reads a well-formed notification", () => {
    const result = parseWatchHeaders(headers(VALID_HEADERS));

    expect(result).toMatchObject({
      ok: true,
      notification: { channelId: "chan-1", messageNumber: 42, resourceState: "exists" },
    });
  });

  it("refuses a notification with no channel", () => {
    const rest = { ...VALID_HEADERS, "x-goog-channel-id": "" };

    expect(parseWatchHeaders(headers(rest))).toEqual({
      ok: false,
      reason: "missing_channel_id",
    });
  });

  it("refuses a notification with no token", () => {
    const rest = { ...VALID_HEADERS, "x-goog-channel-token": "" };

    expect(parseWatchHeaders(headers(rest))).toEqual({
      ok: false,
      reason: "missing_token",
    });
  });

  it.each(["", "abc", "-1", "1.5", "99999999999999999999"])(
    "refuses message number %j",
    (value) => {
      expect(
        parseWatchHeaders(headers({ ...VALID_HEADERS, "x-goog-message-number": value })),
      ).toEqual({ ok: false, reason: "invalid_message_number" });
    },
  );

  it("refuses a resource state Google does not send", () => {
    expect(
      parseWatchHeaders(headers({ ...VALID_HEADERS, "x-goog-resource-state": "deleted" })),
    ).toEqual({ ok: false, reason: "invalid_resource_state" });
  });

  it("accepts every documented resource state", () => {
    for (const state of ["sync", "exists", "not_exists"]) {
      expect(
        parseWatchHeaders(headers({ ...VALID_HEADERS, "x-goog-resource-state": state })).ok,
      ).toBe(true);
    }
  });

  it("refuses an oversized channel id or token", () => {
    expect(
      parseWatchHeaders(headers({ ...VALID_HEADERS, "x-goog-channel-id": "c".repeat(200) })).ok,
    ).toBe(false);
    expect(
      parseWatchHeaders(headers({ ...VALID_HEADERS, "x-goog-channel-token": "t".repeat(300) })).ok,
    ).toBe(false);
  });

  it("never reads the resource URI", () => {
    const result = parseWatchHeaders(
      headers({ ...VALID_HEADERS, "x-goog-resource-uri": "https://evil.invalid/steal" }),
    );

    // Following a caller-supplied URL would make this a request forwarder.
    expect(JSON.stringify(result)).not.toContain("evil.invalid");
  });
});

describe("authorizeNotification", () => {
  const notification = {
    channelId: "chan-1",
    resourceId: "res-1",
    messageNumber: 42,
    resourceState: "exists",
    token: "the-token",
  };

  it("accepts a genuine notification for an active channel", () => {
    expect(authorizeNotification(notification, channel())).toEqual({ ok: true });
  });

  it("refuses an unknown channel", () => {
    expect(authorizeNotification(notification, null)).toEqual({
      ok: false,
      reason: "unknown_channel",
    });
  });

  it("refuses a wrong token", () => {
    expect(
      authorizeNotification({ ...notification, token: "forged" }, channel()),
    ).toEqual({ ok: false, reason: "token_mismatch" });
  });

  it("refuses a resource id that does not match the channel", () => {
    expect(
      authorizeNotification({ ...notification, resourceId: "res-other" }, channel()),
    ).toEqual({ ok: false, reason: "resource_mismatch" });
  });

  it("accepts the first sync notification before the watch response was stored", () => {
    // Google can deliver before its own response is written here; rejecting
    // that would refuse a perfectly genuine notification.
    expect(
      authorizeNotification(
        { ...notification, resourceState: "sync", resourceId: undefined },
        channel({ status: "creating", resource_id: null }),
      ),
    ).toEqual({ ok: true });
  });

  it("still accepts during a renewal overlap", () => {
    expect(authorizeNotification(notification, channel({ status: "retiring" }))).toEqual({
      ok: true,
    });
  });

  it.each(["expired", "stopped", "failed"])(
    "acknowledges but does no work for a %s channel",
    (status) => {
      expect(authorizeNotification(notification, channel({ status }))).toEqual({
        ok: false,
        reason: "channel_retired",
      });
    },
  );
});

describe("channelNeedsRenewal", () => {
  it("renews when less than a day remains", () => {
    const soon = new Date(NOW.getTime() + 12 * 3600 * 1000).toISOString();

    expect(channelNeedsRenewal(soon, NOW)).toBe(true);
  });

  it("leaves a channel with plenty of life alone", () => {
    const later = new Date(NOW.getTime() + 5 * 24 * 3600 * 1000).toISOString();

    expect(channelNeedsRenewal(later, NOW)).toBe(false);
  });

  it("renews an already expired channel", () => {
    const past = new Date(NOW.getTime() - 3600 * 1000).toISOString();

    expect(channelNeedsRenewal(past, NOW)).toBe(true);
  });

  it("renews when the expiry is unknown or unreadable", () => {
    expect(channelNeedsRenewal(null, NOW)).toBe(true);
    expect(channelNeedsRenewal("whenever", NOW)).toBe(true);
  });

  it("leaves room for retries before delivery lapses", () => {
    // A renewal that fails needs several attempts before the channel dies.
    expect(WATCH_RENEWAL_WINDOW_MS).toBeGreaterThanOrEqual(6 * 3600 * 1000);
  });
});
