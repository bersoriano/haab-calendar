import { NextResponse, type NextRequest } from "next/server";

import {
  parseAnalyticsRange,
  type AnalyticsSummary,
  type AnalyticsTeaser,
} from "@/lib/analytics/summary";
import { hasEntitlement } from "@/lib/entitlements/server";
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
 * `analytics` entitlement decides whether the full summary or only the visit
 * totals are returned.
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
    const entitled = await hasEntitlement(provider.id, "analytics", admin);

    const { data, error } = await admin.rpc("provider_analytics_summary", {
      p_provider_id: provider.id,
      p_days: range,
      p_time_zone: timeZone,
    });
    if (error) {
      throw error;
    }

    const full = data as Omit<AnalyticsSummary, "range" | "timeZone">;
    const headers = { "cache-control": "private, no-store" };

    // Without the entitlement, only the two totals leave the server: the rest
    // of the summary is what Premium sells, so it is never sent to be hidden
    // by the browser.
    if (!entitled) {
      const teaser: AnalyticsTeaser = {
        locked: true,
        range,
        timeZone,
        totals: { views: full.totals.views, visitors: full.totals.visitors },
      };
      return NextResponse.json(teaser, { headers });
    }

    const summary: AnalyticsSummary = { range, timeZone, ...full };
    return NextResponse.json(summary, { headers });
  } catch (error) {
    console.error("provider_analytics_failed", {
      providerId: provider.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ userMessage: "Could not load analytics." }, { status: 500 });
  }
}
