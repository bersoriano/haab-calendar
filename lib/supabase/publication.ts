import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { isDemoOwnerEmail } from "@/lib/demo-pages";
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
  owner_user_id: string;
  business_name: string;
  slug: string;
  vertical: VerticalId;
  setup_complete: boolean;
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

  const [{ data: settings, error: settingsError }, { data: providers, error: providersError }] =
    await Promise.all([
      admin
        .from("user_publication_settings")
        .select("user_id, publishing_enabled, dashboard_message, updated_at")
        .returns<PublicationSettingRow[]>(),
      admin
        .from("providers")
        .select("owner_user_id, business_name, slug, vertical, setup_complete")
        .returns<ProviderSummaryRow[]>(),
    ]);

  if (settingsError) throw settingsError;
  if (providersError) throw providersError;

  const settingsByUserId = new Map(
    (settings ?? []).map((setting) => [setting.user_id, setting]),
  );
  const providerByUserId = new Map(
    (providers ?? []).map((provider) => [provider.owner_user_id, provider]),
  );

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
