import { NextResponse } from "next/server";

import { describeError } from "@/lib/describe-error";
import { getOwnerProvider, listProviderClients } from "@/lib/supabase/provider-clients";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

/** The signed-in provider's clients. RLS scopes every read to the owner. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ userMessage: "Sign in to see your clients." }, { status: 401 });
  }

  try {
    const provider = await getOwnerProvider(supabase, user.id);
    if (!provider) {
      return NextResponse.json({ userMessage: "Booking profile not found." }, { status: 404 });
    }

    const clients = await listProviderClients(supabase, provider.id);
    return NextResponse.json({ clients }, { headers: NO_STORE });
  } catch (error) {
    console.error("provider_clients_list_failed", { error: describeError(error) });
    return NextResponse.json({ userMessage: "Could not load your clients." }, { status: 500 });
  }
}
