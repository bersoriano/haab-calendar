import { NextResponse, type NextRequest } from "next/server";

import { invitationErrorResponse, NO_STORE, readJson, resolveInvitationOwner } from "@/lib/supabase/invitation-owner";
import { deleteSeatingTable, updateSeatingTable } from "@/lib/supabase/seating";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ tableId: string }> };

/** Renames a table or changes its seats: `{ name, seatCount }`. */
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const owner = await resolveInvitationOwner();
    if (!owner.ok) return owner.response;

    const { tableId } = await context.params;
    const body = ((await readJson(request)) ?? {}) as Record<string, unknown>;
    const table = await updateSeatingTable(owner.supabase, owner.providerId, tableId, body);
    return NextResponse.json({ table }, { headers: NO_STORE });
  } catch (error) {
    return invitationErrorResponse(error, "seating_table_update_failed", "Could not save that table.");
  }
}

/** Removes a table; its people go back to "not seated". */
export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const owner = await resolveInvitationOwner();
    if (!owner.ok) return owner.response;

    const { tableId } = await context.params;
    if (!(await deleteSeatingTable(owner.supabase, owner.providerId, tableId))) {
      return NextResponse.json({ userMessage: "That table was not found." }, { status: 404, headers: NO_STORE });
    }
    return NextResponse.json({ deleted: true }, { headers: NO_STORE });
  } catch (error) {
    return invitationErrorResponse(error, "seating_table_delete_failed", "Could not delete that table.");
  }
}
