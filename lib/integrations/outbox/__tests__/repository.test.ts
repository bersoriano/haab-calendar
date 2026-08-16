import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("Repository tests must inject a client.");
  },
}));

import { OutboxInfrastructureError } from "@/lib/integrations/outbox/errors";
import { createOutboxRepository } from "@/lib/integrations/outbox/repository";

const ROW = {
  id: "00000000-0000-4000-8000-00000000000e",
  provider_id: "00000000-0000-4000-8000-000000000001",
  booking_id: "00000000-0000-4000-8000-000000000002",
  // PostgREST sends bigint as a string; the repository has to widen it.
  aggregate_version: "12",
  event_type: "booking.rescheduled",
  payload_schema_version: 1,
  payload: { bookingId: "b", providerId: "p", aggregateVersion: 12, change: "booking.rescheduled" },
  attempt_count: 2,
  lease_token: "00000000-0000-4000-8000-0000000000aa",
};

function makeClient(options: { data?: unknown; error?: { message: string } } = {}) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];

  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data: options.data ?? null, error: options.error ?? null };
    },
  };

  return { client: client as unknown as SupabaseClient, calls };
}

describe("outbox repository", () => {
  it("claims a batch and widens the bigint version to a number", async () => {
    const { client, calls } = makeClient({ data: [ROW] });

    const events = await createOutboxRepository(client).claim({
      workerId: "worker-1",
      batchSize: 20,
      leaseSeconds: 60,
    });

    expect(calls[0]).toEqual({
      name: "claim_integration_outbox_events",
      args: { p_worker_id: "worker-1", p_batch_size: 20, p_lease_seconds: 60 },
    });
    expect(events[0]).toMatchObject({
      aggregateVersion: 12,
      eventType: "booking.rescheduled",
      leaseToken: "00000000-0000-4000-8000-0000000000aa",
    });
    // A version compared as text would order 10 before 9.
    expect(typeof events[0].aggregateVersion).toBe("number");
  });

  it("returns an empty batch when there is nothing to claim", async () => {
    const { client } = makeClient({ data: [] });

    await expect(
      createOutboxRepository(client).claim({
        workerId: "worker-1",
        batchSize: 20,
        leaseSeconds: 60,
      }),
    ).resolves.toEqual([]);
  });

  it("raises an infrastructure error when the claim RPC fails", async () => {
    const { client } = makeClient({ error: { message: "permission denied" } });

    await expect(
      createOutboxRepository(client).claim({
        workerId: "worker-1",
        batchSize: 20,
        leaseSeconds: 60,
      }),
    ).rejects.toBeInstanceOf(OutboxInfrastructureError);
  });

  it("refuses a claimed row of an unknown type rather than passing it on", async () => {
    const { client } = makeClient({ data: [{ ...ROW, event_type: "booking.teleported" }] });

    await expect(
      createOutboxRepository(client).claim({
        workerId: "worker-1",
        batchSize: 20,
        leaseSeconds: 60,
      }),
    ).rejects.toBeInstanceOf(OutboxInfrastructureError);
  });

  it("refuses a claimed row with no lease token", async () => {
    const { client } = makeClient({ data: [{ ...ROW, lease_token: null }] });

    await expect(
      createOutboxRepository(client).claim({
        workerId: "worker-1",
        batchSize: 20,
        leaseSeconds: 60,
      }),
    ).rejects.toBeInstanceOf(OutboxInfrastructureError);
  });

  it("reports whether each completion actually held the lease", async () => {
    const held = createOutboxRepository(makeClient({ data: true }).client);
    const lost = createOutboxRepository(makeClient({ data: false }).client);

    await expect(held.complete("e1", "lease-1")).resolves.toBe(true);
    await expect(lost.complete("e1", "lease-1")).resolves.toBe(false);
  });

  it("passes each outcome to its own RPC with the lease token", async () => {
    const { client, calls } = makeClient({ data: true });
    const repository = createOutboxRepository(client);

    await repository.complete("e1", "lease-1");
    await repository.skip("e1", "lease-1", "no_active_integrations");
    await repository.retry({
      eventId: "e1",
      leaseToken: "lease-1",
      delaySeconds: 30,
      errorCode: "timeout",
      errorMessage: "bounded",
    });
    await repository.deadLetter({
      eventId: "e1",
      leaseToken: "lease-1",
      errorCode: "invalid_event_contract",
    });

    expect(calls.map((call) => call.name)).toEqual([
      "complete_integration_outbox_event",
      "skip_integration_outbox_event",
      "retry_integration_outbox_event",
      "dead_letter_integration_outbox_event",
    ]);
    for (const call of calls) {
      expect(call.args.p_lease_token).toBe("lease-1");
    }
    expect(calls[2].args).toMatchObject({ p_delay_seconds: 30, p_error_code: "timeout" });
    expect(calls[3].args.p_error_message).toBeNull();
  });

  it("raises an infrastructure error when a completion RPC fails", async () => {
    const { client } = makeClient({ error: { message: "connection reset" } });

    await expect(
      createOutboxRepository(client).complete("e1", "lease-1"),
    ).rejects.toBeInstanceOf(OutboxInfrastructureError);
  });
});
