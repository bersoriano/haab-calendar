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
  /** Bookings that still stand; cancelled ones are counted separately. */
  bookings: number;
  bookingVisitors: number;
  /** Absent from summaries computed before cancellations were tracked. */
  cancelledBookings?: number;
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

export type AnalyticsPreviousTotals = Pick<
  AnalyticsTotals,
  "views" | "visitors" | "bookings" | "bookingVisitors"
>;

/** Bookings made in the window from any channel, and what became of them. */
export type AnalyticsBookingHealth = { created: number; cancelled: number; rescheduled: number };

/** ISO weekday (1 = Monday … 7 = Sunday) and hour of the appointment. */
export type AnalyticsPopularTime = { weekday: number; hour: number; bookings: number };

export type AnalyticsSummary = {
  range: AnalyticsRange;
  timeZone: string;
  totals: AnalyticsTotals;
  daily: AnalyticsDay[];
  campaigns: AnalyticsCampaign[];
  referrers: AnalyticsReferrer[];
  services: AnalyticsService[];
  devices: AnalyticsDevice[];
  /** The equal-length window just before this one. Optional: older servers. */
  previousTotals?: AnalyticsPreviousTotals;
  bookingHealth?: AnalyticsBookingHealth;
  popularTimes?: AnalyticsPopularTime[];
};

/**
 * What a plan without analytics sees: its own visit totals, so the value is
 * real, and nothing about funnel, campaigns or services.
 */
export type AnalyticsTeaser = {
  locked: true;
  range: AnalyticsRange;
  timeZone: string;
  totals: Pick<AnalyticsTotals, "views" | "visitors">;
};

export type AnalyticsResponse = AnalyticsSummary | AnalyticsTeaser;

export function isAnalyticsTeaser(value: AnalyticsResponse): value is AnalyticsTeaser {
  return "locked" in value && value.locked === true;
}

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
 * Whole-percent change from the previous window, or null when there is no
 * baseline to compare with (a new page, or nothing last period).
 */
export function changePercent(current: number, previous: number | undefined): number | null {
  if (!previous) {
    return null;
  }
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * The hours the heatmap shows: the span the bookings actually use, widened to
 * a familiar working day so a quiet week still reads as a calendar.
 */
export function popularTimeHours(times: readonly AnalyticsPopularTime[]): number[] {
  const hours = times.map((time) => time.hour);
  const first = Math.min(9, ...hours);
  const last = Math.max(18, ...hours);
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
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
