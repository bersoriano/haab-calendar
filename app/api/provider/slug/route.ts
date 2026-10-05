import { NextResponse, type NextRequest } from "next/server";

import { EntitlementRequiredError, requireEntitlement } from "@/lib/entitlements/server";
import { buildProviderPath } from "@/lib/public-url";
import { prepareProviderSlugChange } from "@/lib/slug-management";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { VerticalId } from "@/lib/types";

export const runtime = "nodejs";

type ProviderRow = { id: string; vertical: VerticalId; slug: string };

export async function PUT(request: NextRequest) {
  const client = await createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ userMessage: "Sign in to change your public URL." }, { status: 401 });
  }

  let slug: unknown;
  try {
    slug = ((await request.json()) as { slug?: unknown }).slug;
  } catch {
    return NextResponse.json({ userMessage: "Invalid URL request." }, { status: 400 });
  }
  if (typeof slug !== "string") {
    return NextResponse.json({ userMessage: "Enter a URL slug." }, { status: 400 });
  }

  const { data: provider, error: providerError } = await client
    .from("providers")
    .select("id, vertical, slug")
    .eq("owner_user_id", user.id)
    .maybeSingle<ProviderRow>();
  if (providerError) {
    return NextResponse.json({ userMessage: "Could not load your profile." }, { status: 500 });
  }
  if (!provider) {
    return NextResponse.json({ userMessage: "Booking profile not found." }, { status: 404 });
  }

  try {
    const admin = createAdminClient();
    const entitlements = await requireEntitlement(provider.id, "custom_slug", admin);
    const prepared = await prepareProviderSlugChange(admin, {
      vertical: provider.vertical,
      requestedSlug: slug,
      currentProviderId: provider.id,
      entitlements,
    });
    if (!prepared.ok) {
      return NextResponse.json({ userMessage: prepared.message }, { status: 409 });
    }

    if (prepared.slug === provider.slug) {
      return NextResponse.json({
        slug: provider.slug,
        publicUrl: buildProviderPath(provider.vertical, provider.slug),
      });
    }

    const { data: updated, error: updateError } = await admin
      .from("providers")
      .update({ custom_slug: prepared.slug })
      .eq("id", provider.id)
      .select("slug")
      .single<{ slug: string }>();
    if (updateError) {
      if (updateError.code === "23505") {
        return NextResponse.json({ userMessage: "That public URL is already taken." }, { status: 409 });
      }
      throw updateError;
    }

    return NextResponse.json({
      slug: updated.slug,
      publicUrl: buildProviderPath(provider.vertical, updated.slug),
    });
  } catch (error) {
    if (error instanceof EntitlementRequiredError) {
      return NextResponse.json({ userMessage: "Custom URLs are not enabled for this account." }, { status: 403 });
    }
    console.error("provider_slug_update_failed", {
      providerId: provider.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ userMessage: "Could not update your public URL." }, { status: 500 });
  }
}
