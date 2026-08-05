import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  cancelManagedBooking,
  getManagedBooking,
  MANAGED_CLIENT_NOTE_MAX_LENGTH,
  PublicBookingWriteError,
  rescheduleManagedBooking,
  updateManagedBookingNote,
} from "@/lib/supabase/bookings";
import {
  normalizeUrlSlugSegment,
  parsePublicVerticalSegment,
  validateProviderSlug,
} from "@/lib/public-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ManageBody = {
  action?: unknown;
  dateKey?: unknown;
  time?: unknown;
  note?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown) {
  const text = readString(value);
  return text || undefined;
}

function readRouteParams(params: {
  verticalSegment: string;
  providerSlug: string;
  token: string;
}) {
  const vertical = parsePublicVerticalSegment(params.verticalSegment);
  const providerSlug = normalizeUrlSlugSegment(params.providerSlug);
  const token = readString(params.token);

  if (!vertical || !validateProviderSlug(providerSlug).ok || !token) {
    return null;
  }

  return { vertical, providerSlug, token };
}

async function readBody(request: NextRequest) {
  try {
    return (await request.json()) as ManageBody;
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ verticalSegment: string; providerSlug: string; token: string }>;
  },
) {
  const routeParams = readRouteParams(await context.params);

  if (!routeParams) {
    return NextResponse.json(
      { userMessage: "This booking link is invalid." },
      { status: 400 },
    );
  }

  try {
    const result = await getManagedBooking(createAdminClient(), routeParams);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PublicBookingWriteError) {
      return NextResponse.json(
        { userMessage: error.userMessage },
        { status: error.status },
      );
    }

    console.error("public_manage_booking_lookup_failed", {
      slug: routeParams.providerSlug,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { userMessage: "Could not load that booking." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ verticalSegment: string; providerSlug: string; token: string }>;
  },
) {
  const routeParams = readRouteParams(await context.params);

  if (!routeParams) {
    return NextResponse.json(
      { userMessage: "This booking link is invalid." },
      { status: 400 },
    );
  }

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
      const result = await cancelManagedBooking(createAdminClient(), routeParams);
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

      const result = await rescheduleManagedBooking(createAdminClient(), {
        ...routeParams,
        dateKey,
        time: readOptionalString(body.time),
      });

      return NextResponse.json(result);
    }

    if (action === "note") {
      if (typeof body.note !== "string") {
        return NextResponse.json(
          { userMessage: "Write a note before saving." },
          { status: 400 },
        );
      }

      if (body.note.length > MANAGED_CLIENT_NOTE_MAX_LENGTH) {
        return NextResponse.json(
          {
            userMessage: `Keep the note under ${MANAGED_CLIENT_NOTE_MAX_LENGTH} characters.`,
          },
          { status: 400 },
        );
      }

      const result = await updateManagedBookingNote(createAdminClient(), {
        ...routeParams,
        note: body.note,
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

    console.error("public_manage_booking_update_failed", {
      slug: routeParams.providerSlug,
      action,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { userMessage: "Could not update that booking." },
      { status: 500 },
    );
  }
}
