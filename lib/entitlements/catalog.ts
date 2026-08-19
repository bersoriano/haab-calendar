/**
 * What a provider is allowed to use, and where that permission comes from.
 *
 * Deliberately free of React, Next and Supabase: this is the vocabulary the
 * rest of the system agrees on, so it can be read by a pure resolver, a server
 * module, a route handler and a test without any of them importing each other.
 */

export const FEATURE_KEYS = [
  "custom_slug",
  "google_calendar_sync",
  "google_calendar_busy_blocking",
  "google_calendar_two_way_sync",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

/**
 * The plan a provider is on. Server-controlled: `plan_tier` carries no grant to
 * the authenticated role, so a provider cannot promote itself by writing its
 * own row. Transitional — it stands in until billing projects a real
 * subscription onto a provider.
 */
export const PROVIDER_PLAN_TIERS = ["free", "premium"] as const;

export type ProviderPlanTier = (typeof PROVIDER_PLAN_TIERS)[number];

export const DEFAULT_PLAN_TIER: ProviderPlanTier = "free";

/** Persisted feature keys are text; only the catalog decides what is real. */
export function isFeatureKey(value: unknown): value is FeatureKey {
  return typeof value === "string" && (FEATURE_KEYS as readonly string[]).includes(value);
}

export function isProviderPlanTier(value: unknown): value is ProviderPlanTier {
  return (
    typeof value === "string" && (PROVIDER_PLAN_TIERS as readonly string[]).includes(value)
  );
}

/**
 * What each plan includes. One place, so a question about who gets what has a
 * single answer rather than one per call site.
 */
const PLAN_FEATURES: Record<ProviderPlanTier, readonly FeatureKey[]> = {
  free: [],
  // Busy blocking and two-way sync are deliberately absent: they read and act
  // on a provider's wider calendar, and until pricing intent is settled they
  // are reachable only through a manual override. Adding a key here is the one
  // change that turns them on for every premium provider at once.
  premium: ["custom_slug", "google_calendar_sync"],
};

/**
 * Capabilities that are meaningless without another one.
 *
 * Busy blocking needs the base connection to exist at all; two-way sync needs
 * both, because inbound changes are only recognised on events the one-way
 * projection created and the busy data is what validates a proposed move. A
 * grant on the dependent key alone is not an answer — it is a misconfiguration,
 * and resolving it to "yes" would enable a feature with nothing underneath it.
 */
const FEATURE_PREREQUISITES: Partial<Record<FeatureKey, readonly FeatureKey[]>> = {
  google_calendar_busy_blocking: ["google_calendar_sync"],
  google_calendar_two_way_sync: [
    "google_calendar_sync",
    "google_calendar_busy_blocking",
  ],
};

export function getFeaturePrerequisites(featureKey: FeatureKey): readonly FeatureKey[] {
  return FEATURE_PREREQUISITES[featureKey] ?? [];
}

export function getPlanFeatures(planTier: ProviderPlanTier): readonly FeatureKey[] {
  return PLAN_FEATURES[planTier] ?? PLAN_FEATURES.free;
}

/** Labels for the super-admin surface. Not customer-facing copy. */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  custom_slug: "Custom URL slug",
  google_calendar_sync: "Google Calendar sync",
  google_calendar_busy_blocking: "Google Calendar busy blocking",
  google_calendar_two_way_sync: "Google Calendar two-way sync",
};
