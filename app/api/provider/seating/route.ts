import { NextResponse, type NextRequest } from "next/server";

import { invitationErrorResponse, NO_STORE, readJson, resolveInvitationOwner } from "@/lib/supabase/invitation-owner";
import { createSeatingTable, getSeatingState, listSeatingTables } from "@/lib/supabase/seating";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Every table of the owner's page, and whether the seating is published. */
export async function GET() {
  try {
    const owner = await resolveInvitationOwner();
    if (!owner.ok) return owner.response;

    const [tables, state] = await Promise.all([
      listSeatingTables(owner.supabase, owner.providerId),
      getSeatingState(owner.supabase, owner.providerId),
    ]);
    return NextResponse.json({ tables, ...state }, { headers: NO_STORE });
  } catch (error) {
    return invitationErrorResponse(error, "seating_list_failed", "Could not load the seating.");
  }
}

/** Adds a table: `{ serviceId, name, seatCount? }`. */
export async function POST(request: NextRequest) {
  try {
    const owner = await resolveInvitationOwner();
    if (!owner.ok) return owner.response;

    const body = ((await readJson(request)) ?? {}) as Record<string, unknown>;
    const table = await createSeatingTable(owner.supabase, owner.providerId, body);
    return NextResponse.json({ table }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return invitationErrorResponse(error, "seating_table_create_failed", "Could not add that table.");
  }
}
