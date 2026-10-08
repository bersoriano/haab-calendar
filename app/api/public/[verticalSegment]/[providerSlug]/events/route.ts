import { NextResponse, type NextRequest } from "next/server";

import { parsePublicPageEventPayload } from "@/lib/analytics/events";
import { recordPublicPageEvent } from "@/lib/analytics/record";
import { isLikelyBot } from "@/lib/analytics/visitor";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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

/**
 * Supabase keeps the session in `sb-<ref>-auth-token` cookies (chunked as
 * `.0`, `.1` …). Checking for one first means an anonymous visitor — nearly
 * every request — costs no call to the auth server.
 */
function hasSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
}

/** The owner checking their own page is not a visitor. */
async function isProviderOwner(request: NextRequest, ownerUserId: string) {
  if (!hasSessionCookie(request)) {
    return false;
  }
  try {
    const { data } = await (await createClient()).auth.getUser();
    return data.user?.id === ownerUserId;
  } catch {
    return false;
  }
}

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

  // Bookings are recorded by the booking route itself. A beacon claiming one
  // (from a page loaded before that change) would count it twice.
  if (payload.event === "booking_confirmed" || isLikelyBot(request.headers.get("user-agent"))) {
    return noContent();
  }

  try {
    const admin = createAdminClient();
    const provider = await getPublishedProvider(admin, vertical, slug);
    if (await isProviderOwner(request, provider.owner_user_id)) {
      return noContent();
    }
    await recordPublicPageEvent(admin, {
      providerId: provider.id,
      event: payload.event,
      serviceId: payload.serviceId,
      attribution: payload,
      request,
    });
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
