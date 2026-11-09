import { NextResponse, type NextRequest } from "next/server";

import { invitationErrorResponse, NO_STORE, resolveInvitationOwner } from "@/lib/supabase/invitation-owner";
import { regenerateInvitationToken } from "@/lib/supabase/invitations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A new link for the invitation. The old one stops working. */
export async function POST(_request: NextRequest, context: { params: Promise<{ invitationId: string }> }) {
  try {
    const owner = await resolveInvitationOwner();
    if (!owner.ok) return owner.response;

    const { invitationId } = await context.params;
    const invitation = await regenerateInvitationToken(owner.supabase, owner.providerId, invitationId);
    return NextResponse.json({ invitation }, { headers: NO_STORE });
  } catch (error) {
    return invitationErrorResponse(error, "invitation_token_failed", "Could not make a new link.");
  }
}
