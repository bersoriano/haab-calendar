import { NextResponse, type NextRequest } from "next/server";

import {
  CapabilityError,
  getCapabilities,
  updateCapabilities,
  type CapabilityUpdate,
} from "@/lib/google/capabilities";
import { isGoogleConfigured } from "@/lib/google/config";
import { syncWatchChannels } from "@/lib/google/watch-worker";
import { createClientForConnection, getConnection } from "@/lib/google/connections";
import { resolveRequestId, withRequestId } from "@/lib/observability/context";
import { toSafeError } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";
import { getProviderDashboardContext } from "@/lib/supabase/bookings";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Busy blocking and two-way sync, as the provider configures them.
 *
 * The provider is resolved from the session on every request. Nothing here
 * accepts a provider id, a connection id, or an entitlement claim from the
 * browser — the body carries choices, never identity.
 */

async function resolveProvider() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "unauthenticated" as const };
  }

  const context = await getProviderDashboardContext(supabase, user.id);

  return context ? { providerId: context.providerId } : { error: "no_provider" as const };
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readCalendarIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const ids = value.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
  );

  // Deduplicated here so the same calendar chosen twice is one source rather
  // than two rows that fight over the same unique constraint.
  return Array.from(new Set(ids.map((id) => id.trim())));
}

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request.headers);
  const respond = (body: Record<string, unknown>, status = 200) =>
    withRequestId(NextResponse.json(body, { status }), requestId);

  if (!isGoogleConfigured()) {
    return respond({ available: false, capabilities: null });
  }

  const resolved = await resolveProvider();

  if ("error" in resolved) {
    return respond(
      { userMessage: "Not found." },
      resolved.error === "unauthenticated" ? 401 : 404,
    );
  }

  try {
    const capabilities = await getCapabilities(resolved.providerId);

    if (!capabilities.busyBlockingAvailable) {
      return respond({ available: true, capabilities, calendars: [] });
    }

    // Listed only for a provider who can actually pick one, and only on this
    // settings request — a Google call per dashboard render would be a Google
    // call per page view.
    try {
      const connection = await getConnection(resolved.providerId);

      if (!connection || connection.status !== "connected") {
        return respond({ available: true, capabilities, calendars: [] });
      }

      const google = await createClientForConnection(connection);
      const page = await google.listCalendars();

      return respond({
        available: true,
        capabilities,
        calendars: page.calendars
          // The calendar Haab writes to is never offered as a source: its
          // events are Haab's own bookings.
          .filter((calendar) => calendar.id !== connection.target_calendar_id)
          .map((calendar) => ({
            id: calendar.id,
            summary: calendar.summary,
            primary: calendar.primary,
          })),
        truncated: page.truncated,
      });
    } catch {
      // A listing failure must not hide the settings that are already saved.
      return respond({ available: true, capabilities, calendars: [] });
    }
  } catch (error) {
    const safe = toSafeError(error);
    logger.child({ requestId }).error("google.busy.refresh_failed", {
      errorCode: safe.code,
      outcome: "failed",
    });

    return respond({ userMessage: "Could not load those settings." }, 500);
  }
}

export async function PUT(request: NextRequest) {
  const requestId = resolveRequestId(request.headers);
  const log = logger.child({ requestId });
  const respond = (body: Record<string, unknown>, status = 200) =>
    withRequestId(NextResponse.json(body, { status }), requestId);

  const resolved = await resolveProvider();

  if ("error" in resolved) {
    return respond(
      { userMessage: "Not found." },
      resolved.error === "unauthenticated" ? 401 : 404,
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return respond({ userMessage: "Could not read that request." }, 400);
  }

  const source = (body ?? {}) as Record<string, unknown>;
  const update: CapabilityUpdate = {
    busyBlockingEnabled: readBoolean(source.busyBlockingEnabled),
    twoWayEnabled: readBoolean(source.twoWayEnabled),
    deletionCancelsBooking: readBoolean(source.deletionCancelsBooking),
    busyCalendarIds: readCalendarIds(source.busyCalendarIds),
  };

  try {
    const capabilities = await updateCapabilities({
      providerId: resolved.providerId,
      update,
    });

    // Channels follow the capabilities: switching one on starts a watch,
    // switching it off stops one. Failing to reach Google here must not fail
    // the save — the periodic worker reconciles channels on its own schedule.
    try {
      const connection = await getConnection(resolved.providerId);

      if (connection) {
        await syncWatchChannels(connection);
      }
    } catch {
      log.warn("google.watch.failed", { outcome: "deferred_to_worker" });
    }

    return respond({ available: true, capabilities });
  } catch (error) {
    if (error instanceof CapabilityError) {
      return respond({ userMessage: error.userMessage }, error.status);
    }

    const safe = toSafeError(error);
    log.error("google.busy.refresh_failed", { errorCode: safe.code, outcome: "failed" });

    return respond({ userMessage: "Could not save those settings." }, 500);
  }
}
