import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { isDemoOwnerEmail } from "@/lib/demo-pages";
import { resolveEntitlements, type ProviderEntitlements } from "@/lib/entitlements/resolve";
import { buildProviderPath } from "@/lib/public-url";
import { isSuperAdminEmail } from "@/lib/super-admin-policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { VerticalId } from "@/lib/types";

const DISABLED_MESSAGE =
  "Your public booking page has been disabled by Haab Calendar administration. You can keep editing your workflow, but public URLs and public booking actions are unavailable.";
const ENABLED_MESSAGE =
  "Your public booking page has been enabled by Haab Calendar administration.";

type PublicationSettingRow = {
  user_id: string;
  publishing_enabled: boolean;
  dashboard_message: string | null;
  updated_at: string;
};

type ProviderSummaryRow = {
  id: string;
  owner_user_id: string;
  business_name: string;
  slug: string;
  vertical: VerticalId;
  setup_complete: boolean;
  plan_tier: string | null;
};

type BillingRow = {
  provider_id: string;
  plan_tier: string | null;
  status: string | null;
};

type OverrideRow = {
  provider_id: string;
  feature_key: string;
  enabled: boolean;
  expires_at: string | null;
};

export type PublicationStatus = {
  publishingEnabled: boolean;
  dashboardMessage?: string;
  updatedAt?: string;
};

export type ManagedUserSummary = {
  id: string;
  email: string;
  createdAt: string;
  emailConfirmedAt?: string;
  lastSignInAt?: string;
  publishingEnabled: boolean;
  publicationUpdatedAt?: string;
  workflow?: {
    businessName: string;
    setupComplete: boolean;
    publicPath: string;
  };
  /**
   * Absent when the owner has not created a provider yet — there is nothing to
   * hold entitlements against until they do.
   */
  provider?: {
    id: string;
    planTier: string | null;
    /** Absent when the override read failed; the panel then says so. */
    entitlements?: ProviderEntitlements;
  };
  superAdmin: boolean;
  demoOwner: boolean;
};

export class SuperAdminAccessError extends Error {
  constructor() {
    super("Not found.");
    this.name = "SuperAdminAccessError";
  }
}

export async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !isSuperAdminEmail(user.email)) {
    throw new SuperAdminAccessError();
  }

  return user;
}

export async function getPublicationStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<PublicationStatus> {
  const { data, error } = await supabase
    .from("user_publication_settings")
    .select("publishing_enabled, dashboard_message, updated_at")
    .eq("user_id", userId)
    .maybeSingle<
      Pick<
        PublicationSettingRow,
        "publishing_enabled" | "dashboard_message" | "updated_at"
      >
    >();

  if (error) {
    throw error;
  }

  return {
    publishingEnabled: data?.publishing_enabled ?? true,
    dashboardMessage: data?.dashboard_message || undefined,
    updatedAt: data?.updated_at,
  };
}

async function listAllAuthUsers() {
  const admin = createAdminClient();
  const users: User[] = [];
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    users.push(...data.users);

    if (data.users.length < perPage) {
      return { admin, users };
    }
  }
}

