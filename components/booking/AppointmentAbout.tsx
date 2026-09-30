import { CalendarBlank } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { VERTICAL_ICONS } from "@/components/booking/ServiceCard";
import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
import {
  formatDuration,
  getBookingTypeLabel,
  getOccurrenceModeLabel,
} from "@/lib/format";
import { formatCapacityChip } from "@/lib/service-card";
import type { Lang, Service, VerticalId } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { VerticalCopy } from "@/lib/vertical-copy";

const eyebrowClass =
  "text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] [font-family:var(--font-plex-mono)]";
const factLabelClass = "text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]";
const tileClass = "rounded-[14px] border border-[#e6e9ef] bg-white px-3 py-2.5 sm:rounded-2xl sm:px-3.5 sm:py-3";

function ContactTile({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(tileClass, "flex min-w-0 items-center gap-3")}>
      <span
        aria-hidden="true"
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--tile-blue)] text-[var(--accent)]"
      >
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
 * to be scanned. Every fact hides when the service has nothing to say, and the
 * grid reflows around what is left. On a phone it is a `<details>`, open by
 * default, so the form can be reached without scrolling past it; from `lg` it
 * is a plain card.
 */
export function AppointmentAbout({
  service,
  vertical,
  isEvent,
  isSingle,
  singleDateLabel,
  addresses,
  phones,
  isDesktop,
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
  isDesktop: boolean;
  copy: VerticalCopy;
  lang: Lang;
}) {
  const t = bookingTranslations[lang];
  const Icon = (vertical && VERTICAL_ICONS[vertical]) || CalendarBlank;
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
      <div
        className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
        style={{ "--cols": Math.min(facts.length, 4) } as React.CSSProperties}
      >
        {facts.map((fact) => (
          <div key={fact.label} className={cn(tileClass, "flex min-w-0 flex-col gap-1.5")}>
            <span className={factLabelClass}>{fact.label}</span>
            <span className="break-words text-sm font-semibold text-[var(--ink)] sm:text-[14.5px]">
              {fact.value}
            </span>
          </div>
        ))}
      </div>

      {notes ? (
        <div className="flex items-start gap-2.5 rounded-[14px] border border-[var(--callout-mint-line)] bg-[var(--callout-mint)] px-[13px] py-[11px] text-[13px] leading-[1.5] text-[var(--callout-mint-ink)] sm:rounded-2xl sm:px-[15px] sm:py-[13px] sm:text-sm">
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00796b"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="mt-0.5 hidden shrink-0 sm:block"
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
        <div
          className={cn(
            "grid gap-2 sm:gap-2.5",
            addresses.length > 0 && phones.length > 0 && "sm:grid-cols-2",
          )}
        >
          {addresses.length > 0 ? (
            <ContactTile
              label={addresses.length > 1 ? t.publicFlow.locations : t.publicFlow.location}
              icon={
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
                </svg>
              }
            >
              {addresses.map((address) => (
                <span key={address} className="break-words text-sm text-[#3c4043]">
                  {address}
                </span>
              ))}
            </ContactTile>
          ) : null}
          {phones.length > 0 ? (
            <ContactTile
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
                  className="break-words text-sm font-medium text-[var(--primary)]"
                >
                  {phone}
                </a>
              ))}
            </ContactTile>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const cardClass =
    "min-w-0 rounded-3xl bg-[var(--panel-tint-94)] ring-1 ring-[rgba(255,255,255,0.7)] shadow-[0_14px_34px_rgba(25,28,29,0.06)] sm:rounded-[30px] sm:shadow-[0_18px_42px_rgba(25,28,29,0.06)]";

  if (isDesktop) {
    return (
      <section className={cn(cardClass, "flex flex-col gap-5 p-7")}>
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] bg-[var(--tile-blue)] text-[var(--accent)]"
          >
            <Icon weight="bold" aria-hidden className="h-[22px] w-[22px]" />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className={eyebrowClass}>{title}</p>
            <h2 className="break-words text-xl font-semibold tracking-[-0.02em] text-[var(--ink)]">
              {service.name}
            </h2>
            {description ? (
              <p className="text-[14.5px] leading-[1.55] text-[var(--muted)]">{description}</p>
            ) : null}
          </div>
        </div>
        {body}
      </section>
    );
  }

  return (
    <details open className={cn(cardClass, "group p-[18px]")}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-[var(--tile-blue)] text-[var(--accent)]"
          >
            <Icon weight="bold" aria-hidden className="h-[18px] w-[18px]" />
          </span>
          <span className="text-base font-semibold text-[var(--ink)]">{title}</span>
        </span>
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#5f6368"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 transition-transform group-open:rotate-0 group-[:not([open])]:rotate-180"
        >
          <path d="M6 15l6-6 6 6" />
        </svg>
      </summary>
      <div className="mt-3.5 flex flex-col gap-3">
        {description ? (
          <p className="text-sm leading-[1.55] text-[var(--muted)]">{description}</p>
        ) : null}
        {body}
      </div>
    </details>
  );
}
