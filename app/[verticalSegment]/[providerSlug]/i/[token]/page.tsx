import { notFound, permanentRedirect } from "next/navigation";

import { EventSchedule } from "@/components/invitations/EventSchedule";
import { InvitationPageShell } from "@/components/invitations/InvitationPageShell";
import { InvitationRsvp } from "@/components/invitations/InvitationRsvp";
import { isRsvpOpen } from "@/lib/rsvp-deadline";
import { isInvitationMode } from "@/lib/rsvp-mode";
import { resolvePublicBookingUrl } from "@/lib/public-booking-resolver";
import { parsePublicLanguage, withPublicLanguage } from "@/lib/public-language";
import { buildProviderPath, parsePublicVerticalSegment } from "@/lib/public-url";
import { PRIVATE_PAGE_METADATA } from "@/lib/site-metadata";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicInvitation } from "@/lib/supabase/invitations";

export const dynamic = "force-dynamic";

// The token is the only key to a household's answers and names. Never indexed,
// and the preview of a forwarded link never names the household.
export const metadata = PRIVATE_PAGE_METADATA;

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ verticalSegment: string; providerSlug: string; token: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const [{ verticalSegment, providerSlug, token }, query] = await Promise.all([params, searchParams]);
  const publicLanguage = parsePublicLanguage(query.lang);
  const vertical = parsePublicVerticalSegment(verticalSegment);
  if (!vertical) notFound();

  const resolution = await resolvePublicBookingUrl({ verticalSegment, providerSlug });
  if (!resolution) notFound();

  if (resolution.status === "redirect") {
    permanentRedirect(withPublicLanguage(`${resolution.location}/i/${encodeURIComponent(token)}`, publicLanguage));
  }

  const { store, meta } = resolution;
  if (!isInvitationMode(store.provider, store.vertical)) notFound();

  const found = await getPublicInvitation(createAdminClient(), {
    vertical,
    providerSlug: store.provider.publicSlug,
    token,
  });
  if (!found) notFound();

  const lang = publicLanguage ?? store.provider.language;
  const pagePath = `${buildProviderPath(vertical, store.provider.publicSlug)}/i/${token}`;
  const invitedServices = store.services.filter((service) => found.invitation.eventIds.includes(service.id));

  return (
    <InvitationPageShell
      provider={store.provider}
      vertical={vertical}
      lang={lang}
      path={pagePath}
      timeZone={meta.timezone}
    >
      {store.provider.heroText ? (
        <p className="text-center text-[17px] leading-relaxed text-[var(--ink-secondary)] sm:text-[19px]">
          {store.provider.heroText}
        </p>
      ) : null}
      <EventSchedule services={invitedServices} provider={store.provider} lang={lang} />
      <InvitationRsvp
        invitation={found.invitation}
        services={store.services}
        apiPath={`/api/public/${verticalSegment}/${store.provider.publicSlug}/invitations/${token}`}
        lang={lang}
        deadline={store.provider.rsvpDeadline}
        open={isRsvpOpen(store.provider.rsvpDeadline, meta.timezone)}
        organizerPhone={store.provider.phoneNumber1}
        questions={store.provider.rsvpQuestions ?? []}
      />
    </InvitationPageShell>
  );
}
