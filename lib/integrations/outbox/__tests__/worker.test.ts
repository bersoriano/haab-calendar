import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("The worker tests must inject a repository.");
  },
}));

import {
  hasAttemptsLeft,
  MAX_ATTEMPTS,
  retryDelaySeconds,
} from "@/lib/integrations/outbox/errors";
import type { OutboxRepository } from "@/lib/integrations/outbox/repository";
import { runIntegrationOutboxWorker } from "@/lib/integrations/outbox/worker";
import type {
  HandlerResult,
  IntegrationOutboxEvent,
  IntegrationOutboxHandler,
} from "@/lib/integrations/outbox/types";

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const BOOKING = "00000000-0000-4000-8000-000000000002";

function makeEvent(overrides: Partial<IntegrationOutboxEvent> = {}): IntegrationOutboxEvent {
  return {
    id: "00000000-0000-4000-8000-00000000000e",
    providerId: PROVIDER,
    bookingId: BOOKING,
    aggregateVersion: 1,
    eventType: "booking.created",
    payloadSchemaVersion: 1,
    payload: {
      bookingId: BOOKING,
      providerId: PROVIDER,
      aggregateVersion: 1,
      change: "booking.created",
    },
    attemptCount: 1,
    leaseToken: "00000000-0000-4000-8000-0000000000aa",
    ...overrides,
  };
}

function makeRepository(events: IntegrationOutboxEvent[], leaseHeld = true) {
  const calls: Array<{ op: string; args: unknown }> = [];
  const record = (op: string, args: unknown) => {
    calls.push({ op, args });
    return Promise.resolve(leaseHeld);
  };

  const repository: OutboxRepository = {
    claim: async (args) => {
      calls.push({ op: "claim", args });
      return events;
    },
    complete: (eventId, leaseToken) => record("complete", { eventId, leaseToken }),
    skip: (eventId, leaseToken, reasonCode) =>
      record("skip", { eventId, leaseToken, reasonCode }),
    retry: (args) => record("retry", args),
    deadLetter: (args) => record("deadLetter", args),
  };

  return { repository, calls };
}

function handler(
  result: HandlerResult | (() => Promise<HandlerResult>),
  options: { key?: string; supports?: boolean } = {},
): IntegrationOutboxHandler {
  return {
    key: options.key ?? "test",
    supports: () => options.supports ?? true,
    deliver: typeof result === "function" ? result : async () => result,
  };
}

