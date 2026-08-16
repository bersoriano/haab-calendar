import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { OutboxInfrastructureError } from "@/lib/integrations/outbox/errors";
import {
  OUTBOX_EVENT_TYPES,
  type IntegrationOutboxEvent,
  type OutboxEventType,
  type OutboxPayload,
} from "@/lib/integrations/outbox/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The only place that talks to the outbox tables.
 *
 * Every call goes through the service role, which is why this module is
 * server-only: the outbox carries no grant for anon or authenticated, and the
 * key must never travel further than this file's callers.
 */

type OutboxRow = {
  id: string;
  provider_id: string;
  booking_id: string;
  aggregate_version: number | string;
  event_type: string;
  payload_schema_version: number;
  payload: unknown;
  attempt_count: number;
  lease_token: string | null;
};

function isEventType(value: unknown): value is OutboxEventType {
  return (OUTBOX_EVENT_TYPES as readonly string[]).includes(value as string);
}

function toEvent(row: OutboxRow): IntegrationOutboxEvent {
  // bigint arrives as a string over PostgREST; a version compared as text would
  // order 10 before 9.
  const aggregateVersion = Number(row.aggregate_version);

  if (!isEventType(row.event_type)) {
    throw new OutboxInfrastructureError("Claimed an event of an unknown type.");
  }

  if (!row.lease_token) {
    throw new OutboxInfrastructureError("Claimed an event without a lease token.");
  }

  return {
    id: row.id,
    providerId: row.provider_id,
    bookingId: row.booking_id,
    aggregateVersion,
    eventType: row.event_type,
    payloadSchemaVersion: row.payload_schema_version,
    payload: (row.payload ?? {}) as OutboxPayload,
    attemptCount: row.attempt_count,
    leaseToken: row.lease_token,
  };
}

export type OutboxRepository = {
  claim(input: {
    workerId: string;
    batchSize: number;
    leaseSeconds: number;
  }): Promise<IntegrationOutboxEvent[]>;
  /** Each returns false when the lease no longer matches — a stale worker. */
  complete(eventId: string, leaseToken: string): Promise<boolean>;
  skip(eventId: string, leaseToken: string, reasonCode: string): Promise<boolean>;
  retry(input: {
    eventId: string;
    leaseToken: string;
    delaySeconds: number;
    errorCode: string;
    errorMessage?: string;
  }): Promise<boolean>;
  deadLetter(input: {
    eventId: string;
    leaseToken: string;
    errorCode: string;
    errorMessage?: string;
  }): Promise<boolean>;
};

export function createOutboxRepository(client?: SupabaseClient): OutboxRepository {
  const admin = client ?? createAdminClient();

  async function callBoolean(name: string, args: Record<string, unknown>) {
    const { data, error } = await admin.rpc(name, args);

    if (error) {
      throw new OutboxInfrastructureError(`Outbox RPC ${name} failed.`, error);
    }

    return data === true;
  }

  return {
    async claim({ workerId, batchSize, leaseSeconds }) {
      const { data, error } = await admin.rpc("claim_integration_outbox_events", {
        p_worker_id: workerId,
        p_batch_size: batchSize,
        p_lease_seconds: leaseSeconds,
      });

      if (error) {
        throw new OutboxInfrastructureError("Could not claim outbox events.", error);
      }

      return ((data ?? []) as OutboxRow[]).map(toEvent);
    },

    complete(eventId, leaseToken) {
      return callBoolean("complete_integration_outbox_event", {
        p_event_id: eventId,
        p_lease_token: leaseToken,
      });
    },

    skip(eventId, leaseToken, reasonCode) {
      return callBoolean("skip_integration_outbox_event", {
        p_event_id: eventId,
        p_lease_token: leaseToken,
        p_reason_code: reasonCode,
      });
    },

    retry({ eventId, leaseToken, delaySeconds, errorCode, errorMessage }) {
      return callBoolean("retry_integration_outbox_event", {
        p_event_id: eventId,
        p_lease_token: leaseToken,
        p_delay_seconds: delaySeconds,
        p_error_code: errorCode,
        p_error_message: errorMessage ?? null,
      });
    },

    deadLetter({ eventId, leaseToken, errorCode, errorMessage }) {
      return callBoolean("dead_letter_integration_outbox_event", {
        p_event_id: eventId,
        p_lease_token: leaseToken,
        p_error_code: errorCode,
        p_error_message: errorMessage ?? null,
      });
    },
  };
}
