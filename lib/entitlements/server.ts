import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isFeatureKey, type FeatureKey } from "@/lib/entitlements/catalog";
import {
  hasResolvedEntitlement,
  resolveEntitlements,
  type FeatureOverrideInput,
  type ProviderEntitlements,
} from "@/lib/entitlements/resolve";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/supabase/publication";

const OVERRIDE_SELECT = "feature_key, enabled, expires_at";
const BILLING_SELECT = "plan_tier, status";
const MAX_REASON_LENGTH = 500;

/** Thrown when a caller lacks a feature. Maps to HTTP 403. */
export class EntitlementRequiredError extends Error {
  readonly status = 403;

  constructor(
    readonly providerId: string,
    readonly featureKey: FeatureKey,
  ) {
    super(`Provider ${providerId} is not entitled to ${featureKey}.`);
    this.name = "EntitlementRequiredError";
  }
}

/** Thrown when an override mutation is rejected before it reaches the database. */
export class FeatureOverrideInputError extends Error {
  readonly status: number;

  constructor(readonly userMessage: string, status = 400) {
    super(userMessage);
    this.name = "FeatureOverrideInputError";
    this.status = status;
  }
}

type BillingRow = {
  plan_tier: string | null;
  status: string | null;
};

type OverrideRow = {
  feature_key: string;
  enabled: boolean;
  expires_at: string | null;
};

function toOverrideInput(row: OverrideRow): FeatureOverrideInput {
  return {
    featureKey: row.feature_key,
    enabled: row.enabled,
    expiresAt: row.expires_at,
  };
}

/**
 * Everything one provider is entitled to.
 *
 * Reads through the service role because the override tables carry no grant to
 * anon or authenticated — they are support state, not provider state. Never
 * cached: overrides change out of band, and a stale grant is a wrong answer
 * about paid access. That is also why none of this belongs in a JWT.
 */
export async function getProviderEntitlements(
  providerId: string,
  client?: SupabaseClient,
): Promise<ProviderEntitlements> {
  const admin = client ?? createAdminClient();

  const { data: provider, error: providerError } = await admin
    .from("providers")
    .select("id, plan_tier")
    .eq("id", providerId)
    .maybeSingle<{ id: string; plan_tier: string | null }>();

  if (providerError) {
    throw new FeatureOverrideInputError("Could not load provider entitlements.", 500);
  }

  if (!provider) {
    throw new FeatureOverrideInputError("Provider not found.", 404);
  }

  const [
    { data: overrides, error: overridesError },
    { data: billing, error: billingError },
  ] = await Promise.all([
    admin
      .from("provider_feature_overrides")
      .select(OVERRIDE_SELECT)
      .eq("provider_id", providerId)
      .returns<OverrideRow[]>(),
    admin
      .from("provider_billing_subscriptions")
      .select(BILLING_SELECT)
      .eq("provider_id", providerId)
      .maybeSingle<BillingRow>(),
  ]);

  if (overridesError) {
    throw new FeatureOverrideInputError("Could not load provider entitlements.", 500);
  }

  if (billingError) {
    // Fail closed. An unreadable billing row is an unknown answer about paid
    // access, and falling back to the legacy column here would hand premium to
    // anyone whose stale plan_tier still says so.
    throw new FeatureOverrideInputError("Could not load provider entitlements.", 500);
  }

  return resolveEntitlements({
    providerId,
    // Billing decides the baseline when a subscription exists; providers.plan_tier
    // is the legacy fallback for accounts that predate billing. Overrides still
    // beat both — that is the resolver's job, not this one's.
    planTier: billing ? billing.plan_tier : provider.plan_tier,
    overrides: (overrides ?? []).map(toOverrideInput),
  });
}

export async function hasEntitlement(
  providerId: string,
  featureKey: FeatureKey,
  client?: SupabaseClient,
): Promise<boolean> {
  const snapshot = await getProviderEntitlements(providerId, client);
  return hasResolvedEntitlement(snapshot, featureKey);
}