describe("runIntegrationOutboxWorker", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("completes an event a handler delivered", async () => {
    const { repository, calls } = makeRepository([makeEvent()]);

    const summary = await runIntegrationOutboxWorker({
      repository,
      handlers: [handler({ outcome: "succeeded" })],
      log: () => undefined,
    });

    expect(summary).toMatchObject({ claimed: 1, succeeded: 1 });
    expect(calls.map((call) => call.op)).toEqual(["claim", "complete"]);
  });

  it("skips an event no handler applies to, which is today's normal path", async () => {
    const { repository, calls } = makeRepository([makeEvent()]);

    const summary = await runIntegrationOutboxWorker({
      repository,
      handlers: [],
      log: () => undefined,
    });

    expect(summary.skipped).toBe(1);
    expect(calls[1]).toMatchObject({
      op: "skip",
      args: { reasonCode: "no_active_integrations" },
    });
  });

  it("skips when no registered handler supports the event", async () => {
    const { repository, calls } = makeRepository([makeEvent()]);

    await runIntegrationOutboxWorker({
      repository,
      handlers: [handler({ outcome: "succeeded" }, { supports: false })],
      log: () => undefined,
    });

    expect(calls[1]).toMatchObject({ op: "skip" });
  });

  it("retries a typed retryable failure with a backoff", async () => {
    const { repository, calls } = makeRepository([makeEvent({ attemptCount: 2 })]);

    const summary = await runIntegrationOutboxWorker({
      repository,
      handlers: [
        handler({ outcome: "retryable_failure", errorCode: "rate_limited" }),
      ],
      log: () => undefined,
    });

    expect(summary.retried).toBe(1);
    expect(calls[1].op).toBe("retry");
    const args = calls[1].args as { delaySeconds: number; errorCode: string };
    expect(args.errorCode).toBe("rate_limited");
    expect(args.delaySeconds).toBeGreaterThan(0);
  });

  it("dead-letters a permanent failure without spending more attempts", async () => {
    const { repository, calls } = makeRepository([makeEvent()]);

    const summary = await runIntegrationOutboxWorker({
      repository,
      handlers: [
        handler({ outcome: "permanent_failure", errorCode: "unsupported_payload" }),
      ],
      log: () => undefined,
    });

    expect(summary.deadLettered).toBe(1);
    expect(calls[1]).toMatchObject({
      op: "deadLetter",
      args: { errorCode: "unsupported_payload" },
    });
  });

  it("dead-letters once the attempts are exhausted", async () => {
    const { repository, calls } = makeRepository([
      makeEvent({ attemptCount: MAX_ATTEMPTS }),
    ]);

    const summary = await runIntegrationOutboxWorker({
      repository,
      handlers: [handler({ outcome: "retryable_failure", errorCode: "timeout" })],
      log: () => undefined,
    });

    expect(summary.deadLettered).toBe(1);
    expect(calls[1]).toMatchObject({
      op: "deadLetter",
      args: { errorCode: "attempts_exhausted" },
    });
  });

  it("treats a thrown handler error as retryable, and keeps its message out of storage", async () => {
    const { repository, calls } = makeRepository([makeEvent()]);

    const summary = await runIntegrationOutboxWorker({
      repository,
      handlers: [
        handler(async () => {
          throw new Error("token ya29.SECRET rejected by https://provider/api");
        }),
      ],
      log: () => undefined,
    });

    expect(summary.retried).toBe(1);
    const args = calls[1].args as { errorCode: string; errorMessage?: string };
    expect(args.errorCode).toBe("handler_threw");
    expect(args.errorMessage).toBeUndefined();
  });

  it("dead-letters a malformed event rather than handing it to a handler", async () => {
    const deliver = vi.fn();
    const { repository, calls } = makeRepository([
      makeEvent({ aggregateVersion: 0 }),
    ]);

    await runIntegrationOutboxWorker({
      repository,
      handlers: [{ key: "test", supports: () => true, deliver }],
      log: () => undefined,
    });

    expect(deliver).not.toHaveBeenCalled();
    expect(calls[1]).toMatchObject({
      op: "deadLetter",
      args: { errorCode: "invalid_event_contract" },
    });
  });

  it("counts a lost lease instead of claiming the outcome", async () => {
    const { repository } = makeRepository([makeEvent()], false);

    const summary = await runIntegrationOutboxWorker({
      repository,
      handlers: [handler({ outcome: "succeeded" })],
      log: () => undefined,
    });

    expect(summary).toMatchObject({ leaseConflicts: 1, succeeded: 0 });
  });

  it("keeps going after one event fails", async () => {
    const events = [
      makeEvent({ id: "e1" }),
      makeEvent({ id: "e2", bookingId: "b2" }),
      makeEvent({ id: "e3", bookingId: "b3" }),
    ];
    const { repository, calls } = makeRepository(events);

    const summary = await runIntegrationOutboxWorker({
      repository,
      handlers: [
        handler(async () =>
          calls.length === 2
            ? { outcome: "retryable_failure", errorCode: "timeout" }
            : { outcome: "succeeded" },
        ),
      ],
      log: () => undefined,
    });

    expect(summary.claimed).toBe(3);
    expect(summary.succeeded + summary.retried).toBe(3);
  });

  it("stops claiming work it cannot finish in its time budget", async () => {
    const events = [makeEvent({ id: "e1" }), makeEvent({ id: "e2", bookingId: "b2" })];
    const { repository, calls } = makeRepository(events);
    let clock = 0;

    await runIntegrationOutboxWorker({
      repository,
      handlers: [handler({ outcome: "succeeded" })],
      timeBudgetMs: 10_000,
      // First event fits; the second would start past the budget minus reserve.
      now: () => (clock += 3_000),
      log: () => undefined,
    });

    expect(calls.filter((call) => call.op === "complete")).toHaveLength(1);
  });

  it("logs identifiers and codes, never the payload", async () => {
    const entries: Record<string, unknown>[] = [];
    const { repository } = makeRepository([makeEvent()]);

    await runIntegrationOutboxWorker({
      repository,
      handlers: [handler({ outcome: "succeeded" })],
      log: (entry) => entries.push(entry),
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      eventId: expect.any(String),
      providerId: PROVIDER,
      bookingId: BOOKING,
      eventType: "booking.created",
      aggregateVersion: 1,
      outcome: "succeeded",
    });
    expect(entries[0]).not.toHaveProperty("payload");
    expect(JSON.stringify(entries[0])).not.toContain("client");
  });

  it("passes the lease token through to every completion", async () => {
    const { repository, calls } = makeRepository([
      makeEvent({ leaseToken: "lease-1" }),
    ]);

    await runIntegrationOutboxWorker({
      repository,
      handlers: [handler({ outcome: "succeeded" })],
      log: () => undefined,
    });

    expect(calls[1].args).toMatchObject({ leaseToken: "lease-1" });
  });

  it("claims within the bounds the database enforces", async () => {
    const { repository, calls } = makeRepository([]);

    await runIntegrationOutboxWorker({ repository, log: () => undefined });

    const args = calls[0].args as {
      workerId: string;
      batchSize: number;
      leaseSeconds: number;
    };
    expect(args.workerId).toMatch(/^outbox-/);
    expect(args.batchSize).toBeGreaterThanOrEqual(1);
    expect(args.batchSize).toBeLessThanOrEqual(100);
    expect(args.leaseSeconds).toBeGreaterThanOrEqual(15);
    expect(args.leaseSeconds).toBeLessThanOrEqual(300);
  });
});

describe("retry policy", () => {
  it("grows the delay with each attempt", () => {
    const first = retryDelaySeconds(1, () => 0);
    const third = retryDelaySeconds(3, () => 0);

    expect(first).toBe(30);
    expect(third).toBeGreaterThan(first);
  });

  it("never exceeds six hours", () => {
    expect(retryDelaySeconds(40, () => 1)).toBe(6 * 60 * 60);
  });

  it("adds jitter so a shared outage does not retry in lockstep", () => {
    expect(retryDelaySeconds(2, () => 1)).toBeGreaterThan(retryDelaySeconds(2, () => 0));
  });

  it("stops allowing attempts at the maximum", () => {
    expect(hasAttemptsLeft(MAX_ATTEMPTS - 1)).toBe(true);
    expect(hasAttemptsLeft(MAX_ATTEMPTS)).toBe(false);
  });
});
