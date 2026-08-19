import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("Webhook worker tests must inject a client.");
  },
}));

const refreshBusy = vi.fn();
vi.mock("@/lib/google/busy-refresh", () => ({
  refreshProviderBusySnapshot: (...args: unknown[]) => refreshBusy(...args),
}));

const inboundSync = vi.fn();
vi.mock("@/lib/google/inbound-sync", () => ({
  runGoogleInboundSync: (...args: unknown[]) => inboundSync(...args),
}));

import { createLogger } from "@/lib/observability/logger";
import { runGoogleWebhookWorker } from "@/lib/google/webhook-worker";

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const silent = createLogger({ sink: () => undefined });

function inboxRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "inbox-1",
    channel_id: "chan-1",
    resource_id: "res-1",
    message_number: 4,
    resource_state: "exists",
    attempt_count: 1,
    lease_token: "lease-1",
    ...overrides,
  };
}

function channelRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ch-1",
    provider_id: PROVIDER,
    purpose: "managed_event_inbound",
    status: "active",
    resource_id: "res-1",
    ...overrides,
  };
}

function makeClient(
  options: {
    notification?: Record<string, unknown> | null;
    channel?: Record<string, unknown> | null;
  } = {},
) {
  const updates: Array<Record<string, unknown>> = [];
  const notification =
    options.notification === undefined ? inboxRow() : options.notification;
  const channel = options.channel === undefined ? channelRow() : options.channel;

  const client = {
    rpc: async (name: string) =>
      name === "claim_google_webhook_notification"
        ? { data: notification, error: null }
        : { data: null, error: null },

    from: (table: string) => {
      if (table === "google_calendar_webhook_inbox") {
        const query = {
          update: (row: Record<string, unknown>) => {
            updates.push(row);
            return query;
          },
          eq: () => query,
        };
        return query;
      }

      if (table === "provider_google_calendar_watch_channels") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({ data: channel, error: null }),
        };
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  return { client, updates };
}

const run = (client: SupabaseClient) =>
  runGoogleWebhookWorker({ client, workerId: "w1", logger: silent });

beforeEach(() => {
  vi.clearAllMocks();
  refreshBusy.mockResolvedValue({ refreshed: 1 });
  inboundSync.mockResolvedValue({ staged: 1 });
});

describe("runGoogleWebhookWorker", () => {
  it("reports no work when the claim returns a row of nulls", async () => {
    const { client } = makeClient({ notification: { id: null } });

    expect(await run(client)).toEqual({
      claimed: false,
      dispatched: null,
      reason: null,
    });
  });

  it("takes the provider from the stored channel, never from the notification", async () => {
    const { client } = makeClient();

    expect(await run(client)).toMatchObject({ dispatched: "inbound_sync" });
    expect(inboundSync).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: PROVIDER }),
    );
  });

  it("refreshes busy state for a busy-source channel", async () => {
    const { client } = makeClient({
      channel: channelRow({ purpose: "busy_refresh" }),
    });

    expect(await run(client)).toMatchObject({ dispatched: "busy_refresh" });
    expect(refreshBusy).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: PROVIDER }),
    );
    expect(inboundSync).not.toHaveBeenCalled();
  });

  it("treats Google's sync handshake as nothing to read", async () => {
    const { client, updates } = makeClient({
      notification: inboxRow({ resource_state: "sync" }),
    });

    expect(await run(client)).toMatchObject({ dispatched: null, reason: "handshake" });
    expect(inboundSync).not.toHaveBeenCalled();
    expect(updates[0]).toMatchObject({ status: "processed" });
  });

  it("does nothing for a channel it does not know", async () => {
    const { client, updates } = makeClient({ channel: null });

    expect(await run(client)).toMatchObject({ reason: "unknown_channel" });
    expect(inboundSync).not.toHaveBeenCalled();
    expect(updates[0]).toMatchObject({ status: "skipped" });
  });

  it("does nothing for a channel that has been retired", async () => {
    const { client } = makeClient({ channel: channelRow({ status: "stopped" }) });

    expect(await run(client)).toMatchObject({ reason: "channel_retired" });
    expect(inboundSync).not.toHaveBeenCalled();
  });

  it("refuses a notification whose resource does not match the channel", async () => {
    const { client } = makeClient({
      notification: inboxRow({ resource_id: "someone-elses-resource" }),
    });

    expect(await run(client)).toMatchObject({ reason: "resource_mismatch" });
    expect(inboundSync).not.toHaveBeenCalled();
  });

  it("still dispatches while the channel is only just created", async () => {
    // Google can deliver before its own watch response was written here.
    const { client } = makeClient({
      channel: channelRow({ status: "creating", resource_id: null }),
    });

    expect(await run(client)).toMatchObject({ dispatched: "inbound_sync" });
  });

  it("retries a failed read with backoff rather than dropping it", async () => {
    inboundSync.mockRejectedValue(new Error("Google is down"));
    const { client, updates } = makeClient();

    expect(await run(client)).toMatchObject({ reason: "dispatch_failed" });
    expect(updates[0]).toMatchObject({ status: "failed" });
    expect(updates[0]?.available_at).toEqual(expect.any(String));
  });

  it("dead-letters a notification that has failed too often", async () => {
    inboundSync.mockRejectedValue(new Error("still down"));
    const { client, updates } = makeClient({
      notification: inboxRow({ attempt_count: 5 }),
    });

    await run(client);

    expect(updates[0]).toMatchObject({ status: "dead_letter" });
  });

  it("releases the lease on every outcome", async () => {
    const { client, updates } = makeClient();

    await run(client);

    expect(updates[0]).toMatchObject({
      lease_token: null,
      leased_by: null,
      lease_expires_at: null,
    });
  });
});
