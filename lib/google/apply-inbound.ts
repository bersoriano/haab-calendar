import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hasEntitlement } from "@/lib/entitlements/server";
import { getConnection } from "@/lib/google/connections";
import { InboundTimeError, parseInboundTimes } from "@/lib/google/inbound-time";
import { logger, type Logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cancelProviderBooking,
  PublicBookingWriteError,
  rescheduleProviderBooking,
} from "@/lib/supabase/bookings";

/**
 * Letting a provider's Google calendar change a Haab booking.
 *
 * This is the only direction of sync where Haab is not the author, so it is
 * written to be suspicious. Every staged change has to prove four things before
 * it touches a booking: the provider still has the entitlement, the connection
 * still has two-way switched on, the event is one Haab created and still owns,
 * and the change is newer than whatever Haab last saw.
 *
 * When a change is legitimate but Haab would not make it — a resize, a move
 * into an occupied slot, a deletion the provider did not opt into — nothing is
 * forced through. A conflict row is written instead, and the booking stays as
 * it is. A booking is an agreement with a client; a drag in a calendar UI is
 * not authority to break it.
 *
 * The mutations themselves go through the same functions the Haab UI calls, so
 * business hours, capacity, and overlap are enforced once and identically. No
 * booking SQL lives in this file on purpose.
 */

const MAX_ATTEMPTS = 5;

type InboundChangeRow = {
  id: string;
  provider_id: string;
  connection_id: string;
  connection_generation: string;
  booking_id: string | null;
  google_event_id: string;
  google_event_etag: string | null;
  google_updated_at: string | null;
  google_status: "confirmed" | "tentative" | "cancelled";
  start_payload: Record<string, unknown> | null;
  end_payload: Record<string, unknown> | null;
  event_type: string | null;
  recurring_event_id: string | null;
  haab_properties: Record<string, unknown> | null;
  attempt_count: number;
  lease_token: string;
};

type MappingRow = {
  id: string;
  booking_id: string;
  google_event_id: string;
  google_calendar_id: string;
  google_event_etag: string | null;
  last_google_etag: string | null;
  last_google_updated_at: string | null;
  last_projected_booking_version: number | null;
  google_applied_booking_version: number | null;
};

type BookingRow = {
  id: string;
  provider_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  integration_version: number;
};

export type ConflictType =
  | "duration_changed"
  | "outside_business_hours"
  | "haab_booking_overlap"
  | "google_busy_overlap"
  | "capacity_conflict"
  | "invalid_timezone"
  | "recurrence_not_supported"
  | "calendar_changed"
  | "ownership_mismatch"
  | "stale_google_change"
  | "booking_not_mutable"
  | "deletion_not_allowed";

export type ApplyOutcome =
  | "applied"
  | "cancelled"
  | "echo_suppressed"
  | "stale"
  | "conflict"
  | "rejected"
  | "skipped";

export type ApplyRunSummary = {
  claimed: boolean;
  outcome: ApplyOutcome | null;
  conflictType: ConflictType | null;
};

/** Minutes a booking currently occupies, or null when it has no clock times. */
function bookingDurationMinutes(booking: BookingRow): number | null {
  if (!booking.start_time || !booking.end_time) {
    return null;
  }

  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(":");
    return Number(hours) * 60 + Number(minutes);
  };

  const span = toMinutes(booking.end_time) - toMinutes(booking.start_time);

  // An end before a start means the booking crosses midnight; that is a shape
  // this comparison cannot speak to, so it declines rather than guessing.
  return span > 0 ? span : null;
}

/**
 * Turning a refusal from the booking layer into a conflict a provider can read.
 *
 * The booking layer's messages are written for clients and can change; matching
 * on them would be brittle. The status is the stable part, and the narrower
 * cases are distinguished only where the layer already distinguishes them.
 */
function conflictForWriteError(error: PublicBookingWriteError): ConflictType {
  if (error.status !== 409) {
    return "booking_not_mutable";
  }

  return /just booked|available|slot/i.test(error.userMessage)
    ? "haab_booking_overlap"
    : "booking_not_mutable";
}

