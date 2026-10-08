import { NextResponse, type NextRequest } from "next/server";

import { parseAnalyticsRange, type AnalyticsSummary } from "@/lib/analytics/summary";
import { EntitlementRequiredError, requireEntitlement } from "@/lib/entitlements/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProviderRow = { id: string; timezone: string | null };

function isValidTimeZone(timeZone: string | null): timeZone is string {
  if (!timeZone) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * The signed-in provider's booking page analytics.
 *
 * Events are readable only by the service role, so this route is the boundary:
 * the provider is found from the session, never from the request, and the
 * `analytics` entitlement is checked before a single row is read.
 */
export async function GET(request: NextRequest) {
  const client = await createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ userMessage: "Sign in to see analytics." }, { status: 401 });
  }

  const { data: provider, error: providerError } = await client
    .from("providers")
    .select("id, timezone")
    .eq("owner_user_id", user.id)
    .maybeSingle<ProviderRow>();
  if (providerError) {
    return NextResponse.json({ userMessage: "Could not load your profile." }, { status: 500 });
  }
  if (!provider) {
    return NextResponse.json({ userMessage: "Booking profile not found." }, { status: 404 });
  }

  const range = parseAnalyticsRange(request.nextUrl.searchParams.get("range"));
  const timeZone = isValidTimeZone(provider.timezone) ? provider.timezone : "UTC";

  try {
    const admin = createAdminClient();
    await requireEntitlement(provider.id, "analytics", admin);

    const { data, error } = await admin.rpc("provider_analytics_summary", {
      p_provider_id: provider.id,
      p_days: range,
      p_time_zone: timeZone,
    });
    if (error) {
      throw error;
    }

    const summary: AnalyticsSummary = {
      range,
      timeZone,
      ...(data as Omit<AnalyticsSummary, "range" | "timeZone">),
    };
    return NextResponse.json(summary, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (error instanceof EntitlementRequiredError) {
      return NextResponse.json(
        { userMessage: "Analytics is a Premium feature." },
        { status: 403 },
      );
    }
    console.error("provider_analytics_failed", {
      providerId: provider.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ userMessage: "Could not load analytics." }, { status: 500 });
  }
}
