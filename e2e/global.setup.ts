import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { test as setup, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  authStatePath,
  E2E_PASSWORD,
  E2E_PROVIDERS,
  type E2EProviderSeed,
} from "./fixtures/providers";

/**
 * Seeds the premium suite's providers and signs each one in.
 *
 * Everything here writes to a database, which is why the first thing it does is
 * refuse to run against one that is not local. There is deliberately no HTTP
 * seed endpoint: a route that could reset state would be reachable by anyone
 * who found it, and a test backdoor in production is worse than no test.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "host.docker.internal"]);

function requireLocalSupabase(): { url: string; serviceKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "E2E seeding needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the local stack.",
    );
  }

  const host = new URL(url).hostname;

  if (!LOCAL_HOSTS.has(host)) {
    // The host only. Never the URL with a key in it, and never the key.
    throw new Error(
      `Refusing to seed E2E data against a non-local Supabase host: ${host}`,
    );
  }

  return { url, serviceKey };
}

async function resetProvider(admin: SupabaseClient, seed: E2EProviderSeed) {
  // Delete first so a rerun starts from the same place regardless of what the
  // previous run did. Cascades take the provider's services and bookings.
  await admin.from("providers").delete().eq("id", seed.providerId);
  await admin.auth.admin.deleteUser(seed.userId).catch(() => undefined);

  const { error: userError } = await admin.auth.admin.createUser({
    id: seed.userId,
    email: seed.email,
    password: E2E_PASSWORD,
    email_confirm: true,
  });

  if (userError && !userError.message.includes("already been registered")) {
    throw userError;
  }

  const { error: providerError } = await admin.from("providers").insert({
    id: seed.providerId,
    owner_user_id: seed.userId,
    full_name: "E2E Owner",
    business_name: seed.businessName,
    email: seed.email,
    vertical: "healthcare",
    timezone: "UTC",
    plan_tier: seed.legacyPlanTier,
    slug: seed.slug,
    availability: {
      monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
      tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
      wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
      thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
      friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
      saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
    },
    setup_complete: true,
  });

  if (providerError) throw providerError;

  await admin.from("services").insert({
    provider_id: seed.providerId,
    name: "Consultation",
    booking_type: "appointment",
    duration_minutes: 30,
  });

  if (seed.billing) {
    const { error } = await admin.from("provider_billing_subscriptions").insert({
      provider_id: seed.providerId,
      stripe_customer_id: `cus_e2e_${seed.role}`,
      stripe_subscription_id: `sub_e2e_${seed.role}`,
      status: seed.billing.status,
      plan_tier: seed.billing.planTier,
      cancel_at_period_end: false,
      last_event_id: `evt_e2e_${seed.role}`,
      last_event_created_at: new Date().toISOString(),
    });

    if (error) throw error;
  }

  for (const override of seed.overrides ?? []) {
    // Through the RPC rather than a direct insert, so the audit row the
    // application would have written exists here too.
    const { error } = await admin.rpc("set_provider_feature_override", {
      p_provider_id: seed.providerId,
      p_feature_key: override.featureKey,
      p_enabled: override.enabled,
      p_expires_at: null,
      p_reason: `E2E seed for the ${seed.role} scenario`,
      p_actor_user_id: null,
    });

    if (error) throw error;
  }
}

setup("seed premium providers and sign them in", async ({ browser }) => {
  const { url, serviceKey } = requireLocalSupabase();
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const seed of E2E_PROVIDERS) {
    await resetProvider(admin, seed);
  }

  for (const seed of E2E_PROVIDERS) {
    const context = await browser.newContext();
    const page = await context.newPage();

    // The real login form, not an injected session: an E2E suite that fakes
    // authentication proves nothing about whether authentication works.
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(seed.email);
    await page.getByLabel(/password/i).first().fill(E2E_PASSWORD);
    await page.getByRole("button", { name: /sign in|log in|entrar/i }).click();

    await expect(page).toHaveURL(/\/(\?.*)?$/, { timeout: 30_000 });

    const statePath = authStatePath(seed.role);
    await mkdir(dirname(statePath), { recursive: true });
    await context.storageState({ path: statePath });
    await context.close();
  }
});
