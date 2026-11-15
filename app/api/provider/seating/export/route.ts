import { NextResponse, type NextRequest } from "next/server";

import { getDateTimeKeysInTimeZone } from "@/lib/date";
import { toSeatingCsv } from "@/lib/seating";
import { invitationErrorResponse, NO_STORE, resolveInvitationOwner } from "@/lib/supabase/invitation-owner";
import { listInvitations } from "@/lib/supabase/invitations";
import { listSeatingTables } from "@/lib/supabase/seating";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** One event's seating as a CSV, by table: `?event=<service id>&lang=es`. */
export async function GET(request: NextRequest) {
  try {
    const owner = await resolveInvitationOwner();
    if (!owner.ok) return owner.response;

    const lang = request.nextUrl.searchParams.get("lang") === "es" ? "es" : "en";
    const eventId = request.nextUrl.searchParams.get("event") ?? "";
    const { data: service, error } = await owner.supabase
      .from("services")
      .select("id, name")
      .eq("provider_id", owner.providerId)
      .eq("id", eventId)
      .maybeSingle<{ id: string; name: string }>();
    if (error || !service) {
      return NextResponse.json({ userMessage: "That event was not found." }, { status: 400, headers: NO_STORE });
    }

    const [invitations, tables] = await Promise.all([
      listInvitations(owner.supabase, owner.providerId),
      listSeatingTables(owner.supabase, owner.providerId),
    ]);
    const day = getDateTimeKeysInTimeZone(new Date(), "UTC").dateKey;
    const stem = lang === "es" ? "mesas" : "seating";

    return new Response(toSeatingCsv({ invitations, tables, serviceId: service.id, lang }), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${stem}-${slugify(service.name) || "event"}-${day}.csv"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return invitationErrorResponse(error, "seating_export_failed", "Could not export the seating.");
  }
}
