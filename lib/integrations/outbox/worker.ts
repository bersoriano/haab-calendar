import "server-only";

import { randomUUID } from "node:crypto";

import {
  assertEventShape,
  hasAttemptsLeft,
  OutboxContractError,
  OutboxInfrastructureError,
  retryDelaySeconds,
  sanitizeErrorMessage,
} from "@/lib/integrations/outbox/errors";
import { getIntegrationOutboxHandlers } from "@/lib/integrations/outbox/handlers";
import {
  createOutboxRepository,
  type OutboxRepository,
} from "@/lib/integrations/outbox/repository";
import {
  NO_ACTIVE_INTEGRATIONS,
  type HandlerResult,
  type IntegrationOutboxEvent,
  type IntegrationOutboxHandler,
  type OutboxRunSummary,
} from "@/lib/integrations/outbox/types";

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_LEASE_SECONDS = 60;
/** Leaves room to record every outcome before the platform stops the request. */
const DEFAULT_TIME_BUDGET_MS = 45_000;
const TIME_RESERVE_MS = 5_000;

export type OutboxWorkerOptions = {
  repository?: OutboxRepository;
  handlers?: readonly IntegrationOutboxHandler[];
  batchSize?: number;
  leaseSeconds?: number;
  timeBudgetMs?: number;
  workerId?: string;
  now?: () => number;
  log?: (event: Record<string, unknown>) => void;
};

const emptySummary: OutboxRunSummary = {
  claimed: 0,
  succeeded: 0,
  skipped: 0,
  retried: 0,
  deadLettered: 0,
  leaseConflicts: 0,
};

async function runHandlers(
  event: IntegrationOutboxEvent,
  handlers: readonly IntegrationOutboxHandler[],
): Promise<HandlerResult> {
  const applicable = handlers.filter((handler) => handler.supports(event));

  if (applicable.length === 0) {
    return { outcome: "skipped", reasonCode: NO_ACTIVE_INTEGRATIONS };
  }

  // Sequential, and the first non-success wins: two adapters writing the same
  // booking concurrently would race, and a retry has to replay the whole event
  // anyway, so there is nothing to gain by pressing on after a failure.
  for (const handler of applicable) {
    const result = await handler.deliver(event);

    if (result.outcome !== "succeeded") {
      return result;
    }
  }

  return { outcome: "succeeded" };
}

/**
 * Claim a batch, deliver it, record what happened.
 *
 * Delivery is at-least-once and never claims otherwise: a crash between the
 * external call and the completion write leaves the row leased, the lease
 * expires, and another worker replays it. Handlers are required to be
 * idempotent for exactly that reason.
 *
 * Events are processed one at a time. It keeps two events for the same booking
 * from running together, keeps the runtime predictable inside a serverless
 * invocation, and keeps a backlog from turning into a burst against whatever
 * external API is on the other side.
 */
export async function runIntegrationOutboxWorker(
  options: OutboxWorkerOptions = {},
): Promise<OutboxRunSummary> {
  const repository = options.repository ?? createOutboxRepository();
  const handlers = options.handlers ?? getIntegrationOutboxHandlers();
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const leaseSeconds = options.leaseSeconds ?? DEFAULT_LEASE_SECONDS;
  const timeBudgetMs = options.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS;
  const now = options.now ?? Date.now;
  const log = options.log ?? ((entry) => console.log("integration_outbox", entry));
  const workerId = options.workerId ?? `outbox-${randomUUID()}`;
  const startedAt = now();

  const summary: OutboxRunSummary = { ...emptySummary };

  const events = await repository.claim({ workerId, batchSize, leaseSeconds });
  summary.claimed = events.length;

  for (const event of events) {
    // Out of time: the remaining events keep their leases, which expire on
    // their own and return them to the pool. Nothing is lost by stopping.
    if (now() - startedAt > timeBudgetMs - TIME_RESERVE_MS) {
      break;
    }

    let result: HandlerResult;

    try {
      assertEventShape(event);
      result = await runHandlers(event, handlers);
    } catch (error) {
      // A malformed row will never become well-formed; anything else might.
      result =
        error instanceof OutboxContractError
          ? {
              outcome: "permanent_failure",
              errorCode: "invalid_event_contract",
              errorMessage: sanitizeErrorMessage(error.message),
            }
          : {
              outcome: "retryable_failure",
              errorCode: "handler_threw",
              errorMessage: undefined,
            };
    }

    try {
      const recorded = await recordOutcome({ repository, event, result });

      if (!recorded) {
        // The lease moved on while this worker was working. Another worker owns
        // the event now, so this outcome is simply dropped.
        summary.leaseConflicts += 1;
      } else if (result.outcome === "succeeded") {
        summary.succeeded += 1;
      } else if (result.outcome === "skipped") {
        summary.skipped += 1;
      } else if (
        result.outcome === "permanent_failure" ||
        !hasAttemptsLeft(event.attemptCount)
      ) {
        summary.deadLettered += 1;
      } else {
        summary.retried += 1;
      }

      // Identifiers and codes only — never the payload, never a client.
      log({
        workerId,
        eventId: event.id,
        providerId: event.providerId,
        bookingId: event.bookingId,
        eventType: event.eventType,
        aggregateVersion: event.aggregateVersion,
        attemptCount: event.attemptCount,
        outcome: recorded ? result.outcome : "lease_conflict",
        code: "errorCode" in result ? result.errorCode : undefined,
      });
    } catch (error) {
      // The outcome could not be written down. Leaving it unrecorded is the
      // honest option: the lease expires and the event is retried, rather than
      // this run pretending it handled something it did not.
      throw new OutboxInfrastructureError(
        "Could not record an outbox outcome.",
        error,
      );
    }
  }

  return summary;
}

async function recordOutcome(input: {
  repository: OutboxRepository;
  event: IntegrationOutboxEvent;
  result: HandlerResult;
}) {
  const { repository, event, result } = input;

  if (result.outcome === "succeeded") {
    return repository.complete(event.id, event.leaseToken);
  }

  if (result.outcome === "skipped") {
    return repository.skip(event.id, event.leaseToken, result.reasonCode);
  }

  if (result.outcome === "permanent_failure" || !hasAttemptsLeft(event.attemptCount)) {
    return repository.deadLetter({
      eventId: event.id,
      leaseToken: event.leaseToken,
      errorCode:
        result.outcome === "permanent_failure" ? result.errorCode : "attempts_exhausted",
      errorMessage: sanitizeErrorMessage(result.errorMessage),
    });
  }

  return repository.retry({
    eventId: event.id,
    leaseToken: event.leaseToken,
    delaySeconds: retryDelaySeconds(event.attemptCount),
    errorCode: result.errorCode,
    errorMessage: sanitizeErrorMessage(result.errorMessage),
  });
}
