import {
  OUTBOX_EVENT_TYPES,
  type IntegrationOutboxEvent,
  type OutboxEventType,
} from "@/lib/integrations/outbox/types";

/** The infrastructure itself failed — no outcome could be recorded. */
export class OutboxInfrastructureError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "OutboxInfrastructureError";
  }
}

/** A claimed row did not look like an event. Treated as permanent. */
export class OutboxContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutboxContractError";
  }
}

export const MAX_ATTEMPTS = 8;
const INITIAL_DELAY_SECONDS = 30;
const MAX_DELAY_SECONDS = 6 * 60 * 60;

/**
 * Exponential backoff with a ceiling and a little jitter.
 *
 * The jitter matters more than it looks: a provider outage fails every event at
 * once, and without it every retry would land in the same second forever after,
 * rebuilding the thundering herd on each round.
 */
export function retryDelaySeconds(attemptCount: number, random = Math.random) {
  const exponent = Math.max(0, attemptCount - 1);
  const base = Math.min(INITIAL_DELAY_SECONDS * 2 ** exponent, MAX_DELAY_SECONDS);
  const jitter = base * 0.1 * random();

  return Math.min(Math.round(base + jitter), MAX_DELAY_SECONDS);
}

export function hasAttemptsLeft(attemptCount: number) {
  return attemptCount < MAX_ATTEMPTS;
}

function isEventType(value: unknown): value is OutboxEventType {
  return (OUTBOX_EVENT_TYPES as readonly string[]).includes(value as string);
}

/** Keeps a malformed row out of the handlers rather than into them. */
export function assertEventShape(event: IntegrationOutboxEvent) {
  if (!event.id || !event.bookingId || !event.providerId) {
    throw new OutboxContractError("Outbox event is missing its identifiers.");
  }

  if (!isEventType(event.eventType)) {
    throw new OutboxContractError("Outbox event carries an unknown type.");
  }

  if (!Number.isInteger(event.aggregateVersion) || event.aggregateVersion < 1) {
    throw new OutboxContractError("Outbox event carries an invalid version.");
  }

  if (!event.leaseToken) {
    throw new OutboxContractError("Outbox event arrived without a lease.");
  }
}

/**
 * Error text that is safe to store and log: bounded, and never the original
 * message, which could carry a URL, a token, or a provider's response body.
 */
export function sanitizeErrorMessage(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim().slice(0, 200);
  return trimmed || undefined;
}
