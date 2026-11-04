import { NextResponse, type NextRequest } from "next/server";

import { describeError } from "@/lib/describe-error";
import { deleteProviderClient, getOwnerProvider } from "@/lib/supabase/provider-clients";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Removes a client record: how a provider answers someone asking to be deleted.
 * Their bookings are left to the schedule that already governs them.
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ userMessage: "Sign in to manage your clients." }, { status: 401 });
  }

  const { clientId } = await context.params;

  try {
    const provider = await getOwnerProvider(supabase, user.id);
    if (!provider) {
      return NextResponse.json({ userMessage: "Booking profile not found." }, { status: 404 });
    }

    if (!(await deleteProviderClient(supabase, provider.id, clientId))) {
      return NextResponse.json({ userMessage: "That client was not found." }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("provider_client_delete_failed", { error: describeError(error) });
    return NextResponse.json({ userMessage: "Could not delete that client." }, { status: 500 });
  }
}
