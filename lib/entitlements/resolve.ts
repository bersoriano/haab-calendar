import {
  DEFAULT_PLAN_TIER,
  FEATURE_KEYS,
  getFeaturePrerequisites,
  getPlanFeatures,
  isFeatureKey,
  isProviderPlanTier,
  type FeatureKey,
  type ProviderPlanTier,
} from "@/lib/entitlements/catalog";

export type EntitlementSource = "plan" | "override";

export type FeatureEntitlement = {
  enabled: boolean;
  source: EntitlementSource;
  /** Only present while a temporary override is deciding the answer. */
  overrideExpiresAt?: string;
  /**
   * Set when something granted this feature but a capability it depends on is
   * off, so the answer is no despite the grant.
   */
  unmetPrerequisites?: readonly FeatureKey[];
};

export type ProviderEntitlements = {
  providerId: string;
  planTier: ProviderPlanTier;
  features: Record<FeatureKey, FeatureEntitlement>;
};

/** One persisted override row, already stripped of storage concerns. */
export type FeatureOverrideInput = {
  featureKey: string;
  enabled: boolean;
  /** ISO-8601, or null for a permanent override. */
  expiresAt: string | null;
};

export class UnknownFeatureKeyError extends Error {
  constructor(readonly featureKey: string) {
    super(`Unknown feature key: ${featureKey}`);
    this.name = "UnknownFeatureKeyError";
  }
}

function isOverrideActive(expiresAt: string | null, now: Date): boolean {
  if (expiresAt === null) {
    return true;
  }

  const expiry = Date.parse(expiresAt);

  // An unparseable expiry is not a licence to keep granting: fail closed.
  if (Number.isNaN(expiry)) {
    return false;
  }

  // Strictly greater: at the exact instant it expires, it has expired.
  return expiry > now.getTime();
}

/**
 * Which features a provider has, and why.
 *
 * An active override beats the plan in both directions — it can grant what the
 * plan omits and withhold what the plan includes. An expired override is not a
 * decision, so the plan answers again. Anything unrecognised, in either the
 * plan or a persisted key, resolves to no access rather than to a guess.
 *
 * Pure, with the clock injected, so the expiry boundary is testable rather than
 * a matter of when the suite happens to run.
 */
export function resolveEntitlements(input: {
  providerId: string;
  planTier: string | null | undefined;
  overrides: readonly FeatureOverrideInput[];
  now?: Date;
}): ProviderEntitlements {
  const now = input.now ?? new Date();
  const planTier: ProviderPlanTier = isProviderPlanTier(input.planTier)
    ? input.planTier
    : DEFAULT_PLAN_TIER;
  const planFeatures = new Set(getPlanFeatures(planTier));

  const activeOverrides = new Map<FeatureKey, FeatureOverrideInput>();
  for (const override of input.overrides) {
    // A key retired from the catalog but still on the row means nothing here.
    if (!isFeatureKey(override.featureKey)) {
      continue;
    }

    if (isOverrideActive(override.expiresAt, now)) {
      activeOverrides.set(override.featureKey, override);
    }
  }

  const features = {} as Record<FeatureKey, FeatureEntitlement>;
  for (const featureKey of FEATURE_KEYS) {
    const override = activeOverrides.get(featureKey);

    if (override) {
      features[featureKey] = {
        enabled: override.enabled,
        source: "override",
        ...(override.expiresAt ? { overrideExpiresAt: override.expiresAt } : {}),
      };
      continue;
    }

    features[featureKey] = { enabled: planFeatures.has(featureKey), source: "plan" };
  }

  // A capability whose prerequisite is off is off, whatever granted it. Two-way
  // sync without the base connection has nothing to sync; busy blocking without
  // it has nothing to read. Enabling either on its own would be a
  // misconfiguration resolved in the provider's favour, which is the one
  // direction this resolver never takes.
  //
  // Applied after the first pass and in catalog order, so a chain resolves in
  // one sweep: sync off disables busy blocking, which disables two-way.
  for (const featureKey of FEATURE_KEYS) {
    if (!features[featureKey].enabled) {
      continue;
    }

    const unmet = getFeaturePrerequisites(featureKey).filter(
      (prerequisite) => !features[prerequisite].enabled,
    );

    if (unmet.length > 0) {
      features[featureKey] = {
        ...features[featureKey],
        enabled: false,
        // The source still names where the *grant* came from, so an operator
        // reading this can see an override was present and overruled.
        unmetPrerequisites: unmet,
      };
    }
  }

  return { providerId: input.providerId, planTier, features };
}

export function hasResolvedEntitlement(
  snapshot: ProviderEntitlements,
  featureKey: FeatureKey,
): boolean {
  if (!isFeatureKey(featureKey)) {
    throw new UnknownFeatureKeyError(String(featureKey));
  }

  return snapshot.features[featureKey]?.enabled ?? false;
}
