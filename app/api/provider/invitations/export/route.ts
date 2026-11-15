import { NextResponse, type NextRequest } from "next/server";

import { getDateTimeKeysInTimeZone } from "@/lib/date";
import { toGuestListCsv } from "@/lib/guest-list-csv";
import { invitationErrorResponse, NO_STORE, resolveInvitationOwner } from "@/lib/supabase/invitation-owner";
import { getRsvpQuestions, listInvitations } from "@/lib/supabase/invitations";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Everyone attending one event, with their answers, as a CSV: what a caterer
 * or a venue asks for. `?event=<service id>&lang=es`.
 */
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
    // A malformed id is a Postgres error; it and an unknown id are the same mistake.
    if (error || !service) {
      return NextResponse.json({ userMessage: "That event was not found." }, { status: 400, headers: NO_STORE });
    }

    const [invitations, questions] = await Promise.all([
      listInvitations(owner.supabase, owner.providerId),
      getRsvpQuestions(owner.supabase, owner.providerId),
    ]);
    const csv = toGuestListCsv({ invitations, questions, serviceId: service.id, lang });
    const day = getDateTimeKeysInTimeZone(new Date(), "UTC").dateKey;
    const fileName = `${slugify(service.name) || "event"}-${day}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        // Names, contacts and diet notes: nothing between here and the browser keeps a copy.
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return invitationErrorResponse(error, "invitations_export_failed", "Could not export the guest list.");
  }
}
