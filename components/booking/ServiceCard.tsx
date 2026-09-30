import {
  Briefcase,
  Buildings,
  CalendarBlank,
  ForkKnife,
  Stethoscope,
  Ticket,
} from "@phosphor-icons/react";
import type { ComponentType, ReactNode } from "react";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { ToneBadge } from "@/components/ui/ToneBadge";
import {
  bookingTypeTone,
  formatDateLabel,
  formatDuration,
  formatTimeRange,
  getBookingTypeLabel,
  getOccurrenceModeLabel,
} from "@/lib/format";
import {
  formatCapacityChip,
  getServiceCardCta,
  hasServiceContact,
  type ServiceContact,
} from "@/lib/service-card";
import type { Lang, Service, VerticalId } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { VerticalCopy } from "@/lib/vertical-copy";

export const VERTICAL_ICONS: Record<
  VerticalId,
  ComponentType<{ className?: string; weight?: "regular" | "bold"; "aria-hidden"?: boolean | "true" }>
> = {
  healthcare: Stethoscope,
  spaces: Buildings,
  professional: Briefcase,
  events: Ticket,
  restaurant: ForkKnife,
};

// The name and the price are one typographic voice, so they share this and
// differ only in layout. Literal px rather than rem: the root font is 106.25%.
const titleClass =
  "text-[19px] font-semibold leading-[1.25] tracking-[-0.02em] text-[var(--ink)] sm:text-[22px] sm:leading-[1.2]";

const chipClass =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-xs font-medium sm:px-[11px] sm:py-1.5 sm:text-[12.5px]";

function ChipIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="hidden shrink-0 sm:block"
    >
      {children}
    </svg>
  );
}

/**
 * One service on step 1. The whole card is a single button, so the "Choose a
 * time" pill is a styled span: a nested button would be invalid and would put
 * two tab stops on one action. Every element hides when its data is missing,
 * so a bare service ("Haircut", no price, no notes) is still a tidy card.
 */
