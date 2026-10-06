"use client";

import type { ReactNode } from "react";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import {
  formatTimeZoneLabel,
  getBusinessMonogram,
  resolvePublicHeaderSlot,
  resolveTimeZoneChip,
  shouldShowProviderNameVisually,
} from "@/lib/public-header";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { VerticalCopy } from "@/lib/vertical-copy";

/**
 * The band at the top of a public booking page: who this is, what can be done
 * here, and — because it is the only surface mounted for the whole flow — what
 * is happening right now.
 *
 * The step transition fades the flow to `opacity-0` and then waits on a network
 * call to place a hold. Faded content keeps its height, so for that stretch the
 * visitor is looking at this band and a void. That is what the live slot is
 * for: the one thing still on screen is the one thing still talking.
 */

/**
 * Same voice as the confirmation pass, set a step larger: on the pass this is a
 * label above a value, but here it is the line itself and has to carry alone.
 * Tracking loosens less than the pass's, since wide letterspacing costs more
 * legibility the longer the string runs.
 */
const microLabel =
  "text-xs font-medium uppercase tracking-[0.12em] sm:text-[0.8125rem] [font-family:var(--font-plex-mono)]";

const slotToneClass = {
  idle: "text-[var(--muted)]",
  pending: "text-[var(--action-teal)]",
  warning: "text-[var(--warning-strong)]",
  error: "text-[var(--danger-strong)]",
} as const;

const headerChipClass =
  "inline-flex items-center gap-1.5 rounded-full bg-[var(--panel-glass-78)] px-[9px] py-1 text-[12px] font-medium text-[var(--ink-secondary)] sm:px-2.5 sm:text-[12.5px]";

