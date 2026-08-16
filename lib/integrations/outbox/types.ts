/**
 * The shape of one outbound integration event, and the vocabulary the worker
 * and its handlers share.
 *
 * Deliberately free of `server-only`: the types are inert and the tests import
 * them without a Supabase client anywhere in reach.
 */

export const OUTBOX_EVENT_TYPES = [
  "booking.created",
  "booking.updated",
  "booking.rescheduled",
  "booking.cancelled",
] as const;

export type OutboxEventType = (typeof OUTBOX_EVENT_TYPES)[number];

export const OUTBOX_STATUSES = [
  "pending",
  "processing",
  "failed",
  "succeeded",
  "skipped",
  "dead_letter",
] as const;

export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

/**
 * Identifiers only, by design. A handler reloads the booking through an
 * authorized read; the event says *that* something changed, never *what* the
 * client wrote.
 */
export type OutboxPayload = {
  bookingId: string;
  providerId: string;
  aggregateVersion: number;
  change: OutboxEventType;
};

/** A claimed event, with the lease that makes a completion writable. */
export type IntegrationOutboxEvent = {
  id: string;
  providerId: string;
  bookingId: string;
  aggregateVersion: number;
  eventType: OutboxEventType;
  payloadSchemaVersion: number;
  payload: OutboxPayload;
  attemptCount: number;
  leaseToken: string;
};

/**
 * What a handler decided. A typed result rather than a thrown string: the
 * difference between "try again in a minute" and "this will never work" is a
 * decision the adapter must make explicitly, not one the worker infers from
 * matching error text.
 */
export type HandlerResult =
  | { outcome: "succeeded" }
  | { outcome: "skipped"; reasonCode: string }
  | { outcome: "retryable_failure"; errorCode: string; errorMessage?: string }
  | { outcome: "permanent_failure"; errorCode: string; errorMessage?: string };

export type IntegrationOutboxHandler = {
  key: string;
  /** Whether this adapter has anything to do with this event at all. */
  supports(event: IntegrationOutboxEvent): boolean;
  /**
   * Must be idempotent. Delivery is at-least-once: a crash or an expired lease
   * will replay an event the handler may already have delivered, so a handler
   * has to recognise its own prior work — normally by storing the external ID
   * and the aggregate version it last wrote.
   */
  deliver(event: IntegrationOutboxEvent): Promise<HandlerResult>;
};

/** Counts only. Never a payload, an error body, or anything about a client. */
export type OutboxRunSummary = {
  claimed: number;
  succeeded: number;
  skipped: number;
  retried: number;
  deadLettered: number;
  leaseConflicts: number;
};

export const NO_ACTIVE_INTEGRATIONS = "no_active_integrations";
