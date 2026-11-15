import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { invitationEmailConfig, sendInvitationEmails } from "@/lib/email/invitations";
import {
  invitationErrorResponse,
  NO_STORE,
  readJson,
  resolveInvitationOwner,
} from "@/lib/supabase/invitation-owner";
import { getInvitationPage, invitationEmailFor } from "@/lib/supabase/invitation-sending";
import { getInvitation, markContacted } from "@/lib/supabase/invitations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Emails one household its link: `{ kind: "invite" | "reminder" }`. */
export async function POST(request: NextRequest, context: { params: Promise<{ invitationId: string }> }) {
  try {
    const owner = await resolveInvitationOwner();
    if (!owner.ok) return owner.response;

    const config = invitationEmailConfig();
    if (!config) {
      return NextResponse.json(
        { userMessage: "Email isn't set up for this site yet. Send the link by WhatsApp or copy it instead." },
        { status: 503, headers: NO_STORE },
      );
    }

    const body = (await readJson(request)) as { kind?: unknown } | null;
    const kind = body?.kind === "reminder" ? "reminder" : "invite";
    const { invitationId } = await context.params;
    const [invitation, page] = await Promise.all([
      getInvitation(owner.supabase, owner.providerId, invitationId),
      getInvitationPage(owner.supabase, owner.providerId),
    ]);

    if (!invitation || !page) {
      return NextResponse.json({ userMessage: "That invitation was not found." }, { status: 404, headers: NO_STORE });
    }
    if (!invitation.contactEmail) {
      return NextResponse.json(
        { userMessage: "This invitation has no email address. Add one, or send the link by WhatsApp." },
        { status: 400, headers: NO_STORE },
      );
    }

    await sendInvitationEmails({
      messages: [invitationEmailFor(page, invitation, kind)],
      config,
      replyTo: page.email,
      idempotencyKey: `invitation-email/${invitation.id}/${randomUUID()}`,
    });
    await markContacted(owner.supabase, owner.providerId, [invitation.id]);

    const updated = await getInvitation(owner.supabase, owner.providerId, invitation.id);
    return NextResponse.json({ invitation: updated }, { headers: NO_STORE });
  } catch (error) {
    return invitationErrorResponse(error, "invitation_email_failed", "Could not send that email. Try again.");
  }
}
