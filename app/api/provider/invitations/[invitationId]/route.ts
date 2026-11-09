import { NextResponse, type NextRequest } from "next/server";

import {
  invitationErrorResponse,
  NO_STORE,
  readJson,
  resolveInvitationOwner,
} from "@/lib/supabase/invitation-owner";
import { deleteInvitation, updateInvitation, type InvitationPatch } from "@/lib/supabase/invitations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ invitationId: string }> };

/** Edits an invitation: its fields, guests, events and answers. */
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const owner = await resolveInvitationOwner();
    if (!owner.ok) return owner.response;

    const body = await readJson(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ userMessage: "Nothing to save." }, { status: 400, headers: NO_STORE });
    }

    const { invitationId } = await context.params;
    const invitation = await updateInvitation(
      owner.supabase,
      owner.providerId,
      invitationId,
      body as InvitationPatch,
    );
    return NextResponse.json({ invitation }, { headers: NO_STORE });
  } catch (error) {
    return invitationErrorResponse(error, "invitation_update_failed", "Could not save that invitation.");
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const owner = await resolveInvitationOwner();
    if (!owner.ok) return owner.response;

    const { invitationId } = await context.params;
    // Already gone is what was asked for, but say so.
    if (!(await deleteInvitation(owner.supabase, owner.providerId, invitationId))) {
      return NextResponse.json({ userMessage: "That invitation was not found." }, { status: 404, headers: NO_STORE });
    }
    return NextResponse.json({ deleted: true }, { headers: NO_STORE });
  } catch (error) {
    return invitationErrorResponse(error, "invitation_delete_failed", "Could not delete that invitation.");
  }
}
