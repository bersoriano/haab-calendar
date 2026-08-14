import { NextResponse, type NextRequest } from "next/server";

import {
  confirmPublicBooking,
  PublicBookingWriteError,
} from "@/lib/supabase/bookings";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeUrlSlugSegment,
  parsePublicVerticalSegment,
  validateProviderSlug,
} from "@/lib/public-url";
import type { LocationKey } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PublicBookingBody = {
  serviceId?: unknown;
  dateKey?: unknown;
  time?: unknown;
  clientName?: unknown;
  clientEmail?: unknown;
  clientPhone?: unknown;
  partySize?: unknown;
  notes?: unknown;
  location?: unknown;
  locationKey?: unknown;
  details?: unknown;
  detailsSchemaKey?: unknown;
  detailsSchemaVersion?: unknown;
  idempotencyKey?: unknown;
  holdId?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown) {
  const text = readString(value);
  return text || undefined;
}

function readLocationKey(value: unknown): LocationKey | undefined {
  if (value === "address1" || value === "address2" || value === "custom") {
    return value;
  }
  return undefined;
}

function readDetails(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function readPositiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return undefined;
  }
  return value;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ verticalSegment: string; providerSlug: string }> },
) {
  const { verticalSegment, providerSlug } = await context.params;
  const vertical = parsePublicVerticalSegment(verticalSegment);
  const normalizedProviderSlug = normalizeUrlSlugSegment(providerSlug);

  if (!vertical || !validateProviderSlug(normalizedProviderSlug).ok) {
    return NextResponse.json(
      { userMessage: "This booking link is invalid." },
      { status: 400 },
    );
  }

  let body: PublicBookingBody;
  try {
    body = (await request.json()) as PublicBookingBody;
  } catch {
    return NextResponse.json(
      { userMessage: "Invalid booking request." },
      { status: 400 },
    );
  }

  const serviceId = readString(body.serviceId);
  const dateKey = readString(body.dateKey);
  const clientName = readString(body.clientName);
  const clientEmail = readString(body.clientEmail);
  const clientPhone = readString(body.clientPhone);

  if (!serviceId || !dateKey || !clientName || !clientEmail || !clientPhone) {
    return NextResponse.json(
      { userMessage: "Name, email, phone, service, and date are required." },
      { status: 400 },
    );
  }

  try {
    const result = await confirmPublicBooking(createAdminClient(), {
      vertical,
      providerSlug: normalizedProviderSlug,
      serviceId,
      dateKey,
      time: readOptionalString(body.time),
      clientName,
      clientEmail,
      clientPhone,
      partySize: readPositiveInteger(body.partySize),
      notes: readOptionalString(body.notes),
      location: readOptionalString(body.location),
      locationKey: readLocationKey(body.locationKey),
      details: readDetails(body.details),
      detailsSchemaKey: readOptionalString(body.detailsSchemaKey),
      detailsSchemaVersion: readPositiveInteger(body.detailsSchemaVersion),
      idempotencyKey: readOptionalString(body.idempotencyKey),
      holdId: readOptionalString(body.holdId),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Missing SUPABASE_SERVICE_ROLE_KEY")
    ) {
      return NextResponse.json(
        { userMessage: "Booking persistence is not configured." },
        { status: 503 },
      );
    }

    if (error instanceof PublicBookingWriteError) {
      if (error.status >= 500) {
        console.error("public_booking_confirm_failed", {
          slug: normalizedProviderSlug,
          error: error.cause instanceof Error ? error.cause.message : error.message,
        });
      }

      return NextResponse.json(
        { userMessage: error.userMessage },
        { status: error.status },
      );
    }

    console.error("public_booking_confirm_failed", {
      slug: normalizedProviderSlug,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { userMessage: "Could not confirm this booking." },
      { status: 500 },
    );
  }
}
