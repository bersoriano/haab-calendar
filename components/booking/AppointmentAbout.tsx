import type { ReactNode } from "react";

import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
import {
  formatDuration,
  formatMinGroupSize,
  getBookingTypeLabel,
  getOccurrenceModeLabel,
} from "@/lib/format";
import { formatCapacityChip } from "@/lib/service-card";
import type { Lang, Service, VerticalId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { cancellationPolicyLabel } from "@/lib/vertical-copy";
import type { VerticalCopy } from "@/lib/vertical-copy";

const eyebrowClass =
  "text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] [font-family:var(--font-plex-mono)]";
const factLabelClass = "text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]";
// One column per fact, so type, length and capacity always share a row: equal
// shares where there is room, and never narrower than a fact's longest word.
const FACT_COLUMNS = [
  "grid-cols-1",
  "grid-cols-1",
  "grid-cols-[repeat(2,minmax(min-content,1fr))]",
  "grid-cols-[repeat(3,minmax(min-content,1fr))]",
];

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
  const minGroup = formatMinGroupSize(service, copy, t.publicFlow.minGroupValue);
  const cancellationPolicy = service.cancellationPolicy?.trim();
  const photos = service.photoUrls ?? [];

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
          ? getOccurrenceModeLabel(service.occurrenceMode, lang, copy.event)
          : getBookingTypeLabel(service.bookingType, lang),
    },
    ...(length ? [{ label: t.publicFlow.length, value: length }] : []),
    ...(capacity ? [{ label: t.publicFlow.capacity, value: capacity }] : []),
  ];

  const body = (
    <>
      {photos.length > 0 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((url, index) => (
            <li key={url} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={fillTemplate(t.publicFlow.photoAlt, {
                  name: service.name,
                  n: String(index + 1),
                })}
                loading="lazy"
                className="h-24 w-36 rounded-xl object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}

      {description ? (
        <p className="text-[13.5px] leading-[1.55] text-[var(--muted)]">{description}</p>
      ) : null}

      <dl className={cn("grid gap-x-3 gap-y-3", FACT_COLUMNS[facts.length])}>
        {facts.map((fact) => (
          <div key={fact.label} className="flex min-w-0 flex-col gap-0.5">
            <dt className={factLabelClass}>{fact.label}</dt>
            <dd className="break-words text-[14.5px] font-medium text-[var(--ink)]">{fact.value}</dd>
          </div>
        ))}
        {minGroup ? (
          <div className="col-span-full flex min-w-0 flex-col gap-0.5">
            <dt className={factLabelClass}>{t.publicFlow.minGroupLabel}</dt>
            <dd className="break-words text-[14.5px] font-medium text-[var(--ink)]">{minGroup}</dd>
          </div>
        ) : null}
        {specialty ? (
          <div className="col-span-full flex min-w-0 flex-col gap-0.5">
            <dt className={factLabelClass}>{t.publicFlow.specialty}</dt>
            <dd className="break-words text-[14.5px] font-medium text-[var(--ink)]">{specialty}</dd>
          </div>
        ) : null}
      </dl>

      {notes ? (
        <div className="flex items-start gap-2.5 rounded-[14px] border border-[var(--callout-mint-line)] bg-[var(--callout-mint)] px-[13px] py-[11px] text-[13px] leading-[1.5] text-[var(--callout-mint-ink)]">
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            style={{ stroke: "var(--callout-icon)" }}
            strokeWidth="2.2"
            strokeLinecap="round"
            className="mt-0.5 shrink-0"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </svg>
          <p className="whitespace-pre-line">
            <span className="font-semibold">{copy.phrases.beforeVisitLabel}</span> {notes}
          </p>
        </div>
      ) : null}

      {cancellationPolicy ? (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={factLabelClass}>{cancellationPolicyLabel(copy, t.publicFlow.cancellationPolicy)}</span>
          <p className="whitespace-pre-line break-words text-[13.5px] leading-[1.55] text-[var(--ink-secondary)]">
            {cancellationPolicy}
          </p>
        </div>
      ) : null}

      {addresses.length > 0 || phones.length > 0 ? (
        // The phone keeps its own width while the address has room to read.
        <div
          className={cn(
            "grid gap-x-4 gap-y-3",
            addresses.length > 0 && phones.length > 0 && "grid-cols-[minmax(7.5rem,1fr)_auto]",
          )}
        >
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
                <span key={address} className="break-words text-[14.5px] text-[var(--ink-secondary)]">
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
