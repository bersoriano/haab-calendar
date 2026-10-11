import { NextResponse, type NextRequest } from "next/server";

import { describeError } from "@/lib/describe-error";
import { createClient } from "@/lib/supabase/server";
import {
  cancelProviderBooking,
  PublicBookingWriteError,
  rescheduleProviderBooking,
  setProviderBookingReviewed,
} from "@/lib/supabase/bookings";
import { resolveDemoEditTarget, type DemoEditTarget } from "@/lib/supabase/demo-edit";

/**
 * Demo editing runs on a service-role client, which RLS no longer scopes, so
 * the booking must be proven to belong to the demo provider being edited.
 */
async function demoOwnsBooking(target: DemoEditTarget, bookingId: string) {
  const { data, error } = await target.admin
    .from("bookings")
    .select("provider_id")
    .eq("id", bookingId)
    .maybeSingle<{ provider_id: string }>();

  if (error) {
    throw error;
  }

  return data?.provider_id === target.providerId;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProviderBookingBody = {
  action?: unknown;
  dateKey?: unknown;
  time?: unknown;
  reviewed?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown) {
  const text = readString(value);
  return text || undefined;
}

async function readBody(request: NextRequest) {
  try {
    return (await request.json()) as ProviderBookingBody;
  } catch {
    return null;
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { userMessage: "Sign in before updating bookings." },
      { status: 401 },
    );
  }

  const { bookingId } = await context.params;
  const body = await readBody(request);
  const action = readString(body?.action);

  if (!body || !action) {
    return NextResponse.json(
      { userMessage: "Choose a booking action." },
      { status: 400 },
    );
  }

  const demoTarget = await resolveDemoEditTarget();

  if (demoTarget && !(await demoOwnsBooking(demoTarget, bookingId))) {
    return NextResponse.json(
      { userMessage: "That booking is not part of this demo page." },
      { status: 404 },
    );
  }

  const bookingClient = demoTarget?.admin ?? supabase;

  try {
    if (action === "cancel") {
      const result = await cancelProviderBooking(bookingClient, bookingId);
      return NextResponse.json(result);
    }

    if (action === "review") {
      if (typeof body.reviewed !== "boolean") {
        return NextResponse.json(
          { userMessage: "Say whether the booking has been seen." },
          { status: 400 },
        );
      }

      const result = await setProviderBookingReviewed(bookingClient, bookingId, body.reviewed);
      return NextResponse.json(result);
    }

    if (action === "reschedule") {
      const dateKey = readString(body.dateKey);

      if (!dateKey) {
        return NextResponse.json(
          { userMessage: "Choose a new booking date." },
          { status: 400 },
        );
      }

      const result = await rescheduleProviderBooking(bookingClient, {
        bookingId,
        dateKey,
        time: readOptionalString(body.time),
      });

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { userMessage: "Unsupported booking action." },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof PublicBookingWriteError) {
      // The provider only ever sees one sentence, so without this nothing says
      // which rule turned the request away. A 4xx is an expected answer; a 5xx
      // is the database refusing, and its own words are the only lead.
      const log = error.status >= 500 ? console.error : console.warn;

      log("provider_booking_update_refused", {
        userId: user.id,
        bookingId,
        action,
        status: error.status,
        error: describeError(error.cause ?? error),
      });

      return NextResponse.json(
        { userMessage: error.userMessage },
        { status: error.status },
      );
    }

    console.error("provider_booking_update_failed", {
      userId: user.id,
      bookingId,
      action,
      error: describeError(error),
    });

    return NextResponse.json(
      { userMessage: "Could not update that booking." },
      { status: 500 },
    );
  }
}
