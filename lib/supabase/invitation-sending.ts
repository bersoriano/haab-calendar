import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { buildInvitationEmail } from "@/lib/invitation-messages";
import { invitationPath, type Invitation } from "@/lib/invitations";
import { parseRsvpDeadline } from "@/lib/rsvp-deadline";
import { buildAbsoluteUrl } from "@/lib/site-url";
import type { InvitationEmail } from "@/lib/email/invitations";
import type { Lang, VerticalId } from "@/lib/types";

/** What an invitation email needs to know about the page it is for. */
export type InvitationPage = {
  businessName: string;
  email: string;
  language: Lang;
  deadline?: string;
  vertical: VerticalId;
  slug: string;
};

export async function getInvitationPage(supabase: SupabaseClient, providerId: string): Promise<InvitationPage | null> {
  const { data, error } = await supabase
    .from("providers")
    .select("business_name, email, language, rsvp_deadline, vertical, slug")
    .eq("id", providerId)
    .maybeSingle<{
      business_name: string;
      email: string;
      language: string | null;
      rsvp_deadline: string | null;
      vertical: VerticalId;
      slug: string;
    }>();

  if (error) throw error;
  if (!data) return null;
  return {
    businessName: data.business_name,
    email: data.email,
    language: data.language === "es" ? "es" : "en",
    deadline: parseRsvpDeadline(data.rsvp_deadline),
    vertical: data.vertical,
    slug: data.slug,
  };
}

/** The email for one household, in the page's language, with its own link. */
export function invitationEmailFor(
  page: InvitationPage,
  invitation: Pick<Invitation, "displayName" | "contactEmail" | "token">,
  kind: "invite" | "reminder",
): InvitationEmail {
  const { subject, text } = buildInvitationEmail({
    lang: page.language,
    kind,
    displayName: invitation.displayName,
    pageName: page.businessName,
    link: buildAbsoluteUrl(invitationPath(page.vertical, page.slug, invitation.token)),
    deadline: page.deadline,
  });
  return { to: invitation.contactEmail, subject, text };
}
