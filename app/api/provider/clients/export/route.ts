import { NextResponse, type NextRequest } from "next/server";

import { describeError } from "@/lib/describe-error";
import { clientsCsvFileName, toClientsCsv } from "@/lib/provider-clients";
import { getOwnerProvider, listProviderClients } from "@/lib/supabase/provider-clients";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The signed-in provider's clients as a CSV file. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ userMessage: "Sign in to export your clients." }, { status: 401 });
  }

  const lang = request.nextUrl.searchParams.get("lang") === "es" ? "es" : "en";

  try {
    const provider = await getOwnerProvider(supabase, user.id);
    if (!provider) {
      return NextResponse.json({ userMessage: "Booking profile not found." }, { status: 404 });
    }

    const timeZone = provider.timezone ?? undefined;
    const clients = await listProviderClients(supabase, provider.id);

    return new Response(toClientsCsv(clients, { lang, timeZone }), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${clientsCsvFileName(lang, timeZone, new Date())}"`,
        // Contact details: nothing between here and the browser may keep a copy.
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("provider_clients_export_failed", { error: describeError(error) });
    return NextResponse.json({ userMessage: "Could not export your clients." }, { status: 500 });
  }
}
