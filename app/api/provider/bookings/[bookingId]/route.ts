import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  cancelProviderBooking,
  PublicBookingWriteError,
  rescheduleProviderBooking,
} from "@/lib/supabase/bookings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProviderBookingBody = {
  action?: unknown;
  dateKey?: unknown;
  time?: unknown;
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

  try {
    if (action === "cancel") {
      const result = await cancelProviderBooking(supabase, bookingId);
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

      const result = await rescheduleProviderBooking(supabase, {
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
      return NextResponse.json(
        { userMessage: error.userMessage },
        { status: error.status },
      );
    }

    console.error("provider_booking_update_failed", {
      userId: user.id,
      bookingId,
      action,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { userMessage: "Could not update that booking." },
      { status: 500 },
    );
  }
}
