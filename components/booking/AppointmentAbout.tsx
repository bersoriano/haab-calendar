import type { ReactNode } from "react";

import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
import {
  formatDuration,
  getBookingTypeLabel,
  getOccurrenceModeLabel,
} from "@/lib/format";
import { formatCapacityChip } from "@/lib/service-card";
import type { Lang, Service, VerticalId } from "@/lib/types";
import type { VerticalCopy } from "@/lib/vertical-copy";

const eyebrowClass =
  "text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] [font-family:var(--font-plex-mono)]";
const factLabelClass = "text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]";

/** One contact line in the summary's rhythm: a small icon where the status icon sits on client rows. */
function ContactRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span aria-hidden="true" className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-[var(--accent)]">
        {icon}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={factLabelClass}>{label}</span>
        {children}
      </div>
    </div>
  );
}

/**
 * "About the appointment": what the visitor is booking, said once and laid out
 * to be scanned, as a section of the appointment summary. Every fact hides when
 * the service has nothing to say. In the compact phone summary it is a
 * `<details>`, closed by default, so it never pushes the form down.
 */
export function AppointmentAbout({
  service,
  vertical,
  isEvent,
  isSingle,
  singleDateLabel,
  addresses,
  phones,
  collapsible = false,
  copy,
  lang,
}: {
  service: Service;
  vertical?: VerticalId;
  isEvent: boolean;
  /** An event with one fixed date: the date is the fact, not the length. */
  isSingle: boolean;
  singleDateLabel: string;
  addresses: string[];
  phones: string[];
  /** The compact phone summary folds the section away behind its title. */
  collapsible?: boolean;
  copy: VerticalCopy;
  lang: Lang;
}) {
  const t = bookingTranslations[lang];
  const title = isEvent
    ? copy.phrases.aboutServiceTitle
    : fillTemplate(t.publicFlow.aboutBooking, { booking: copy.booking });
  const description = service.description?.trim();
  const notes = service.notes?.trim();
  const specialty = service.medicalSpecialty?.trim();
  const capacity = formatCapacityChip(service, vertical, copy, lang);

  // A full-day service's type already says "Full day", and an appointment with
  // no minutes would only say "Appointment" twice: neither earns a Length.
  const length = isSingle
    ? null
    : service.bookingType === "full-day"
      ? isEvent
        ? formatDuration(service, lang)
        : null
      : service.durationMinutes
        ? formatDuration(service, lang)
        : null;

  const facts: Array<{ label: string; value: string }> = [
    {
      label: isSingle ? t.publicFlow.when : t.publicFlow.type,
      value: isSingle
        ? singleDateLabel
        : isEvent
          ? getOccurrenceModeLabel(service.occurrenceMode, lang)
          : getBookingTypeLabel(service.bookingType, lang),
    },
    ...(specialty ? [{ label: t.publicFlow.specialty, value: specialty }] : []),
    ...(length ? [{ label: t.publicFlow.length, value: length }] : []),
    ...(capacity ? [{ label: t.publicFlow.capacity, value: capacity }] : []),
  ];

  const body = (
    <>
      {description ? (
        <p className="text-[13.5px] leading-[1.55] text-[var(--muted)]">{description}</p>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {facts.map((fact) => (
          <div key={fact.label} className="flex min-w-0 flex-col gap-0.5">
            <dt className={factLabelClass}>{fact.label}</dt>
            <dd className="break-words text-[14.5px] font-medium text-[var(--ink)]">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {notes ? (
        <div className="flex items-start gap-2.5 rounded-[14px] border border-[var(--callout-mint-line)] bg-[var(--callout-mint)] px-[13px] py-[11px] text-[13px] leading-[1.5] text-[var(--callout-mint-ink)]">
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00796b"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="mt-0.5 shrink-0"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </svg>
          <p>
            <span className="font-semibold">{copy.phrases.beforeVisitLabel}</span> {notes}
          </p>
        </div>
      ) : null}

      {addresses.length > 0 || phones.length > 0 ? (
        <div className="flex flex-col gap-3">
          {addresses.length > 0 ? (
            <ContactRow
              label={addresses.length > 1 ? t.publicFlow.locations : t.publicFlow.location}
              icon={
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
                </svg>
              }
            >
              {addresses.map((address) => (
                <span key={address} className="break-words text-[14.5px] text-[#3c4043]">
                  {address}
                </span>
              ))}
            </ContactRow>
          ) : null}
          {phones.length > 0 ? (
            <ContactRow
              label={phones.length > 1 ? t.publicFlow.phones : t.publicFlow.phone}
              icon={
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
                </svg>
              }
            >
              {phones.map((phone) => (
                <a
                  key={phone}
                  href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                  className="break-words text-[14.5px] font-medium text-[var(--primary)]"
                >
                  {phone}
                </a>
              ))}
            </ContactRow>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (collapsible) {
    return (
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className={eyebrowClass}>{title}</span>
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5f6368"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 transition-transform group-open:rotate-180"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <div className="flex flex-col gap-3 pb-1 pt-1.5">{body}</div>
      </details>
    );
  }

  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <span className={eyebrowClass}>{title}</span>
      {body}
    </section>
  );
}