async function recordConflict(
  admin: SupabaseClient,
  input: {
    change: InboundChangeRow;
    booking: BookingRow;
    mappingId: string | null;
    conflictType: ConflictType;
    safeDetails?: Record<string, unknown>;
  },
): Promise<void> {
  // Safe details only: what Haab holds and what shape the change had. Never the
  // event's summary, description, location, attendees, or the client's data.
  const { error } = await admin.from("google_calendar_sync_conflicts").insert({
    provider_id: input.change.provider_id,
    booking_id: input.booking.id,
    event_mapping_id: input.mappingId,
    inbound_change_id: input.change.id,
    conflict_type: input.conflictType,
    booking_version: input.booking.integration_version,
    google_event_etag: input.change.google_event_etag,
    status: "open",
    safe_details: {
      bookingDate: input.booking.date,
      bookingStartTime: input.booking.start_time,
      bookingEndTime: input.booking.end_time,
      ...input.safeDetails,
    },
  });

  if (error) {
    throw new Error("Could not record a Google sync conflict.");
  }
}

async function release(
  admin: SupabaseClient,
  change: InboundChangeRow,
  patch: Record<string, unknown>,
): Promise<void> {
  await admin
    .from("google_calendar_inbound_changes")
    .update({
      lease_token: null,
      leased_by: null,
      lease_expires_at: null,
      ...patch,
    })
    .eq("id", change.id)
    .eq("lease_token", change.lease_token);
}

const settle = (status: string, errorCode: string | null = null) => ({
  status,
  processed_at: new Date().toISOString(),
  last_error_code: errorCode,
});

/**
 * Claims one staged change and applies it, or explains why it will not be.
 *
 * Returns rather than throws for every business outcome; an exception here
 * means infrastructure failed, and only then is the change retried.
 */
export async function runGoogleInboundApplyWorker(
  options: {
    client?: SupabaseClient;
    workerId?: string;
    logger?: Logger;
  } = {},
): Promise<ApplyRunSummary> {
  const admin = options.client ?? createAdminClient();
  const workerId = options.workerId ?? `google-apply-${randomUUID()}`;
  const log = (options.logger ?? logger).child({ workerId });

  const idle: ApplyRunSummary = { claimed: false, outcome: null, conflictType: null };

  const { data, error: claimError } = await admin.rpc("claim_google_inbound_change", {
    p_worker_id: workerId,
    p_lease_seconds: 120,
  });

  if (claimError) {
    throw new Error("Could not claim a Google inbound change.");
  }

  // PostgREST renders a composite-returning function as an object of nulls when
  // the function returned SQL NULL, so "nothing to do" is not `null` here.
  const change = data as InboundChangeRow | null;

  if (!change?.id) {
    return idle;
  }

  const changeLog = log.child({ providerId: change.provider_id });

  try {
    const result = await applyChange(admin, change, changeLog);

    await release(
      admin,
      change,
      result.outcome === "applied" || result.outcome === "cancelled"
        ? settle("applied")
        : result.outcome === "conflict"
          ? settle("rejected", result.conflictType)
          : result.outcome === "rejected"
            ? settle("rejected", result.errorCode ?? null)
            : settle("skipped", result.errorCode ?? null),
    );

    return {
      claimed: true,
      outcome: result.outcome,
      conflictType: result.conflictType ?? null,
    };
  } catch (error) {
    const exhausted = change.attempt_count >= MAX_ATTEMPTS;

    await release(admin, change, {
      status: exhausted ? "dead_letter" : "failed",
      ...(exhausted ? { processed_at: new Date().toISOString() } : {}),
      available_at: new Date(Date.now() + 60_000 * change.attempt_count).toISOString(),
      last_error_code: error instanceof Error ? "apply_failed" : "unknown",
    });

    changeLog.error("google.inbound.failed", {
      attemptCount: change.attempt_count,
      outcome: exhausted ? "dead_letter" : "retry",
    });

    return { claimed: true, outcome: null, conflictType: null };
  }
}

type ChangeResult = {
  outcome: ApplyOutcome;
  conflictType?: ConflictType;
  errorCode?: string;
};

