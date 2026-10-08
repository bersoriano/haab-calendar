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
 * Returns false when there is no secret to hash with; throws on a failed
 * insert so the caller can decide how loudly to log it.
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
  const row = {
    provider_id: input.providerId,
    event: input.event,
    // The column is a uuid; a local or legacy id would fail the whole insert.
    service_id: isUuid(input.serviceId) ? input.serviceId.toLowerCase() : null,
    booking_id: input.bookingId ?? null,
    visitor_hash: computeVisitorHash({
      secret,
      providerId: input.providerId,
      ip: readClientIp(input.request.headers),
      userAgent: userAgent ?? "",
      now: new Date(),
    }),
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
