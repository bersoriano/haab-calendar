import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isUuid,
  readReferrerHost,
  type CampaignParams,
  type PublicPageEvent,
} from "@/lib/analytics/events";
import {
  classifyDevice,
  computeVisitorHash,
  getAnalyticsSecret,
  readClientIp,
} from "@/lib/analytics/visitor";

/**
 * Funnel events one visitor can add to one page per hour. A person browsing,
 * reloading and changing their mind stays far below it; a script replaying the
 * beacon to inflate a page's numbers stops counting after it. Bookings are
 * exempt: each is a committed row, already limited by availability.
 */
export const VISITOR_HOURLY_EVENT_CAP = 60;

export type RecordPublicPageEventInput = {
  providerId: string;
  event: PublicPageEvent;
  serviceId?: string;
  bookingId?: string;
  attribution: CampaignParams & { referrer?: string };
  request: Request;
};

/**
 * Writes one analytics row for the visitor making `request`.
 *
 * Shared by the beacon route and the booking route so both derive the same
 * visitor hash from the same request, which is what lets a server-recorded
 * booking line up with the page view the browser reported earlier.
 *
 * Returns false when nothing was written (no secret to hash with, or the
 * visitor is over the hourly cap); throws on a failed query so the caller can
 * decide how loudly to log it.
 */
export async function recordPublicPageEvent(
  admin: SupabaseClient,
  input: RecordPublicPageEventInput,
): Promise<boolean> {
  const secret = getAnalyticsSecret();
  if (!secret) {
    return false;
  }

  const userAgent = input.request.headers.get("user-agent");
  const visitorHash = computeVisitorHash({
    secret,
    providerId: input.providerId,
    ip: readClientIp(input.request.headers),
    userAgent: userAgent ?? "",
    now: new Date(),
  });

  if (!input.bookingId) {
    const { count, error } = await admin
      .from("public_page_events")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", input.providerId)
      .eq("visitor_hash", visitorHash)
      .gte("occurred_at", new Date(Date.now() - 3_600_000).toISOString());

    if (error) {
      throw error;
    }
    if ((count ?? 0) >= VISITOR_HOURLY_EVENT_CAP) {
      return false;
    }
  }

  const row = {
    provider_id: input.providerId,
    event: input.event,
    // The column is a uuid; a local or legacy id would fail the whole insert.
    service_id: isUuid(input.serviceId) ? input.serviceId.toLowerCase() : null,
    booking_id: input.bookingId ?? null,
    visitor_hash: visitorHash,
    utm_source: input.attribution.utmSource ?? null,
    utm_medium: input.attribution.utmMedium ?? null,
    utm_campaign: input.attribution.utmCampaign ?? null,
    referrer_host:
      readReferrerHost(input.attribution.referrer, new URL(input.request.url).hostname) ?? null,
    device_class: classifyDevice(userAgent),
  };

  const { error } = await admin.from("public_page_events").insert(row);

  // A retried booking request finds its event already written; that is the
  // point of the unique booking index, not a failure.
  if (error && !(input.bookingId && error.code === "23505")) {
    throw error;
  }

  return true;
}
