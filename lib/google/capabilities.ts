import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hasEntitlement } from "@/lib/entitlements/server";
import { MAX_BUSY_SOURCES } from "@/lib/google/calendar-client";
import {
  createClientForConnection,
  getConnection,
  type GoogleConnectionRow,
} from "@/lib/google/connections";
import { logger, type Logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The two later-stage capabilities, as a provider configures them.
 *
 * Both are off until switched on, and switching either on is a decision with
 * consequences a provider has to be able to see: busy blocking makes Haab read
 * calendars it otherwise never touches, and two-way lets a drag in Google move
 * an appointment a client was already told about. Neither is inferred from the
 * connection existing.
 *
 * Nothing here trusts the browser for anything but the choice itself. The
 * provider comes from the session, the entitlement is re-resolved server-side,
 * and a calendar id is accepted only if it is one this connection can actually
 * see.
 */

export type BusySourceView = {
  id: string;
  /**
   * The provider's own calendar, echoed back so the picker can show it as
   * chosen. It goes no further than their browser and never into a log.
   */
  calendarId: string;
  summary: string;
  enabled: boolean;
  lastRefreshedAt: string | null;
  /** A stable code, never Google's message. */
  lastErrorCode: string | null;
};

export type ConflictView = {
  id: string;
  conflictType: string;
  status: string;
  createdAt: string;
  bookingDate: string | null;
  bookingStartTime: string | null;
};

export type CapabilitiesView = {
  busyBlockingEnabled: boolean;
  twoWayEnabled: boolean;
  deletionCancelsBooking: boolean;
  busyBlockingAvailable: boolean;
  twoWayAvailable: boolean;
  busySources: BusySourceView[];
  maxBusySources: number;
  conflicts: ConflictView[];
};

export class CapabilityError extends Error {
  constructor(
    readonly userMessage: string,
    readonly status: number,
  ) {
    super(userMessage);
    this.name = "CapabilityError";
  }
}

type BusySourceRow = {
  id: string;
  calendar_id: string;
  calendar_summary: string | null;
  enabled: boolean;
  last_refreshed_at: string | null;
  last_error_code: string | null;
};

type ConflictRow = {
  id: string;
  conflict_type: string;
  status: string;
  created_at: string;
  safe_details: Record<string, unknown> | null;
};

/** Reads a value the conflict recorded, without trusting its shape. */
function readDetail(details: Record<string, unknown> | null, key: string): string | null {
  const value = details?.[key];
  return typeof value === "string" ? value : null;
}

export async function getCapabilities(
  providerId: string,
  client?: SupabaseClient,
): Promise<CapabilitiesView> {
  const admin = client ?? createAdminClient();
  const connection = await getConnection(providerId, admin);

  // Fail closed on both: an unresolvable entitlement is never a yes.
  const [busyBlockingAvailable, twoWayAvailable] = await Promise.all(
    (["google_calendar_busy_blocking", "google_calendar_two_way_sync"] as const).map(
      (feature) => hasEntitlement(providerId, feature, admin).catch(() => false),
    ),
  );

  const empty: CapabilitiesView = {
    busyBlockingEnabled: false,
    twoWayEnabled: false,
    deletionCancelsBooking: false,
    busyBlockingAvailable,
    twoWayAvailable,
    busySources: [],
    maxBusySources: MAX_BUSY_SOURCES,
    conflicts: [],
  };

  if (!connection) {
    return empty;
  }

  const [{ data: sources }, { data: conflicts }] = await Promise.all([
    admin
      .from("provider_google_calendar_busy_sources")
      .select("id, calendar_id, calendar_summary, enabled, last_refreshed_at, last_error_code")
      .eq("provider_id", providerId)
      .eq("connection_generation", connection.connection_generation)
      .order("calendar_summary", { ascending: true })
      .returns<BusySourceRow[]>(),
    admin
      .from("google_calendar_sync_conflicts")
      .select("id, conflict_type, status, created_at, safe_details")
      .eq("provider_id", providerId)
      .in("status", ["open", "repairing"])
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<ConflictRow[]>(),
  ]);

  return {
    ...empty,
    busyBlockingEnabled: connection.busy_blocking_enabled,
    twoWayEnabled: connection.two_way_enabled,
    deletionCancelsBooking: connection.deletion_cancels_booking,
    busySources: (sources ?? []).map((source) => ({
      id: source.id,
      calendarId: source.calendar_id,
      // What the provider recognises. The id is usually an email address.
      summary: source.calendar_summary ?? "Calendar",
      enabled: source.enabled,
      lastRefreshedAt: source.last_refreshed_at,
      lastErrorCode: source.last_error_code,
    })),
    conflicts: (conflicts ?? []).map((conflict) => ({
      id: conflict.id,
      conflictType: conflict.conflict_type,
      status: conflict.status,
      createdAt: conflict.created_at,
      bookingDate: readDetail(conflict.safe_details, "bookingDate"),
      bookingStartTime: readDetail(conflict.safe_details, "bookingStartTime"),
    })),
  };
}

async function assertEntitled(
  providerId: string,
  feature: "google_calendar_busy_blocking" | "google_calendar_two_way_sync",
  admin: SupabaseClient,
): Promise<void> {
  let entitled = false;

  try {
    entitled = await hasEntitlement(providerId, feature, admin);
  } catch {
    throw new CapabilityError("We could not confirm your plan just now.", 503);
  }

  if (!entitled) {
    throw new CapabilityError("That feature is not included in your plan.", 403);
  }
}

/**
 * Records which calendars block availability.
 *
 * The selection is replaced wholesale rather than patched, because "the set of
 * calendars I want read" is the thing a provider is deciding; merging would
 * make removing the last one impossible to express.
 */
async function replaceBusySources(
  admin: SupabaseClient,
  connection: GoogleConnectionRow,
  calendarIds: string[],
): Promise<void> {
  if (calendarIds.length > MAX_BUSY_SOURCES) {
    throw new CapabilityError(
      `Choose at most ${MAX_BUSY_SOURCES} calendars to check.`,
      400,
    );
  }

  if (calendarIds.some((id) => id === connection.target_calendar_id)) {
    // Haab's own events are Haab's bookings; reading them back as busy time
    // would make a service with room for two look full after one.
    throw new CapabilityError(
      "The calendar Haab writes to cannot also block availability.",
      400,
    );
  }

  // Verified against what this connection can actually see, so a calendar id
  // typed into a request body is not enough to make Haab read a calendar.
  const google = await createClientForConnection(connection, { client: admin });
  const page = await google.listCalendars();
  const visible = new Map(page.calendars.map((calendar) => [calendar.id, calendar]));

  for (const id of calendarIds) {
    if (!visible.has(id)) {
      throw new CapabilityError("That calendar is not available on this account.", 400);
    }
  }

  // Read, diff, delete by primary key. Building a PostgREST `in` list from
  // calendar ids would mean interpolating strings that contain quotes and
  // commas into a filter expression, which is a parser's problem at best.
  const { data: current, error: readError } = await admin
    .from("provider_google_calendar_busy_sources")
    .select("id, calendar_id")
    .eq("provider_id", connection.provider_id)
    .eq("connection_generation", connection.connection_generation)
    .returns<Array<{ id: string; calendar_id: string }>>();

  if (readError) {
    throw new CapabilityError("Could not update those calendars.", 500);
  }

  const keep = new Set(calendarIds);
  const removedIds = (current ?? [])
    .filter((row) => !keep.has(row.calendar_id))
    .map((row) => row.id);

  if (removedIds.length > 0) {
    const { error: deleteError } = await admin
      .from("provider_google_calendar_busy_sources")
      .delete()
      .in("id", removedIds);

    if (deleteError) {
      throw new CapabilityError("Could not update those calendars.", 500);
    }
  }

  if (calendarIds.length === 0) {
    return;
  }

  const { error: upsertError } = await admin
    .from("provider_google_calendar_busy_sources")
    .upsert(
      calendarIds.map((id) => {
        const calendar = visible.get(id)!;

        return {
          provider_id: connection.provider_id,
          connection_id: connection.id,
          connection_generation: connection.connection_generation,
          calendar_id: id,
          calendar_summary: calendar.summary,
          calendar_timezone: calendar.timeZone ?? null,
          access_role: calendar.accessRole,
          is_primary: calendar.primary,
          enabled: true,
        };
      }),
      { onConflict: "provider_id,connection_generation,calendar_id" },
    );

  if (upsertError) {
    throw new CapabilityError("Could not update those calendars.", 500);
  }
}

export type CapabilityUpdate = {
  busyBlockingEnabled?: boolean;
  twoWayEnabled?: boolean;
  deletionCancelsBooking?: boolean;
  busyCalendarIds?: string[];
};

/**
 * Applies a provider's capability choices.
 *
 * Switching something on is gated on the entitlement; switching it off never
 * is. A provider whose plan lapsed must still be able to stop Haab reading
 * their calendars — withdrawing consent cannot be a paid feature.
 */
export async function updateCapabilities(
  input: { providerId: string; update: CapabilityUpdate },
  options: { client?: SupabaseClient; logger?: Logger } = {},
): Promise<CapabilitiesView> {
  const admin = options.client ?? createAdminClient();
  const log = (options.logger ?? logger).child({ providerId: input.providerId });
  const connection = await getConnection(input.providerId, admin);

  if (!connection || connection.status === "disconnected") {
    throw new CapabilityError("Connect a Google account first.", 409);
  }

  const { update } = input;
  const patch: Record<string, unknown> = {};

  if (update.busyBlockingEnabled === true) {
    await assertEntitled(input.providerId, "google_calendar_busy_blocking", admin);
    patch.busy_blocking_enabled = true;
  } else if (update.busyBlockingEnabled === false) {
    patch.busy_blocking_enabled = false;
  }

  if (update.twoWayEnabled === true) {
    await assertEntitled(input.providerId, "google_calendar_two_way_sync", admin);

    if (!connection.target_calendar_id) {
      throw new CapabilityError("Choose a calendar to write to first.", 409);
    }

    patch.two_way_enabled = true;
  } else if (update.twoWayEnabled === false) {
    patch.two_way_enabled = false;
    // Deletion handling is meaningless without two-way, and leaving it set
    // would silently re-arm when two-way came back on.
    patch.deletion_cancels_booking = false;
  }

  if (update.deletionCancelsBooking !== undefined) {
    const stayingOn = patch.two_way_enabled ?? connection.two_way_enabled;

    if (update.deletionCancelsBooking && !stayingOn) {
      throw new CapabilityError("Turn on two-way sync first.", 409);
    }

    patch.deletion_cancels_booking = update.deletionCancelsBooking;
  }

  if (update.busyCalendarIds) {
    await assertEntitled(input.providerId, "google_calendar_busy_blocking", admin);
    await replaceBusySources(admin, connection, update.busyCalendarIds);
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await admin
      .from("provider_google_calendar_connections")
      .update(patch)
      .eq("id", connection.id)
      .eq("connection_generation", connection.connection_generation);

    if (error) {
      throw new CapabilityError("Could not save those settings.", 500);
    }
  }

  log.info("google.calendar.selected", {
    // Booleans only: which calendars a provider watches is not log material.
    outcome: "capabilities_updated",
  });

  return getCapabilities(input.providerId, admin);
}