export function ServiceCard({
  service,
  index,
  vertical,
  copy,
  lang,
  contact,
  seatsNote,
  className,
  onSelect,
}: {
  service: Service;
  /** Alternates the icon tile between blue and teal down the list. */
  index: number;
  vertical?: VerticalId;
  copy: VerticalCopy;
  lang: Lang;
  /** Only when the list does NOT share one contact block (shown once below). */
  contact?: ServiceContact | null;
  /** Events with one fixed date: how many places are left. */
  seatsNote?: { text: string; tone: "muted" | "scarce" } | null;
  className?: string;
  onSelect: () => void;
}) {
  const t = bookingTranslations[lang];
  const isEvents = vertical === "events";
  const Icon = (vertical && VERTICAL_ICONS[vertical]) || CalendarBlank;
  const isTeal = index % 2 === 1;

  const cost = service.cost?.trim();
  const description = service.description?.trim();
  const notes = service.notes?.trim();
  const specialty = service.medicalSpecialty?.trim();
  const capacity = formatCapacityChip(service, vertical, copy, lang);

  // A full-day service's type badge already says "Full day", so the chip only
  // earns its place where the badge says something else (an event's schedule).
  const durationLabel =
    service.bookingType === "full-day"
      ? isEvents
        ? formatDuration(service, lang)
        : null
      : service.durationMinutes
        ? formatDuration(service, lang)
        : null;

  const occurrenceLabel =
    isEvents && service.occurrenceMode === "single" && service.occurrenceDate
      ? `${formatDateLabel(service.occurrenceDate, lang)}${
          service.startTime && service.endTime
            ? ` · ${formatTimeRange(service.startTime, service.endTime, lang)}`
            : ""
        }`
      : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        // h-full + flex-col fills the stretched grid cell, and the footer's
        // mt-auto pins every pill to the same baseline whatever the body holds.
        "flex h-full min-w-0 flex-col gap-3.5 rounded-[26px] bg-[var(--panel-tint-94)] p-5 text-left ring-1 ring-[rgba(255,255,255,0.7)] shadow-[0_14px_34px_rgba(25,28,29,0.06)] transition hover:-translate-y-0.5 hover:bg-[var(--panel-glass-9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:gap-[18px] sm:rounded-[30px] sm:p-7 sm:shadow-[0_18px_42px_rgba(25,28,29,0.06)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] sm:h-[52px] sm:w-[52px] sm:rounded-2xl",
          isTeal
            ? "bg-[var(--tile-teal)] text-[#00897b]"
            : "bg-[var(--tile-blue)] text-[var(--accent)]",
        )}
      >
        <Icon weight="bold" aria-hidden className="h-[22px] w-[22px] sm:h-[26px] sm:w-[26px]" />
      </span>

      <span className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between gap-3 sm:gap-4">
          <h3 className={cn(titleClass, "min-w-0 break-words")}>{service.name}</h3>
          {cost ? <span className={cn(titleClass, "shrink-0 text-right")}>{cost}</span> : null}
        </span>
        {description ? (
          <span className="block text-sm leading-[1.5] text-[var(--muted)] sm:text-[15px] sm:leading-[1.55]">
            {description}
          </span>
        ) : null}
      </span>

      <span className="flex flex-wrap gap-1.5 sm:gap-2">
        <ToneBadge
          tone={isEvents ? "secondary" : bookingTypeTone(service.bookingType)}
          className="!rounded-full !px-2.5 !py-[5px] !text-[11.5px] sm:!px-[11px] sm:!py-1.5 sm:!text-xs"
        >
          {isEvents
            ? getOccurrenceModeLabel(service.occurrenceMode, lang)
            : getBookingTypeLabel(service.bookingType, lang)}
        </ToneBadge>
        {durationLabel ? (
          <span
            className={cn(
              chipClass,
              "bg-[var(--chip-duration-bg)] font-semibold text-[var(--action-teal-deep)]",
            )}
          >
            <ChipIcon>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </ChipIcon>
            {durationLabel}
          </span>
        ) : null}
        {occurrenceLabel ? (
          <span className={cn(chipClass, "bg-[#eef0f3] text-[#3c4043]")}>
            <ChipIcon>
              <rect x="4" y="5" width="16" height="16" rx="3" />
              <path d="M8 3v4M16 3v4M4 10h16" />
            </ChipIcon>
            {occurrenceLabel}
          </span>
        ) : null}
        {capacity ? (
          <span className={cn(chipClass, "bg-[#eef0f3] text-[#3c4043]")}>
            <ChipIcon>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
            </ChipIcon>
            {capacity}
          </span>
        ) : null}
        {specialty ? (
          <span className={cn(chipClass, "bg-[#eef0f3] text-[#3c4043]")}>
            <ChipIcon>
              <path d="M3 12h4l2-5 4 10 2-5h6" />
            </ChipIcon>
            {specialty}
          </span>
        ) : null}
      </span>

      {seatsNote ? (
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            seatsNote.tone === "scarce" ? "text-[#92400e]" : "text-[var(--muted)]",
          )}
        >
          {seatsNote.text}
        </span>
      ) : null}

      {notes ? (
        <span className="flex items-start gap-2.5 rounded-[14px] border border-[var(--callout-mint-line)] bg-[var(--callout-mint)] px-[13px] py-[11px] text-[13px] leading-[1.5] text-[var(--callout-mint-ink)] sm:rounded-2xl sm:px-3.5 sm:py-3 sm:text-[13.5px]">
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
          <span>
            <span className="font-semibold">{copy.phrases.beforeVisitLabel}</span> {notes}
          </span>
        </span>
      ) : null}

      {hasServiceContact(contact) ? (
        <span className="flex flex-col gap-1.5 text-[13px] leading-[1.4] text-[var(--muted)]">
          {contact?.addresses.map((address) => (
            <span key={`addr-${address}`} className="flex items-start gap-2">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]"
              >
                <path
                  d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
                  fill="currentColor"
                />
              </svg>
              {address}
            </span>
          ))}
          {contact?.phones.map((phone) => (
            <span key={`phone-${phone}`} className="flex items-center gap-2 font-medium text-[var(--ink)]">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0 text-[var(--accent)]"
              >
                <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
              </svg>
              {phone}
            </span>
          ))}
        </span>
      ) : null}

      <span className="mt-auto flex border-t border-[rgba(193,198,214,0.6)] pt-3.5 sm:justify-end sm:pt-[18px]">
        <span className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] px-[22px] text-[15.5px] font-semibold text-white shadow-[0_12px_26px_rgba(26,115,232,0.28)] sm:h-[46px] sm:w-auto sm:text-[15px]">
          {getServiceCardCta(service, vertical, t.publicFlow)}
          <span aria-hidden="true">→</span>
        </span>
      </span>
    </button>
  );
}