export async function requireEntitlement(
  providerId: string,
  featureKey: FeatureKey,
  client?: SupabaseClient,
): Promise<ProviderEntitlements> {
  const snapshot = await getProviderEntitlements(providerId, client);

  if (!hasResolvedEntitlement(snapshot, featureKey)) {
    throw new EntitlementRequiredError(providerId, featureKey);
  }

  return snapshot;
}

function assertFeatureKey(featureKey: string): asserts featureKey is FeatureKey {
  if (!isFeatureKey(featureKey)) {
    throw new FeatureOverrideInputError("Unknown feature.");
  }
}

function assertReason(reason: unknown): string {
  const trimmed = typeof reason === "string" ? reason.trim() : "";

  if (!trimmed) {
    throw new FeatureOverrideInputError("A reason is required.");
  }

  if (trimmed.length > MAX_REASON_LENGTH) {
    throw new FeatureOverrideInputError(
      `A reason must be ${MAX_REASON_LENGTH} characters or fewer.`,
    );
  }

  return trimmed;
}

/** Null means permanent. Anything else must parse and must still be ahead of us. */
function assertExpiresAt(expiresAt: unknown, now: Date): string | null {
  if (expiresAt === null || expiresAt === undefined) {
    return null;
  }

  if (typeof expiresAt !== "string") {
    throw new FeatureOverrideInputError("Expiry must be a timestamp or null.");
  }

  const parsed = Date.parse(expiresAt);

  if (Number.isNaN(parsed)) {
    throw new FeatureOverrideInputError("Expiry must be a valid timestamp.");
  }

  if (parsed <= now.getTime()) {
    throw new FeatureOverrideInputError("Expiry must be in the future.");
  }

  return new Date(parsed).toISOString();
}

async function assertProviderExists(admin: SupabaseClient, providerId: string) {
  const { data, error } = await admin
    .from("providers")
    .select("id")
    .eq("id", providerId)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new FeatureOverrideInputError("Could not load provider entitlements.", 500);
  }

  if (!data) {
    throw new FeatureOverrideInputError("Provider not found.", 404);
  }
}

/**
 * Grant or withhold one feature for one provider.
 *
 * The actor is whoever `requireSuperAdmin()` verified — never a value from the
 * request body, which would let the caller sign someone else's name to the
 * audit trail.
 */
export async function setProviderFeatureOverride(input: {
  providerId: string;
  featureKey: string;
  enabled: boolean;
  expiresAt?: string | null;
  reason: string;
  now?: Date;
  client?: SupabaseClient;
}): Promise<ProviderEntitlements> {
  const actor = await requireSuperAdmin();
  const admin = input.client ?? createAdminClient();

  assertFeatureKey(input.featureKey);
  const reason = assertReason(input.reason);
  const expiresAt = assertExpiresAt(input.expiresAt, input.now ?? new Date());

  if (typeof input.enabled !== "boolean") {
    throw new FeatureOverrideInputError("An override must be a grant or a revoke.");
  }

  await assertProviderExists(admin, input.providerId);

  const { error } = await admin.rpc("set_provider_feature_override", {
    p_provider_id: input.providerId,
    p_feature_key: input.featureKey,
    p_enabled: input.enabled,
    p_expires_at: expiresAt,
    p_reason: reason,
    p_actor_user_id: actor.id,
  });

  if (error) {
    throw new FeatureOverrideInputError("Could not save the feature override.", 500);
  }

  return getProviderEntitlements(input.providerId, admin);
}

/** Remove an override so the provider's plan decides again. */
export async function clearProviderFeatureOverride(input: {
  providerId: string;
  featureKey: string;
  reason: string;
  client?: SupabaseClient;
}): Promise<ProviderEntitlements> {
  const actor = await requireSuperAdmin();
  const admin = input.client ?? createAdminClient();

  assertFeatureKey(input.featureKey);
  const reason = assertReason(input.reason);

  await assertProviderExists(admin, input.providerId);

  const { error } = await admin.rpc("clear_provider_feature_override", {
    p_provider_id: input.providerId,
    p_feature_key: input.featureKey,
    p_reason: reason,
    p_actor_user_id: actor.id,
  });

  if (error) {
    throw new FeatureOverrideInputError("Could not clear the feature override.", 500);
  }

  return getProviderEntitlements(input.providerId, admin);
}
