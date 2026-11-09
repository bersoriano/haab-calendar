import { EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";

import { EventSchedule, publicCardClass } from "@/components/invitations/EventSchedule";
import { InvitationPageShell } from "@/components/invitations/InvitationPageShell";
import { fillCopy, invitationCopy } from "@/components/invitations/invitation-copy";
import { formatRsvpDeadline, isRsvpOpen } from "@/lib/rsvp-deadline";
import type { Lang, ModuleStore, VerticalId } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The public page of an invitation-only events page: the events, and where to
 * answer. Nothing can be booked here; each household answers through its own
 * link. Server rendered, so an open-mode page never loads any of it.
 */
export function InvitationOnlyPage({
  store,
  vertical,
  lang,
  path,
  timeZone,
  serviceSlug,
}: {
  store: ModuleStore;
  vertical: VerticalId;
  lang: Lang;
  path: string;
  timeZone?: string;
  /** On an event's own URL, only that event. */
  serviceSlug?: string;
}) {
  const t = invitationCopy[lang];
  const deadline = store.provider.rsvpDeadline;
  const focused = serviceSlug ? store.services.filter((service) => service.slug === serviceSlug) : [];
  const services = focused.length > 0 ? focused : store.services;

  return (
    <InvitationPageShell provider={store.provider} vertical={vertical} lang={lang} path={path} timeZone={timeZone}>
      {store.provider.heroText ? (
        <p className="text-center text-[17px] leading-relaxed text-[var(--ink-secondary)] sm:text-[19px]">
          {store.provider.heroText}
        </p>
      ) : null}
      <section aria-labelledby="invitation-schedule" className="grid gap-4">
        <h2 id="invitation-schedule" className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
          {t.scheduleTitle}
        </h2>
        <EventSchedule services={services} provider={store.provider} lang={lang} headingLevel={3} />
      </section>
      <p className={cn(publicCardClass, "flex items-center gap-3 text-[15.5px] font-medium text-[var(--ink)]")}>
        <EnvelopeSimple aria-hidden="true" size={22} className="shrink-0 text-[var(--accent)]" />
        <span>
          {t.openYourLink}
          {deadline ? (
            <span className="block text-[14.5px] font-normal text-[var(--ink-secondary)]">
              {isRsvpOpen(deadline, timeZone)
                ? fillCopy(t.rsvpBy, { date: formatRsvpDeadline(deadline, lang) })
                : fillCopy(t.closed, { date: formatRsvpDeadline(deadline, lang) })}
            </span>
          ) : null}
        </span>
      </p>
    </InvitationPageShell>
  );
}
