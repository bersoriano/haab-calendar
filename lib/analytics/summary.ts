/**
 * The shape of the analytics dashboard's data, as returned by
 * `public.provider_analytics_summary` and passed through the provider route.
 */

export const ANALYTICS_RANGES = [7, 30, 90] as const;

export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export const DEFAULT_ANALYTICS_RANGE: AnalyticsRange = 30;

export type AnalyticsTotals = {
  views: number;
  /** Distinct visitors per day, summed: the hash rotates daily by design. */
  visitors: number;
  serviceSelected: number;
  slotSelected: number;
  bookings: number;
  bookingVisitors: number;
};

export type AnalyticsDay = { day: string; views: number; visitors: number; bookings: number };

export type AnalyticsCampaign = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  views: number;
  visitors: number;
  bookings: number;
};

export type AnalyticsReferrer = { host: string; views: number; bookings: number };

export type AnalyticsService = {
  serviceId: string;
  name: string;
  selections: number;
  bookings: number;
};

export type AnalyticsDevice = { device: "mobile" | "tablet" | "desktop"; views: number };

export type AnalyticsSummary = {
  range: AnalyticsRange;
  timeZone: string;
  totals: AnalyticsTotals;
  daily: AnalyticsDay[];
  campaigns: AnalyticsCampaign[];
  referrers: AnalyticsReferrer[];
  services: AnalyticsService[];
  devices: AnalyticsDevice[];
};

export function parseAnalyticsRange(value: string | null): AnalyticsRange {
  const days = Number(value);
  return (ANALYTICS_RANGES as readonly number[]).includes(days)
    ? (days as AnalyticsRange)
    : DEFAULT_ANALYTICS_RANGE;
}

/** Share of `part` in `whole` as a whole percentage, or null when undefined. */
export function conversionRate(part: number, whole: number): number | null {
  if (!whole) {
    return null;
  }
  return Math.round((part / whole) * 1000) / 10;
}

/**
 * Builds a campaign link the provider can paste into a post or an ad.
 * Empty fields are left out rather than sent as blank tags.
 */
export function buildCampaignUrl(
  publicUrl: string,
  tags: { source: string; medium: string; campaign: string },
): string {
  const url = new URL(publicUrl);
  const entries: Array<[string, string]> = [
    ["utm_source", tags.source],
    ["utm_medium", tags.medium],
    ["utm_campaign", tags.campaign],
  ];

  for (const [key, value] of entries) {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, "-");
    if (normalized) {
      url.searchParams.set(key, normalized);
    } else {
      url.searchParams.delete(key);
    }
  }

  return url.toString();
}