async function applyChange(
  admin: SupabaseClient,
  change: InboundChangeRow,
  log: Logger,
): Promise<ChangeResult> {
  // ── Is this change still allowed to exist? ───────────────────────────────
  const connection = await getConnection(change.provider_id, admin);

  if (
    !connection ||
    connection.connection_generation !== change.connection_generation ||
    connection.status !== "connected"
  ) {
    return { outcome: "skipped", errorCode: "connection_superseded" };
  }

  if (!connection.two_way_enabled) {
    // Switched off between staging and applying. The provider's last word wins.
    return { outcome: "skipped", errorCode: "two_way_disabled" };
  }

  // Fail closed: an entitlement that cannot be resolved is not an entitlement.
  let entitled = false;

  try {
    entitled = await hasEntitlement(
      change.provider_id,
      "google_calendar_two_way_sync",
      admin,
    );
  } catch {
    throw new Error("Could not resolve the two-way entitlement.");
  }

  if (!entitled) {
    return { outcome: "skipped", errorCode: "not_entitled" };
  }

  if (!change.booking_id) {
    // An event on the calendar that is not Haab's. Staging kept it only long
    // enough to say so.
    return { outcome: "skipped", errorCode: "unmanaged_event" };
  }

  // ── Ownership: is this the event Haab wrote for this booking? ────────────
  const { data: mapping } = await admin
    .from("provider_google_calendar_event_mappings")
    .select(
      "id, booking_id, google_event_id, google_calendar_id, google_event_etag, last_google_etag, last_google_updated_at, last_projected_booking_version, google_applied_booking_version",
    )
    .eq("booking_id", change.booking_id)
    .eq("connection_generation", change.connection_generation)
    .maybeSingle<MappingRow>();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, provider_id, date, start_time, end_time, status, integration_version")
    .eq("id", change.booking_id)
    .eq("provider_id", change.provider_id)
    .maybeSingle<BookingRow>();

  if (!booking) {
    return { outcome: "skipped", errorCode: "booking_missing" };
  }

  if (!mapping || mapping.google_event_id !== change.google_event_id) {
    await recordConflict(admin, {
      change,
      booking,
      mappingId: mapping?.id ?? null,
      conflictType: "ownership_mismatch",
    });
    log.warn("google.inbound.conflict_created", { conflictType: "ownership_mismatch" });

    return { outcome: "conflict", conflictType: "ownership_mismatch" };
  }

  // ── Is this Haab's own write coming back? ────────────────────────────────
  // Explicit origin, not a time window: "recent" is a guess, and a guess here
  // either drops a real edit or loops forever.
  if (
    change.google_event_etag &&
    (change.google_event_etag === mapping.google_event_etag ||
      change.google_event_etag === mapping.last_google_etag)
  ) {
    log.info("google.inbound.echo_suppressed", {});

    return { outcome: "echo_suppressed" };
  }

  if (
    change.google_updated_at &&
    mapping.last_google_updated_at &&
    change.google_updated_at <= mapping.last_google_updated_at
  ) {
    // A notification that arrived out of order. Applying it would undo a newer
    // change that already landed.
    return { outcome: "stale", errorCode: "stale_google_change" };
  }

  if (booking.status === "cancelled") {
    return { outcome: "skipped", errorCode: "booking_already_cancelled" };
  }

  // ── Deletion ────────────────────────────────────────────────────────────
  if (change.google_status === "cancelled") {
    if (!connection.deletion_cancels_booking) {
      // Deleting an event is not the same act as cancelling on a client, and
      // only the provider can say the two mean the same thing for them.
      await recordConflict(admin, {
        change,
        booking,
        mappingId: mapping.id,
        conflictType: "deletion_not_allowed",
      });
      log.warn("google.inbound.conflict_created", {
        conflictType: "deletion_not_allowed",
      });

      return { outcome: "conflict", conflictType: "deletion_not_allowed" };
    }

    try {
      await cancelProviderBooking(admin, booking.id, "google_calendar");
    } catch (error) {
      if (error instanceof PublicBookingWriteError) {
        const conflictType = conflictForWriteError(error);
        await recordConflict(admin, { change, booking, mappingId: mapping.id, conflictType });

        return { outcome: "conflict", conflictType };
      }

      throw error;
    }

    await markMappingApplied(admin, mapping.id, change, booking);
    log.info("google.inbound.cancellation_applied", { bookingId: booking.id });

    return { outcome: "cancelled" };
  }

  // ── Recurrence ──────────────────────────────────────────────────────────
  if (change.recurring_event_id) {
    await recordConflict(admin, {
      change,
      booking,
      mappingId: mapping.id,
      conflictType: "recurrence_not_supported",
    });

    return { outcome: "conflict", conflictType: "recurrence_not_supported" };
  }

  // ── Times ───────────────────────────────────────────────────────────────
  const { data: provider } = await admin
    .from("providers")
    .select("id, timezone")
    .eq("id", change.provider_id)
    .maybeSingle<{ id: string; timezone: string | null }>();

  if (!provider?.timezone) {
    return { outcome: "skipped", errorCode: "provider_timezone_missing" };
  }

  let times;

  try {
    times = parseInboundTimes({
      start: change.start_payload,
      end: change.end_payload,
      providerTimeZone: provider.timezone,
    });
  } catch (error) {
    if (error instanceof InboundTimeError) {
      const conflictType: ConflictType =
        error.reason === "invalid_timezone" ? "invalid_timezone" : "duration_changed";

      await recordConflict(admin, {
        change,
        booking,
        mappingId: mapping.id,
        conflictType,
        safeDetails: { reason: error.reason },
      });

      return { outcome: "conflict", conflictType };
    }

    throw error;
  }

  if (times.kind === "all_day") {
    // A timed booking turned into an all-day block is a different appointment,
    // not a move of this one.
    await recordConflict(admin, {
      change,
      booking,
      mappingId: mapping.id,
      conflictType: "duration_changed",
      safeDetails: { googleShape: "all_day" },
    });

    return { outcome: "conflict", conflictType: "duration_changed" };
  }

  const currentDuration = bookingDurationMinutes(booking);

  if (currentDuration !== null && times.durationMinutes !== currentDuration) {
    // Length is the service's, not the calendar's. Honouring a drag-resize
    // would silently sell a different appointment than the one booked.
    await recordConflict(admin, {
      change,
      booking,
      mappingId: mapping.id,
      conflictType: "duration_changed",
      safeDetails: {
        expectedDurationMinutes: currentDuration,
        googleDurationMinutes: times.durationMinutes,
      },
    });
    log.warn("google.inbound.conflict_created", { conflictType: "duration_changed" });

    return { outcome: "conflict", conflictType: "duration_changed" };
  }

  if (times.dateKey === booking.date && times.time === booking.start_time?.slice(0, 5)) {
    // Nothing about the schedule moved; whatever changed was content Haab does
    // not track.
    return { outcome: "skipped", errorCode: "no_schedule_change" };
  }

  // ── Apply, through the same path the Haab UI uses ────────────────────────
  try {
    await rescheduleProviderBooking(
      admin,
      { bookingId: booking.id, dateKey: times.dateKey, time: times.time },
      "google_calendar",
    );
  } catch (error) {
    if (error instanceof PublicBookingWriteError) {
      const conflictType = conflictForWriteError(error);

      await recordConflict(admin, {
        change,
        booking,
        mappingId: mapping.id,
        conflictType,
        safeDetails: { requestedDate: times.dateKey, requestedTime: times.time },
      });
      log.warn("google.inbound.conflict_created", { conflictType });

      return { outcome: "conflict", conflictType };
    }

    throw error;
  }

  await markMappingApplied(admin, mapping.id, change, booking);
  log.info("google.inbound.reschedule_applied", { bookingId: booking.id });

  return { outcome: "applied" };
}

/**
 * Records that this revision of the Google event is the one Haab has consumed.
 *
 * Without this the next notification for the same edit looks new, and the
 * booking is rewritten to a value it already holds — harmless once, an audit
 * full of phantom reschedules over time.
 */
async function markMappingApplied(
  admin: SupabaseClient,
  mappingId: string,
  change: InboundChangeRow,
  booking: BookingRow,
): Promise<void> {
  await admin
    .from("provider_google_calendar_event_mappings")
    .update({
      last_google_etag: change.google_event_etag,
      last_google_updated_at: change.google_updated_at,
      last_applied_inbound_change_id: change.id,
      google_applied_booking_version: booking.integration_version,
    })
    .eq("id", mappingId);
}
