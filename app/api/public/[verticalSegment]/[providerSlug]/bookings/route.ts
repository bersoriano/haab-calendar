import { NextResponse, type NextRequest } from "next/server";

import {
  confirmPublicBooking,
  PublicBookingWriteError,
} from "@/lib/supabase/bookings";
import { parsePublicPageAttribution } from "@/lib/analytics/events";
import { recordPublicPageEvent } from "@/lib/analytics/record";
import { collectsDateOfBirth, parseDateOfBirth } from "@/lib/date-of-birth";
import { sendBookingEmailImmediately } from "@/lib/email/booking-created";
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
  dateOfBirth?: unknown;
  notes?: unknown;
  location?: unknown;
  locationKey?: unknown;
  details?: unknown;
  detailsSchemaKey?: unknown;
  detailsSchemaVersion?: unknown;
  idempotencyKey?: unknown;
  holdId?: unknown;
  /** Campaign tags and referrer the page was opened with, for analytics. */
  attribution?: unknown;
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

  // A day of slack past UTC today: the client's "today" may already be tomorrow.
  const latestDateOfBirth = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  // Outside healthcare the field is never asked, so whatever arrives is dropped.
  const dateOfBirth = collectsDateOfBirth(vertical)
    ? parseDateOfBirth(body.dateOfBirth, latestDateOfBirth)
    : ({ ok: true, value: undefined } as const);

  if (!dateOfBirth.ok) {
    return NextResponse.json(
      { userMessage: "Date of birth is not a valid date." },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();
    const result = await confirmPublicBooking(admin, {
      vertical,
      providerSlug: normalizedProviderSlug,
      serviceId,
      dateKey,
      time: readOptionalString(body.time),
      clientName,
      clientEmail,
      clientPhone,
      partySize: readPositiveInteger(body.partySize),
      dateOfBirth: dateOfBirth.value,
      notes: readOptionalString(body.notes),
      location: readOptionalString(body.location),
      locationKey: readLocationKey(body.locationKey),
      details: readDetails(body.details),
      detailsSchemaKey: readOptionalString(body.detailsSchemaKey),
      detailsSchemaVersion: readPositiveInteger(body.detailsSchemaVersion),
      idempotencyKey: readOptionalString(body.idempotencyKey),
      holdId: readOptionalString(body.holdId),
    });

    const { providerId, ...publicResult } = result;

    // Recorded here rather than by the browser so an ad blocker or a closed tab
    // cannot lose the conversion. Analytics never decides whether a booking
    // succeeds: the booking is already committed.
    try {
      await recordPublicPageEvent(admin, {
        providerId,
        event: "booking_confirmed",
        serviceId,
        bookingId: result.booking.id,
        attribution: parsePublicPageAttribution(body.attribution),
        request,
      });
    } catch (error) {
      console.warn("booking_analytics_failed", {
        bookingId: result.booking.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // The database trigger already queued this event. Try email now so a late
    // scheduler cannot delay confirmation; the outbox retries failed attempts.
    try {
      const delivery = await sendBookingEmailImmediately({
        bookingId: result.booking.id,
        providerId,
      });
      if (delivery.outcome !== "succeeded") {
        console.warn("booking_email_deferred", {
          bookingId: result.booking.id,
          errorCode: "errorCode" in delivery ? delivery.errorCode : delivery.reasonCode,
        });
      }
    } catch {
      // Booking is committed. Leave its outbox event available for retry.
      console.warn("booking_email_deferred", {
        bookingId: result.booking.id,
        errorCode: "email_unexpected_failure",
      });
    }

    return NextResponse.json(publicResult, { status: 201 });
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
