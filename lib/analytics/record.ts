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
  computeNetworkHash,
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

/**
 * Funnel events one network (IP) can add to one page per hour, whatever user
 * agent it claims. Far above the visitor cap because a household, an office or
 * a mobile carrier's NAT puts many real people behind one address; low enough
 * that rotating user agents from one machine stops counting quickly.
 */
export const NETWORK_HOURLY_EVENT_CAP = 300;

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
 * visitor or its network is over an hourly cap); throws on a failed query so
 * the caller can decide how loudly to log it.
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
  const ip = readClientIp(input.request.headers);
  const now = new Date();
  const visitorHash = computeVisitorHash({
    secret,
    providerId: input.providerId,
    ip,
    userAgent: userAgent ?? "",
    now,
  });
  const networkHash = computeNetworkHash({ secret, providerId: input.providerId, ip, now });

  if (!input.bookingId) {
    const since = new Date(now.getTime() - 3_600_000).toISOString();
    const countRecent = (column: "visitor_hash" | "network_hash", value: string) =>
      admin
        .from("public_page_events")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", input.providerId)
        .eq(column, value)
        .gte("occurred_at", since);

    const [byVisitor, byNetwork] = await Promise.all([
      countRecent("visitor_hash", visitorHash),
      countRecent("network_hash", networkHash),
    ]);

    if (byVisitor.error) {
      throw byVisitor.error;
    }
    if (byNetwork.error) {
      throw byNetwork.error;
    }
    if (
      (byVisitor.count ?? 0) >= VISITOR_HOURLY_EVENT_CAP ||
      (byNetwork.count ?? 0) >= NETWORK_HOURLY_EVENT_CAP
    ) {
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
    network_hash: networkHash,
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
