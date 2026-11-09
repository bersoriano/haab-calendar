import { NextResponse, type NextRequest } from "next/server";

import { getDoorList, recordCheckins } from "@/lib/supabase/checkin";
import { invitationErrorResponse, NO_STORE, readJson, resolveInvitationOwner } from "@/lib/supabase/invitation-owner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** One event's door list, to keep on the door phone: `?event=<service id>&lang=es`. */
export async function GET(request: NextRequest) {
  try {
    const owner = await resolveInvitationOwner();
    if (!owner.ok) return owner.response;

    const lang = request.nextUrl.searchParams.get("lang") === "es" ? "es" : "en";
    const list = await getDoorList(owner.supabase, owner.providerId, request.nextUrl.searchParams.get("event") ?? "", lang);
    if (!list) {
      return NextResponse.json({ userMessage: "That event was not found." }, { status: 400, headers: NO_STORE });
    }
    return NextResponse.json({ list }, { headers: NO_STORE });
  } catch (error) {
    return invitationErrorResponse(error, "door_list_failed", "Could not load the door list.");
  }
}

/** Arrivals from a door phone, possibly queued while offline: `{ serviceId, entries: [{ guestId, at | null }] }`. */
export async function POST(request: NextRequest) {
  try {
    const owner = await resolveInvitationOwner();
    if (!owner.ok) return owner.response;

    const body = ((await readJson(request)) ?? {}) as Record<string, unknown>;
    const changed = await recordCheckins(owner.supabase, owner.providerId, body);
    return NextResponse.json({ changed }, { headers: NO_STORE });
  } catch (error) {
    return invitationErrorResponse(error, "door_checkin_failed", "Could not check those guests in.");
  }
}
