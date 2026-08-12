import "server-only";

import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEMO_EDIT_COOKIE,
  DEMO_PAGES,
  findDemoPage,
  getDemoPagePath,
  isDemoOwnerEmail,
  type DemoPage,
} from "@/lib/demo-pages";
import { isSuperAdminEmail } from "@/lib/super-admin-policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** A day is long enough for an editing session and short enough to expire. */
const DEMO_EDIT_COOKIE_MAX_AGE = 60 * 60 * 24;

export type DemoEditTarget = {
  page: DemoPage;
  providerId: string;
  ownerUserId: string;
  publicPath: string;
  /** Service-role client: demo writes cannot pass RLS as the super admin. */
  admin: SupabaseClient;
};

export type DemoPageSummary = {
  key: string;
  label: string;
  vertical: DemoPage["vertical"];
  publicPath: string;
  businessName?: string;
  serviceCount: number;
  /**
   * `missing` — never seeded. `unowned` — seeded before demos were split into
   * one owner each, so re-running the seed is needed before editing.
   */
  status: "ready" | "missing" | "unowned";
};

export function buildDemoEditCookie(key: string) {
  return {
    name: DEMO_EDIT_COOKIE,
    value: key,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DEMO_EDIT_COOKIE_MAX_AGE,
    },
  };
}

/**
 * Resolves the demo page the super admin is currently editing, or null.
 *
 * The cookie only names a demo; every request re-checks that the caller is the
 * super admin and that the target row is still owned by a demo account.
 */
export async function resolveDemoEditTarget(): Promise<DemoEditTarget | null> {
  const cookieStore = await cookies();
  const page = findDemoPage(cookieStore.get(DEMO_EDIT_COOKIE)?.value);

  if (!page) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !isSuperAdminEmail(user.email)) {
    return null;
  }

  return resolveDemoPageTarget(page);
}

async function resolveDemoPageTarget(page: DemoPage): Promise<DemoEditTarget | null> {
  const admin = createAdminClient();
  const { data: provider, error: providerError } = await admin
    .from("providers")
    .select("id, owner_user_id")
    .eq("vertical", page.vertical)
    .eq("slug", page.providerSlug)
    .maybeSingle<{ id: string; owner_user_id: string }>();

  if (providerError) {
    throw providerError;
  }

  if (!provider) {
    return null;
  }

  const { data: owner, error: ownerError } =
    await admin.auth.admin.getUserById(provider.owner_user_id);

  if (ownerError || !isDemoOwnerEmail(owner?.user?.email)) {
    return null;
  }

  return {
    page,
    providerId: provider.id,
    ownerUserId: provider.owner_user_id,
    publicPath: getDemoPagePath(page),
    admin,
  };
}

/** Overview rows for the super-admin demo panel. */
export async function listDemoPageSummaries(): Promise<DemoPageSummary[]> {
  const admin = createAdminClient();
  const { data: providers, error } = await admin
    .from("providers")
    .select("id, vertical, slug, business_name, owner_user_id")
    .in(
      "slug",
      DEMO_PAGES.map((page) => page.providerSlug),
    )
    .returns<
      {
        id: string;
        vertical: string;
        slug: string;
        business_name: string;
        owner_user_id: string;
      }[]
    >();

  if (error) {
    throw error;
  }

  const providerByKey = new Map(
    (providers ?? []).map((provider) => [`${provider.vertical}/${provider.slug}`, provider]),
  );

  const providerIds = (providers ?? []).map((provider) => provider.id);
  const serviceCounts = new Map<string, number>();

  if (providerIds.length > 0) {
    const { data: services, error: servicesError } = await admin
      .from("services")
      .select("provider_id")
      .in("provider_id", providerIds)
      .returns<{ provider_id: string }[]>();

    if (servicesError) {
      throw servicesError;
    }

    for (const service of services ?? []) {
      serviceCounts.set(service.provider_id, (serviceCounts.get(service.provider_id) ?? 0) + 1);
    }
  }

  const demoOwnerIds = new Set<string>();

  await Promise.all(
    [...new Set((providers ?? []).map((provider) => provider.owner_user_id))].map(
      async (ownerUserId) => {
        const { data, error: ownerError } = await admin.auth.admin.getUserById(ownerUserId);

        if (ownerError) {
          throw ownerError;
        }

        if (isDemoOwnerEmail(data?.user?.email)) {
          demoOwnerIds.add(ownerUserId);
        }
      },
    ),
  );

  return DEMO_PAGES.map((page) => {
    const provider = providerByKey.get(`${page.vertical}/${page.providerSlug}`);
    const status = !provider
      ? "missing"
      : demoOwnerIds.has(provider.owner_user_id)
        ? "ready"
        : "unowned";

    return {
      key: page.key,
      label: page.label,
      vertical: page.vertical,
      publicPath: getDemoPagePath(page),
      businessName: provider?.business_name,
      serviceCount: provider ? (serviceCounts.get(provider.id) ?? 0) : 0,
      status,
    };
  });
}
