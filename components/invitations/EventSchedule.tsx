import { CalendarBlank, MapPin } from "@phosphor-icons/react/dist/ssr";

import { invitationCopy } from "@/components/invitations/invitation-copy";
import { formatTimeRange, formatWeekdayDate } from "@/lib/format";
import { getServiceContact } from "@/lib/service-card";
import type { Lang, ProviderInfo, Service } from "@/lib/types";

export const publicCardClass =
  "rounded-[26px] bg-[var(--panel-tint-94)] p-5 ring-1 ring-[rgba(255,255,255,0.7)] shadow-[0_14px_34px_rgba(25,28,29,0.06)] sm:rounded-[30px] sm:p-7";

/** When an event happens, in the page's own time zone (the header names it). */
export function eventWhen(service: Service, lang: Lang): string {
  const time = formatTimeRange(service.startTime, service.endTime, lang);
  if (service.occurrenceMode === "single" && service.occurrenceDate) {
    return [formatWeekdayDate(service.occurrenceDate, lang), time].filter(Boolean).join(" · ");
  }
  return time;
}

/**
 * The events of an invitation-only page: what, when, where, and what to know.
 * Nothing here can be booked; answers go through each household's link.
 */
export function EventSchedule({
  services,
  provider,
  lang,
  headingLevel = 2,
}: {
  services: Service[];
  provider: ProviderInfo;
  lang: Lang;
  headingLevel?: 2 | 3;
}) {
  const t = invitationCopy[lang];
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {services.map((service) => {
        const contact = getServiceContact(service, provider);
        const when = eventWhen(service, lang);

        return (
          <li key={service.id} className={publicCardClass}>
            <Heading className="text-[19px] font-semibold tracking-[-0.01em] text-[var(--ink)] sm:text-[21px]">
              {service.name}
            </Heading>
            {service.description ? (
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink-secondary)]">{service.description}</p>
            ) : null}
            <dl className="mt-4 grid gap-2 text-[14.5px] text-[var(--ink-secondary)]">
              {when ? (
                <div className="flex items-start gap-2">
                  <dt className="sr-only">{t.scheduleTitle}</dt>
                  <CalendarBlank aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                  <dd className="first-letter:uppercase">{when}</dd>
                </div>
              ) : null}
              {contact.addresses.length > 0 ? (
                <div className="flex items-start gap-2">
                  <dt className="sr-only">{t.where}</dt>
                  <MapPin aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                  <dd>{contact.addresses.join(" · ")}</dd>
                </div>
              ) : null}
            </dl>
            {service.notes ? (
              <p className="mt-4 whitespace-pre-line rounded-2xl bg-[var(--surface-lowest)] px-4 py-3 text-[14px] leading-relaxed text-[var(--ink-secondary)]">
                <span className="font-semibold text-[var(--ink)]">{t.goodToKnow}: </span>
                {service.notes}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
