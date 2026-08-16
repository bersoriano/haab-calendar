import { NextResponse, type NextRequest } from "next/server";

import { requireEntitlement } from "@/lib/entitlements/server";
import { isGoogleConfigured } from "@/lib/google/config";
import {
  createClientForConnection,
  deleteConnection,
  getConnection,
  setTargetCalendar,
  toConnectionView,
} from "@/lib/google/connections";
import { reconcileProviderCalendar } from "@/lib/google/reconcile";
import { resolveRequestId, withRequestId } from "@/lib/observability/context";
import { toSafeError } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";
import { getProviderDashboardContext } from "@/lib/supabase/bookings";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Managing the Google connection: read its state, choose the calendar, or
 * disconnect.
 *
 * The provider is always resolved from the session. No route here accepts a
 * provider id, so no caller can act on an account that is not theirs.
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

  if (!context) {
    return { error: "no_provider" as const };
  }

  return { providerId: context.providerId };
}

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request.headers);
  const respond = (body: Record<string, unknown>, status = 200) =>
    withRequestId(NextResponse.json(body, { status }), requestId);

  if (!isGoogleConfigured()) {
    return respond({ available: false, connection: null });
  }

  const resolved = await resolveProvider();

  if ("error" in resolved) {
    return respond({ userMessage: "Not found." }, resolved.error === "unauthenticated" ? 401 : 404);
  }

  try {
    await requireEntitlement(resolved.providerId, "google_calendar_sync");
  } catch {
    return respond({ available: false, connection: null }, 403);
  }

  const connection = await getConnection(resolved.providerId);
  const view = toConnectionView(connection);

  // Calendars are only listed while there is a connection with no chosen
  // target — the moment the provider needs them, and no other.
  if (connection && connection.status === "connected" && !connection.target_calendar_id) {
    try {
      const google = await createClientForConnection(connection);
      const calendars = await google.listCalendars();

      return respond({
        available: true,
        connection: view,
        // The id is a server-side handle for the next request, and is not the
        // calendar's address: it is echoed back, never displayed.
        calendars: calendars.map((calendar) => ({
          id: calendar.id,
          summary: calendar.summary,
          timeZone: calendar.timeZone,
          primary: calendar.primary,
        })),
      });
    } catch {
      return respond({ available: true, connection: view, calendars: [] });
    }
  }

  return respond({ available: true, connection: view });
}

export async function PUT(request: NextRequest) {
  const requestId = resolveRequestId(request.headers);
  const log = logger.child({ requestId });
  const respond = (body: Record<string, unknown>, status = 200) =>
    withRequestId(NextResponse.json(body, { status }), requestId);

  const resolved = await resolveProvider();

  if ("error" in resolved) {
    return respond({ userMessage: "Not found." }, resolved.error === "unauthenticated" ? 401 : 404);
  }

  try {
    await requireEntitlement(resolved.providerId, "google_calendar_sync");
  } catch {
    return respond({ userMessage: "Google Calendar sync is not enabled." }, 403);
  }

  let body: { calendarId?: unknown };

  try {
    body = (await request.json()) as { calendarId?: unknown };
  } catch {
    return respond({ userMessage: "Invalid request." }, 400);
  }

  if (typeof body.calendarId !== "string" || !body.calendarId.trim()) {
    return respond({ userMessage: "Choose a calendar." }, 400);
  }

  const connection = await getConnection(resolved.providerId);

  if (!connection || connection.status !== "connected") {
    return respond({ userMessage: "Connect Google Calendar first." }, 409);
  }

  try {
    const google = await createClientForConnection(connection);
    const calendars = await google.listCalendars();
    // Re-checked against Google rather than trusted from the request: the
    // client could name any calendar, including one this account cannot write
    // to or does not own.
    const chosen = calendars.find((calendar) => calendar.id === body.calendarId);

    if (!chosen || !["writer", "owner"].includes(chosen.accessRole)) {
      return respond({ userMessage: "That calendar cannot be written to." }, 400);
    }

    await setTargetCalendar({
      providerId: resolved.providerId,
      calendarId: chosen.id,
      summary: chosen.summary,
      timeZone: chosen.timeZone,
    });

    // Existing bookings predate the connection and produced no outbox work, so
    // this is what puts them on the calendar.
    const summary = await reconcileProviderCalendar({ providerId: resolved.providerId });

    log.info("entitlements.override_applied", {
      providerId: resolved.providerId,
      featureKey: "google_calendar_sync",
      outcome: "calendar_selected",
      written: summary.written,
    });

    return respond({ ok: true, reconciled: summary });
  } catch (error) {
    const safe = toSafeError(error);
    log.error("entitlements.denied", {
      providerId: resolved.providerId,
      errorCode: safe.code,
    });

    return respond({ userMessage: "Could not select that calendar." }, 500);
  }
}

/**
 * Disconnecting is deliberately not gated on entitlement.
 *
 * A provider whose plan lapsed must still be able to revoke Haab's access to
 * their calendar — holding their credentials hostage to a subscription would be
 * indefensible.
 */
export async function DELETE(request: NextRequest) {
  const requestId = resolveRequestId(request.headers);
  const respond = (body: Record<string, unknown>, status = 200) =>
    withRequestId(NextResponse.json(body, { status }), requestId);

  const resolved = await resolveProvider();

  if ("error" in resolved) {
    return respond({ userMessage: "Not found." }, resolved.error === "unauthenticated" ? 401 : 404);
  }

  await deleteConnection(resolved.providerId);

  return respond({ ok: true });
}