export function PublicBookingHeader({
  businessName,
  serviceName,
  logoImageUrl,
  logoAltFallback,
  copy,
  providerTimeZone,
  isAdvancing,
  errorMessage,
  warningMessage,
  languageChooser,
  lang = "en",
  variant = "classic",
  className,
}: {
  businessName?: string;
  /** What is being booked, once chosen. Absent on the service list. */
  serviceName?: string;
  logoImageUrl?: string;
  /** Used when there is no business name to build the alt text from. */
  logoAltFallback?: string;
  copy: VerticalCopy;
  providerTimeZone?: string;
  /** The flow is fading out, or a hold is being created server-side. */
  isAdvancing: boolean;
  errorMessage?: string | null;
  warningMessage?: string | null;
  /** Rendered at the band's top right; the module owns the control itself. */
  languageChooser?: ReactNode;
  lang?: Lang;
  /**
   * `classic` is the band as it always was and stays the default, so the
   * embedded surface is untouched. `enhanced` is the dedicated page's band:
   * a monogram, a name that wraps, and chips in place of the mono meta line.
   */
  variant?: "classic" | "enhanced";
  /**
   * The band's own inset. The embedded surface already sits inside a padded
   * container; the dedicated page does not, and has to match the gutter its
   * siblings use so the edges line up.
   */
  className?: string;
}) {
  const t = bookingTranslations[lang];
  const name = businessName?.trim() ?? "";
  const service = serviceName?.trim() ?? "";
  const logo = logoImageUrl?.trim() ?? "";
  const showNameVisually = shouldShowProviderNameVisually(logo);

  const slot = resolvePublicHeaderSlot({
    bookingsNoun: copy.Bookings,
    timesShownIn: t.publicFlow.headerTimesShownIn,
    holdingSpotLabel: t.publicFlow.headerHoldingSpot,
    timeZoneLabel: formatTimeZoneLabel(providerTimeZone, lang),
    isAdvancing,
    errorMessage,
    warningMessage,
  });

  if (variant === "enhanced") {
    const monogram = getBusinessMonogram(name);
    const zoneChip = resolveTimeZoneChip(providerTimeZone, lang);
    const zoneText = zoneChip
      ? `${t.publicFlow.headerTimesIn.replace("{city}", zoneChip.city)}${
          zoneChip.offset ? ` · ${zoneChip.offset}` : ""
        }`
      : "";

    return (
      <div
        className={cn(
          "grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 rounded-[28px] border border-[rgba(255,255,255,0.6)] bg-[var(--panel-glass-55)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_42px_rgba(25,28,29,0.07)] backdrop-blur-[20px] [-webkit-backdrop-filter:blur(20px)] sm:gap-x-4 sm:gap-y-0 sm:px-[26px] sm:py-5 xl:px-8",
          className,
        )}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Blob URL
          <img
            src={logo}
            alt={
              name
                ? `${name} — ${t.publicFlow.providerLogoAlt}`
                : logoAltFallback ?? t.publicFlow.providerLogoAlt
            }
            className="col-start-1 row-start-1 h-11 w-auto max-w-[9rem] self-center object-contain object-left sm:h-16 sm:max-w-[18rem]"
          />
        ) : monogram ? (
          <span
            aria-hidden="true"
            className="col-start-1 row-start-1 flex h-11 w-11 items-center justify-center self-center rounded-[14px] bg-[linear-gradient(135deg,var(--accent),var(--action-teal))] text-base font-bold tracking-[-0.02em] text-[var(--on-primary)] shadow-[0_10px_22px_rgba(26,115,232,0.28)] sm:h-[54px] sm:w-[54px] sm:rounded-[17px] sm:text-[19px]"
          >
            {monogram}
          </span>
        ) : null}

        {/* On a phone this wrapper dissolves, so the name sits beside the tile
            and the language switch while the chips take the row beneath; from
            `sm` it is one column beside the tile. */}
        <div className="contents sm:col-start-2 sm:row-start-1 sm:flex sm:min-w-0 sm:flex-col sm:self-center">
          <div className="col-start-2 row-start-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 self-center sm:col-auto sm:row-auto sm:self-start">
            {name ? (
              showNameVisually ? (
                <h1 className="min-w-0 break-words text-[19px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--ink)] sm:text-[24px] sm:leading-[1.1]">
                  {name}
                </h1>
              ) : (
                <h1 className="sr-only">{name}</h1>
              )
            ) : null}
          </div>

          {zoneText ? (
            <div className="col-span-3 flex flex-wrap gap-1.5 sm:mt-2 sm:gap-2">
              <span className={headerChipClass}>
                <svg
                  aria-hidden="true"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="hidden shrink-0 sm:block"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                {zoneText}
              </span>
            </div>
          ) : null}

          {/* Always mounted so assistive tech hears the change; only the busy,
              warning and error states have anything to say. Sentence case and
              free to wrap, because a failure is the one line that has to be
              read in full. */}
          <p
            aria-live="polite"
            className={cn(
              "col-span-3 min-w-0 break-words text-sm font-medium leading-5 transition-colors duration-200",
              // Idle has no text; taking it out of flow keeps it from holding
              // an empty grid row (and its gap) open.
              slot.tone === "idle" ? "sr-only" : "sm:mt-2",
              slotToneClass[slot.tone],
            )}
          >
            {slot.tone === "pending" ? (
              <span
                aria-hidden="true"
                className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle [animation:haab-live-pulse_1.2s_ease-in-out_infinite]"
              />
            ) : null}
            {slot.tone === "idle" ? null : slot.text}
          </p>
        </div>

        {languageChooser ? (
          <div className="col-start-3 row-start-1 shrink-0 self-center">{languageChooser}</div>
        ) : null}
      </div>
    );
  }

  return (
    // The same frosted material the sticky bar uses. Every other panel on the
    // page is a rounded floating surface, so a square full-bleed strip would be
    // the one square thing on it.
    <div
      className={cn(
        "flex min-w-0 items-center justify-between gap-3 rounded-[28px] border border-[rgba(255,255,255,0.6)] bg-[var(--panel-glass-55)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_42px_rgba(25,28,29,0.07)] backdrop-blur-[20px] [-webkit-backdrop-filter:blur(20px)] sm:gap-5 sm:px-7 sm:py-5 xl:px-8",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Blob URL
          <img
            src={logo}
            alt={
              name
                ? `${name} — ${t.publicFlow.providerLogoAlt}`
                : logoAltFallback ?? t.publicFlow.providerLogoAlt
            }
            // Capped by height so wordmarks and monograms both land on the same
            // optical weight, rather than a fixed box that stretches one of them.
            className="h-12 w-auto max-w-[13rem] shrink-0 object-contain object-left sm:h-16 sm:max-w-[18rem]"
          />
        ) : null}

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
            {name ? (
              showNameVisually ? (
                <h1
                  title={name}
                  className="min-w-0 truncate text-xl font-semibold tracking-[-0.02em] text-[var(--ink)] sm:text-2xl"
                >
                  {name}
                </h1>
              ) : (
                // The mark already says it. Kept for the heading outline, screen
                // readers, and anything crawling the page.
                <h1 className="sr-only">{name}</h1>
              )
            ) : null}

            {/* Once a service is chosen the band is the only place still
                naming it, so it sits beside the business rather than below
                the fold with the summary. */}
            {service ? (
              <span
                title={service}
                className="max-w-full shrink truncate rounded-full bg-[var(--panel-glass-72)] px-3 py-1 text-xs font-semibold text-[var(--ink)] ring-1 ring-[rgba(193,198,214,0.55)] sm:text-[0.8125rem]"
              >
                {service}
              </span>
            ) : null}
          </div>

          <p
            aria-live="polite"
            className={cn(
              "min-w-0 truncate transition-colors duration-200",
              // Only a visible name needs clearing; an sr-only one takes no
              // space, and the gap would push the slot off the logo's centre.
              name && showNameVisually && "mt-1.5",
              microLabel,
              slotToneClass[slot.tone],
            )}
          >
            {slot.tone === "pending" ? (
              <span
                aria-hidden="true"
                className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle [animation:haab-live-pulse_1.2s_ease-in-out_infinite]"
              />
            ) : null}
            {slot.text}
          </p>
        </div>
      </div>

      {languageChooser ? (
        <div className="shrink-0">{languageChooser}</div>
      ) : null}
    </div>
  );
}
