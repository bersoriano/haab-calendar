import { NextResponse } from "next/server";

import { getDateTimeKeysInTimeZone } from "@/lib/date";
import { invitationEmailConfig, sendInvitationEmails } from "@/lib/email/invitations";
import { createAdminClient } from "@/lib/supabase/admin";
import { invitationErrorResponse, NO_STORE, resolveInvitationOwner } from "@/lib/supabase/invitation-owner";
import { getInvitationPage, invitationEmailFor } from "@/lib/supabase/invitation-sending";
import { listInvitations, markContacted } from "@/lib/supabase/invitations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Emails a reminder to every household that has not answered and has an email
 * address. Once a day per page: the clock lives in a column only the server
 * writes, so it holds whatever the browser sends.
 */
export async function POST() {
  try {
    const owner = await resolveInvitationOwner();
    if (!owner.ok) return owner.response;

    const config = invitationEmailConfig();
    if (!config) {
      return NextResponse.json(
        { userMessage: "Email isn't set up for this site yet. Send the links by WhatsApp or copy them instead." },
        { status: 503, headers: NO_STORE },
      );
    }

    const admin = createAdminClient();
    const { data: clock, error: clockError } = await admin
      .from("providers")
      .select("last_bulk_reminder_at")
      .eq("id", owner.providerId)
      .single<{ last_bulk_reminder_at: string | null }>();
    if (clockError) throw clockError;

    const last = clock.last_bulk_reminder_at ? Date.parse(clock.last_bulk_reminder_at) : NaN;
    if (Number.isFinite(last) && Date.now() - last < DAY_MS) {
      const nextAllowedAt = new Date(last + DAY_MS).toISOString();
      return NextResponse.json(
        { userMessage: "Reminders already went out in the last 24 hours.", nextAllowedAt },
        { status: 429, headers: NO_STORE },
      );
    }

    const [invitations, page] = await Promise.all([
      listInvitations(owner.supabase, owner.providerId),
      getInvitationPage(owner.supabase, owner.providerId),
    ]);
    if (!page) {
      return NextResponse.json({ userMessage: "Booking profile not found." }, { status: 404, headers: NO_STORE });
    }

    const recipients = invitations.filter(
      (invitation) => !invitation.submittedAt && invitation.contactEmail && invitation.eventIds.length > 0,
    );
    if (recipients.length === 0) {
      return NextResponse.json({ sent: 0 }, { headers: NO_STORE });
    }

    const day = getDateTimeKeysInTimeZone(new Date(), "UTC").dateKey;
    const sent = await sendInvitationEmails({
      messages: recipients.map((invitation) => invitationEmailFor(page, invitation, "reminder")),
      config,
      replyTo: page.email,
      idempotencyKey: `invitation-reminders/${owner.providerId}/${day}`,
    });

    const { error: stampError } = await admin
      .from("providers")
      .update({ last_bulk_reminder_at: new Date().toISOString() })
      .eq("id", owner.providerId);
    if (stampError) throw stampError;
    await markContacted(owner.supabase, owner.providerId, recipients.map((invitation) => invitation.id));

    return NextResponse.json({ sent }, { headers: NO_STORE });
  } catch (error) {
    return invitationErrorResponse(error, "invitation_reminders_failed", "Could not send the reminders. Try again.");
  }
}
