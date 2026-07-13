import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  createPublicBookingHold,
  PublicBookingWriteError,
  releasePublicBookingHold,
} from "@/lib/supabase/bookings";
import {
  normalizeUrlSlugSegment,
  parsePublicVerticalSegment,
  validateProviderSlug,
} from "@/lib/public-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HoldBody = {
  serviceId?: unknown;
  dateKey?: unknown;
  time?: unknown;
  holdId?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown) {
  const text = readString(value);
  return text || undefined;
}

function readRouteParams(verticalSegment: string, providerSlug: string) {
  const vertical = parsePublicVerticalSegment(verticalSegment);
  const normalizedProviderSlug = normalizeUrlSlugSegment(providerSlug);

  if (!vertical || !validateProviderSlug(normalizedProviderSlug).ok) {
    return null;
  }

  return { vertical, providerSlug: normalizedProviderSlug };
}

async function readBody(request: NextRequest) {
  try {
    return (await request.json()) as HoldBody;
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ verticalSegment: string; providerSlug: string }> },
) {
  const { verticalSegment, providerSlug } = await context.params;
  const routeParams = readRouteParams(verticalSegment, providerSlug);

  if (!routeParams) {
    return NextResponse.json(
      { userMessage: "This booking link is invalid." },
      { status: 400 },
    );
  }

  const body = await readBody(request);
  const serviceId = readString(body?.serviceId);
  const dateKey = readString(body?.dateKey);

  if (!body || !serviceId || !dateKey) {
    return NextResponse.json(
      { userMessage: "Service and date are required." },
      { status: 400 },
    );
  }

  try {
    const result = await createPublicBookingHold(createAdminClient(), {
      ...routeParams,
      serviceId,
      dateKey,
      time: readOptionalString(body.time),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof PublicBookingWriteError) {
      return NextResponse.json(
        { userMessage: error.userMessage },
        { status: error.status },
      );
    }

    console.error("public_booking_hold_failed", {
      slug: routeParams.providerSlug,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { userMessage: "Could not hold that slot." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ verticalSegment: string; providerSlug: string }> },
) {
  const { verticalSegment, providerSlug } = await context.params;
  const routeParams = readRouteParams(verticalSegment, providerSlug);

  if (!routeParams) {
    return NextResponse.json(
      { userMessage: "This booking link is invalid." },
      { status: 400 },
    );
  }

  const body = await readBody(request);
  const holdId = readString(body?.holdId);

  if (!body || !holdId) {
    return NextResponse.json(
      { userMessage: "Hold id is required." },
      { status: 400 },
    );
  }

  try {
    const result = await releasePublicBookingHold(createAdminClient(), {
      ...routeParams,
      holdId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PublicBookingWriteError) {
      return NextResponse.json(
        { userMessage: error.userMessage },
        { status: error.status },
      );
    }

    console.error("public_booking_hold_release_failed", {
      slug: routeParams.providerSlug,
      holdId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { userMessage: "Could not release that hold." },
      { status: 500 },
    );
  }
}
