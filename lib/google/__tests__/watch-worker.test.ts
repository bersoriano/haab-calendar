import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("Watch worker tests must inject a client.");
  },
}));

vi.mock("@/lib/google/connections", () => ({
  createClientForConnection: async () => {
    throw new Error("Watch worker tests must inject a Google client.");
  },
}));

import { createLogger } from "@/lib/observability/logger";
import { syncWatchChannels } from "@/lib/google/watch-worker";

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const GENERATION = "00000000-0000-4000-8000-0000000000aa";
const NOW = new Date("2026-09-01T12:00:00.000Z");

const silent = createLogger({ sink: () => undefined });

function connection(overrides: Record<string, unknown> = {}) {
  return {
    id: "conn-1",
    provider_id: PROVIDER,
    connection_generation: GENERATION,
    status: "connected",
    target_calendar_id: "primary@example.invalid",
    two_way_enabled: true,
    busy_blocking_enabled: false,
    deletion_cancels_booking: false,
    ...overrides,
  } as never;
}

type Options = {
  channels?: Array<Record<string, unknown>>;
  busySources?: Array<Record<string, unknown>>;
};

function makeClient(options: Options = {}) {
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];

  const client = {
    from: (table: string) => {
      if (table === "provider_google_calendar_watch_channels") {
        const query = {
          select: () => query,
          eq: () => query,
          in: () => query,
          returns: async () => ({ data: options.channels ?? [], error: null }),
          insert: async (row: Record<string, unknown>) => {
            inserts.push(row);
            return { error: null };
          },
          update: (row: Record<string, unknown>) => {
            updates.push(row);
            return query;
          },
        };
        return query;
      }

      if (table === "provider_google_calendar_busy_sources") {
        const query = {
          select: () => query,
          eq: () => query,
          returns: async () => ({ data: options.busySources ?? [], error: null }),
        };
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  const google = {
    watchEvents: vi.fn(async (request: { token: string; calendarId: string }) => ({
      requested: request.calendarId,
      resourceId: "res-new",
      expiresAt: "2026-09-08T12:00:00.000Z",
    })),
    stopChannel: vi.fn(async () => undefined),
  };

  return { client, google, inserts, updates };
}

const run = (client: SupabaseClient, google: unknown, conn = connection()) =>
  syncWatchChannels(conn, {
    client,
    createClient: async () => google as never,
    now: NOW,
    logger: silent,
  });

beforeEach(() => {
  vi.stubEnv("GOOGLE_OAUTH_REDIRECT_URI", "https://haab.test/api/auth/callback/google");
});

afterEach(() => vi.unstubAllEnvs());

describe("syncWatchChannels", () => {
  it("creates a channel for the target calendar when two-way is on", async () => {
    const { client, google, inserts } = makeClient();

    expect(await run(client, google)).toMatchObject({ created: 1, renewed: 0 });
    expect(google.watchEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: "primary@example.invalid",
        address: "https://haab.test/api/webhooks/google-calendar",
      }),
    );
    // The row exists before the call, so a channel Google creates always has a
    // token stored here to check its notifications against.
    expect(inserts[0]).toMatchObject({
      purpose: "managed_event_inbound",
      status: "creating",
    });
  });

  it("stores the token hashed, never the token itself", async () => {
    const { client, google, inserts } = makeClient();

    await run(client, google);

    const sentToken = (
      google.watchEvents.mock.calls as unknown as Array<[{ token: string }]>
    )[0][0].token;
    expect(sentToken).toBeTruthy();
    expect(JSON.stringify(inserts[0])).not.toContain(sentToken);
    expect(String(inserts[0]?.channel_token_hash)).toHaveLength(64);
  });

  it("creates a channel per enabled busy source", async () => {
    const { client, google } = makeClient({
      busySources: [
        { id: "src-1", calendar_id: "a@example.invalid" },
        { id: "src-2", calendar_id: "b@example.invalid" },
      ],
    });

    const summary = await run(
      client,
      google,
      connection({ busy_blocking_enabled: true, two_way_enabled: false }) as never,
    );

    expect(summary.created).toBe(2);
  });

  it("leaves a channel alone while it is still current", async () => {
    const { client, google } = makeClient({
      channels: [
        {
          id: "ch-1",
          provider_id: PROVIDER,
          connection_id: "conn-1",
          connection_generation: GENERATION,
          busy_source_id: null,
          purpose: "managed_event_inbound",
          channel_id: "chan-1",
          resource_id: "res-1",
          calendar_id: "primary@example.invalid",
          status: "active",
          expires_at: "2026-09-08T12:00:00.000Z",
        },
      ],
    });

    expect(await run(client, google)).toMatchObject({
      created: 0,
      renewed: 0,
      retired: 0,
    });
    expect(google.watchEvents).not.toHaveBeenCalled();
  });

  it("renews before expiry, and only stops the old one once the new one is live", async () => {
    const { client, google } = makeClient({
      channels: [
        {
          id: "ch-1",
          provider_id: PROVIDER,
          connection_id: "conn-1",
          connection_generation: GENERATION,
          busy_source_id: null,
          purpose: "managed_event_inbound",
          channel_id: "chan-old",
          resource_id: "res-old",
          calendar_id: "primary@example.invalid",
          status: "active",
          // Inside the renewal window.
          expires_at: "2026-09-01T18:00:00.000Z",
        },
      ],
    });

    expect(await run(client, google)).toMatchObject({ renewed: 1, created: 0 });

    const watchOrder = google.watchEvents.mock.invocationCallOrder[0];
    const stopOrder = google.stopChannel.mock.invocationCallOrder[0];
    // The other order leaves a window where a provider's change is announced to
    // nobody.
    expect(watchOrder).toBeLessThan(stopOrder);
    expect(google.stopChannel).toHaveBeenCalledWith({
      channelId: "chan-old",
      resourceId: "res-old",
    });
  });

  it("stops a channel for a capability the provider switched off", async () => {
    const { client, google } = makeClient({
      channels: [
        {
          id: "ch-1",
          provider_id: PROVIDER,
          connection_id: "conn-1",
          connection_generation: GENERATION,
          busy_source_id: "src-1",
          purpose: "busy_refresh",
          channel_id: "chan-busy",
          resource_id: "res-busy",
          calendar_id: "a@example.invalid",
          status: "active",
          expires_at: "2026-09-08T12:00:00.000Z",
        },
      ],
    });

    expect(await run(client, google)).toMatchObject({ retired: 1 });
    expect(google.stopChannel).toHaveBeenCalledWith({
      channelId: "chan-busy",
      resourceId: "res-busy",
    });
  });

  it("stops every channel when the connection is no longer usable", async () => {
    const { client, google } = makeClient({
      channels: [
        {
          id: "ch-1",
          provider_id: PROVIDER,
          connection_id: "conn-1",
          connection_generation: GENERATION,
          busy_source_id: null,
          purpose: "managed_event_inbound",
          channel_id: "chan-1",
          resource_id: "res-1",
          calendar_id: "primary@example.invalid",
          status: "active",
          expires_at: "2026-09-08T12:00:00.000Z",
        },
      ],
    });

    const summary = await run(
      client,
      google,
      connection({ status: "needs_reauth" }) as never,
    );

    expect(summary).toMatchObject({ retired: 1, created: 0 });
  });

  it("marks a channel failed when Google refuses to create it", async () => {
    const { client, google, updates } = makeClient();
    google.watchEvents.mockRejectedValue(new Error("Google said no"));

    expect(await run(client, google)).toMatchObject({ failed: 1, created: 0 });
    // The half-created row must not stay claimable as a live channel.
    expect(updates[0]).toMatchObject({ status: "failed" });
  });

  it("does nothing at all without an HTTPS address to be notified at", async () => {
    // Google refuses a non-HTTPS channel, so a local deployment simply has no
    // push; the periodic workers still run.
    vi.stubEnv("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:3000/api/auth/callback/google");
    const { client, google } = makeClient();

    expect(await run(client, google)).toMatchObject({ skipped: "no_address" });
    expect(google.watchEvents).not.toHaveBeenCalled();
  });
});
