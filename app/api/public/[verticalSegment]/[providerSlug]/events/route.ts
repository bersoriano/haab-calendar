import { NextResponse, type NextRequest } from "next/server";

import { parsePublicPageEventPayload, readReferrerHost } from "@/lib/analytics/events";
import {
  classifyDevice,
  computeVisitorHash,
  getAnalyticsSecret,
  isLikelyBot,
  readClientIp,
} from "@/lib/analytics/visitor";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublishedProvider, PublicBookingWriteError } from "@/lib/supabase/bookings";
import {
  normalizeUrlSlugSegment,
  parsePublicVerticalSegment,
  validateProviderSlug,
} from "@/lib/public-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A beacon body is a handful of short fields; anything bigger is not one. */
const MAX_BODY_BYTES = 4096;

function noContent() {
  return new NextResponse(null, { status: 204 });
}

/**
 * Records one funnel step on a published booking page.
 *
 * Sent with `navigator.sendBeacon`, so nobody reads the response: every outcome
 * a visitor could not act on — a bot, a missing secret, a failed insert — is a
 * quiet 204 rather than an error the booking page would have to handle.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ verticalSegment: string; providerSlug: string }> },
) {
  const { verticalSegment, providerSlug } = await context.params;
  const vertical = parsePublicVerticalSegment(verticalSegment);
  const slug = normalizeUrlSlugSegment(providerSlug);

  if (!vertical || !validateProviderSlug(slug).ok) {
    return NextResponse.json({ userMessage: "This booking link is invalid." }, { status: 400 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ userMessage: "Event is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ userMessage: "Invalid event." }, { status: 400 });
  }

  const payload = parsePublicPageEventPayload(body);
  if (!payload) {
    return NextResponse.json({ userMessage: "Invalid event." }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent");
  if (isLikelyBot(userAgent)) {
    return noContent();
  }

  const secret = getAnalyticsSecret();
  if (!secret) {
    return noContent();
  }

  try {
    const admin = createAdminClient();
    const provider = await getPublishedProvider(admin, vertical, slug);
    const { error } = await admin.from("public_page_events").insert({
      provider_id: provider.id,
      event: payload.event,
      service_id: payload.serviceId ?? null,
      visitor_hash: computeVisitorHash({
        secret,
        providerId: provider.id,
        ip: readClientIp(request.headers),
        userAgent: userAgent ?? "",
        now: new Date(),
      }),
      utm_source: payload.utmSource ?? null,
      utm_medium: payload.utmMedium ?? null,
      utm_campaign: payload.utmCampaign ?? null,
      referrer_host: readReferrerHost(payload.referrer, request.nextUrl.hostname) ?? null,
      device_class: classifyDevice(userAgent),
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    if (error instanceof PublicBookingWriteError && error.status === 404) {
      return NextResponse.json({ userMessage: error.userMessage }, { status: 404 });
    }

    console.error("public_page_event_failed", {
      slug,
      event: payload.event,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return noContent();
}
