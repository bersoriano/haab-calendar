import { NextResponse, type NextRequest } from "next/server";

import { invitationErrorResponse, NO_STORE, readJson, resolveInvitationOwner } from "@/lib/supabase/invitation-owner";
import { assignSeats } from "@/lib/supabase/seating";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Seats guests at a table of one event, or frees them: `{ serviceId, guestIds, tableId | null }`. */
export async function POST(request: NextRequest) {
  try {
    const owner = await resolveInvitationOwner();
    if (!owner.ok) return owner.response;

    const body = ((await readJson(request)) ?? {}) as Record<string, unknown>;
    const moved = await assignSeats(owner.supabase, owner.providerId, body);
    return NextResponse.json({ moved }, { headers: NO_STORE });
  } catch (error) {
    return invitationErrorResponse(error, "seating_assign_failed", "Could not seat those guests.");
  }
}
