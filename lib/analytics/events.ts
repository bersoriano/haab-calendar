/**
 * The vocabulary of public booking page analytics.
 *
 * Shared by the page that sends events, the route that records them, and the
 * dashboard that reads them back. Free of React, Next and Supabase so all three
 * can import it, and so the parsing that decides what reaches the database is
 * testable on its own.
 */

/** Funnel order matters: the dashboard renders these as successive steps. */
export const PUBLIC_PAGE_EVENTS = [
  "page_view",
  "service_selected",
  "slot_selected",
  "booking_confirmed",
] as const;

export type PublicPageEvent = (typeof PUBLIC_PAGE_EVENTS)[number];

export type CampaignParams = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

/** What a visitor's browser may send. Anything else is dropped. */
export type PublicPageEventPayload = CampaignParams & {
  event: PublicPageEvent;
  serviceId?: string;
  /** The page's `document.referrer`; only its host is ever stored. */
  referrer?: string;
};

const UTM_MAX_LENGTH = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPublicPageEvent(value: unknown): value is PublicPageEvent {
  return (
    typeof value === "string" && (PUBLIC_PAGE_EVENTS as readonly string[]).includes(value)
  );
}

/**
 * Campaign tags are free text typed by the provider into a link, so they are
 * normalised the way people expect a report to group them: "Instagram" and
 * "instagram " are the same source.
 */
export function normalizeCampaignValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase().slice(0, UTM_MAX_LENGTH);
  return normalized || undefined;
}

export function readCampaignParams(search: URLSearchParams): CampaignParams {
  return {
    utmSource: normalizeCampaignValue(search.get("utm_source")),
    utmMedium: normalizeCampaignValue(search.get("utm_medium")),
    utmCampaign: normalizeCampaignValue(search.get("utm_campaign")),
  };
}

/** Only the host: a referrer's path and query can carry someone else's data. */
export function readReferrerHost(referrer: unknown, ownHost?: string): string | undefined {
  if (typeof referrer !== "string" || !referrer) {
    return undefined;
  }

  try {
    const url = new URL(referrer);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }

    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    // Moving around the site itself is not a source of traffic.
    if (!host || (ownHost && host === ownHost.toLowerCase().replace(/^www\./, ""))) {
      return undefined;
    }

    return host.slice(0, 255);
  } catch {
    return undefined;
  }
}

/**
 * Turns an untrusted request body into a payload, or null when the body is not
 * one. Unknown keys are ignored rather than rejected, so an older page and a
 * newer route can disagree about optional fields without losing the event.
 */
export function parsePublicPageEventPayload(body: unknown): PublicPageEventPayload | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }

  const record = body as Record<string, unknown>;
  if (!isPublicPageEvent(record.event)) {
    return null;
  }

  const serviceId =
    typeof record.serviceId === "string" && UUID_PATTERN.test(record.serviceId)
      ? record.serviceId.toLowerCase()
      : undefined;

  return {
    event: record.event,
    serviceId,
    referrer: typeof record.referrer === "string" ? record.referrer.slice(0, 2048) : undefined,
    utmSource: normalizeCampaignValue(record.utmSource),
    utmMedium: normalizeCampaignValue(record.utmMedium),
    utmCampaign: normalizeCampaignValue(record.utmCampaign),
  };
}
