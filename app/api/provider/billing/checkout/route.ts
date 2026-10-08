import { NextResponse, type NextRequest } from "next/server";

import { hasEntitlement } from "@/lib/entitlements/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/client";
import { getStripePremiumPriceId, StripeConfigError } from "@/lib/stripe/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProviderRow = { id: string };

/** Where Checkout sends the provider back; a tab the dashboard understands. */
const RETURN_PATHS = new Set(["analytics"]);

/**
 * Starts a Stripe Checkout for Premium and returns its URL.
 *
 * The provider comes from the session, never the request, and is written into
 * the subscription's metadata as `haab_provider_id` — the one key the webhook
 * projection trusts to say whose subscription it is. Nothing is granted here:
 * Premium arrives when Stripe's webhook does.
 */
export async function POST(request: NextRequest) {
  const client = await createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ userMessage: "Sign in to upgrade." }, { status: 401 });
  }

  const priceId = getStripePremiumPriceId();
  if (!priceId) {
    return NextResponse.json(
      { userMessage: "Upgrades are not available yet." },
      { status: 503 },
    );
  }

  const { data: provider, error: providerError } = await client
    .from("providers")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle<ProviderRow>();
  if (providerError) {
    return NextResponse.json({ userMessage: "Could not load your profile." }, { status: 500 });
  }
  if (!provider) {
    return NextResponse.json({ userMessage: "Booking profile not found." }, { status: 404 });
  }

  let returnTab = "analytics";
  try {
    const body = (await request.json()) as { returnTab?: unknown };
    if (typeof body.returnTab === "string" && RETURN_PATHS.has(body.returnTab)) {
      returnTab = body.returnTab;
    }
  } catch {
    // No body is fine; the default tab is used.
  }

  try {
    const admin = createAdminClient();
    if (await hasEntitlement(provider.id, "analytics", admin)) {
      return NextResponse.json({ userMessage: "Premium is already active." }, { status: 409 });
    }

    // A returning customer keeps one Stripe customer, so their invoices and
    // payment methods stay in one place.
    const { data: billing } = await admin
      .from("provider_billing_subscriptions")
      .select("stripe_customer_id")
      .eq("provider_id", provider.id)
      .maybeSingle<{ stripe_customer_id: string | null }>();

    const origin = request.nextUrl.origin;
    const session = await getStripeClient().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: provider.id,
      ...(billing?.stripe_customer_id
        ? { customer: billing.stripe_customer_id }
        : user.email
          ? { customer_email: user.email }
          : {}),
      subscription_data: { metadata: { haab_provider_id: provider.id } },
      metadata: { haab_provider_id: provider.id },
      allow_promotion_codes: true,
      success_url: `${origin}/?tab=${returnTab}&checkout=success`,
      cancel_url: `${origin}/?tab=${returnTab}&checkout=cancelled`,
    });

    if (!session.url) {
      throw new Error("Checkout session has no URL.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof StripeConfigError) {
      return NextResponse.json(
        { userMessage: "Upgrades are not available yet." },
        { status: 503 },
      );
    }
    console.error("billing_checkout_failed", {
      providerId: provider.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ userMessage: "Could not start checkout." }, { status: 500 });
  }
}
