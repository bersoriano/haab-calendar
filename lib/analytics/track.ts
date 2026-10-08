import {
  readCampaignParams,
  type CampaignParams,
  type PublicPageEvent,
} from "@/lib/analytics/events";

/**
 * Where a visit came from, read once when the page opens.
 *
 * Kept in memory only — no cookie, no storage. The booking flow never leaves
 * the page, so every later step can carry the same attribution, which is what
 * lets a booking be credited to the campaign link that brought the visitor.
 */
export type VisitAttribution = CampaignParams & { referrer?: string };

export function readVisitAttribution(): VisitAttribution {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    ...readCampaignParams(new URLSearchParams(window.location.search)),
    referrer: document.referrer || undefined,
  };
}

/**
 * Fire-and-forget. A blocked or failed beacon must never touch the booking
 * flow, so every failure is swallowed here.
 */
export function sendPublicPageEvent(
  endpoint: string,
  event: PublicPageEvent,
  attribution: VisitAttribution,
  serviceId?: string,
) {
  if (typeof window === "undefined") {
    return;
  }

  const body = JSON.stringify({ event, serviceId, ...attribution });

  try {
    if (typeof navigator.sendBeacon === "function") {
      const queued = navigator.sendBeacon(
        endpoint,
        new Blob([body], { type: "application/json" }),
      );
      if (queued) {
        return;
      }
    }

    void fetch(endpoint, {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Analytics is never worth an error on a booking page.
  }
}