export async function listManagedUsers(): Promise<ManagedUserSummary[]> {
  await requireSuperAdmin();
  const { admin, users } = await listAllAuthUsers();

  const [
    { data: settings, error: settingsError },
    { data: providers, error: providersError },
    { data: overrides, error: overridesError },
    { data: billing, error: billingError },
  ] = await Promise.all([
      admin
        .from("user_publication_settings")
        .select("user_id, publishing_enabled, dashboard_message, updated_at")
        .returns<PublicationSettingRow[]>(),
      admin
        .from("providers")
        .select("id, owner_user_id, business_name, slug, vertical, setup_complete, plan_tier")
        .returns<ProviderSummaryRow[]>(),
      // Every override in one read rather than one read per provider: the list
      // resolves entitlements in memory from these three result sets.
      admin
        .from("provider_feature_overrides")
        .select("provider_id, feature_key, enabled, expires_at")
        .returns<OverrideRow[]>(),
      // Same bulk-read reasoning: one query for every provider's billing tier
      // rather than one per row.
      admin
        .from("provider_billing_subscriptions")
        .select("provider_id, plan_tier, status")
        .returns<BillingRow[]>(),
    ]);

  if (settingsError) throw settingsError;
  if (providersError) throw providersError;

  // Entitlements are an addition to this page, not its purpose. When the
  // override read fails — the table is absent on this database, a grant is
  // wrong — the moderation tools stay usable and the feature panel reports
  // itself unavailable. It must never fall back to "no overrides": that would
  // report a granted provider as ungranted, a wrong answer about paid access
  // rather than a missing one.
  if (overridesError) {
    console.error("provider_feature_overrides_read_failed", {
      error: overridesError.message,
    });
  }

  if (billingError) {
    console.error("provider_billing_read_failed", { error: billingError.message });
  }

  // Either read failing makes the answer unknown, and an unknown answer about
  // paid access is reported as unavailable rather than guessed.
  const entitlementsAvailable = !overridesError && !billingError;

  const billingByProviderId = new Map(
    (billing ?? []).map((row) => [row.provider_id, row]),
  );

  const settingsByUserId = new Map(
    (settings ?? []).map((setting) => [setting.user_id, setting]),
  );
  // One provider per owner is a database invariant, so this mapping cannot
  // silently drop a row (see providers_owner_user_id_unique).
  const providerByUserId = new Map(
    (providers ?? []).map((provider) => [provider.owner_user_id, provider]),
  );

  const overridesByProviderId = new Map<string, OverrideRow[]>();
  for (const override of overrides ?? []) {
    const existing = overridesByProviderId.get(override.provider_id) ?? [];
    existing.push(override);
    overridesByProviderId.set(override.provider_id, existing);
  }

  return users
    .map((user) => {
      const setting = settingsByUserId.get(user.id);
      const provider = providerByUserId.get(user.id);

      return {
        id: user.id,
        email: user.email ?? "No email address",
        createdAt: user.created_at,
        emailConfirmedAt: user.email_confirmed_at ?? undefined,
        lastSignInAt: user.last_sign_in_at ?? undefined,
        publishingEnabled: setting?.publishing_enabled ?? true,
        publicationUpdatedAt: setting?.dashboard_message
          ? setting.updated_at
          : undefined,
        workflow: provider
          ? {
              businessName: provider.business_name,
              setupComplete: provider.setup_complete,
              publicPath: buildProviderPath(provider.vertical, provider.slug),
            }
          : undefined,
        provider: provider
          ? {
              id: provider.id,
              planTier: provider.plan_tier,
              entitlements: entitlementsAvailable
                ? resolveEntitlements({
                    providerId: provider.id,
                    // Billing decides when a subscription exists; the legacy
                    // column is the fallback for accounts that predate it.
                    planTier:
                      billingByProviderId.get(provider.id)?.plan_tier ??
                      provider.plan_tier,
                    overrides: (overridesByProviderId.get(provider.id) ?? []).map(
                      (row) => ({
                        featureKey: row.feature_key,
                        enabled: row.enabled,
                        expiresAt: row.expires_at,
                      }),
                    ),
                  })
                : undefined,
            }
          : undefined,
        superAdmin: isSuperAdminEmail(user.email),
        demoOwner: isDemoOwnerEmail(user.email),
      } satisfies ManagedUserSummary;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function setUserPublicationEnabled(userId: string, enabled: boolean) {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data: target, error: targetError } = await admin.auth.admin.getUserById(userId);

  if (targetError || !target.user) {
    throw new Error("User not found.");
  }

  const updatedAt = new Date().toISOString();
  const dashboardMessage = enabled ? ENABLED_MESSAGE : DISABLED_MESSAGE;
  const { error } = await admin.from("user_publication_settings").upsert(
    {
      user_id: target.user.id,
      publishing_enabled: enabled,
      dashboard_message: dashboardMessage,
      updated_at: updatedAt,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }

  return {
    userId: target.user.id,
    publishingEnabled: enabled,
    dashboardMessage,
    updatedAt,
  };
}
