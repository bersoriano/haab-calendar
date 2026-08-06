"use client";

import type { ReactNode } from "react";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import {
  formatTimeZoneLabel,
  resolvePublicHeaderSlot,
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
  warning: "text-[#b45309]",
  error: "text-[#be123c]",
} as const;

export function PublicBookingHeader({
  businessName,
  logoImageUrl,
  logoAltFallback,
  copy,
  providerTimeZone,
  isAdvancing,
  errorMessage,
  warningMessage,
  languageChooser,
  lang = "en",
}: {
  businessName?: string;
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
}) {
  const t = bookingTranslations[lang];
  const name = businessName?.trim() ?? "";
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

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[rgba(15,23,42,0.08)] px-5 py-5 sm:gap-5 sm:px-8 sm:py-6 xl:px-10">
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
          {name ? (
            showNameVisually ? (
              <h1
                title={name}
                className="min-w-0 truncate text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)] sm:text-3xl"
              >
                {name}
              </h1>
            ) : (
              // The mark already says it. Kept for the heading outline, screen
              // readers, and anything crawling the page.
              <h1 className="sr-only">{name}</h1>
            )
          ) : null}

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
