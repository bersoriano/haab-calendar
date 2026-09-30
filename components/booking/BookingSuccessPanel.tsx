"use client";

import { useEffect, useRef } from "react";

import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
import { getSuccessHeadline } from "@/lib/success-copy";
import type { BookingStatus, Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { VerticalCopy } from "@/lib/vertical-copy";

// Buttons carry `!` on their type: globals.css resets `font` on buttons outside
// any layer, which outranks every layered utility.
const buttonBase =
  "inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-full px-6 !text-[15.5px] !font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:!text-[15px]";

/**
 * The first thing on the confirmation step: it says it worked, who it is for,
 * and when, before any of the ticket's detail. The pass below is the record;
 * this is the answer to "did that go through?".
 *
 * It is a status region that takes focus when it mounts, so a screen reader
 * lands on the outcome instead of wherever the previous step's button was. The
 * focus is taken once: when the booking is later cancelled the panel stays
 * mounted and its text changes, which the live region announces on its own.
 */
export function BookingSuccessPanel({
  status,
  clientName,
  serviceName,
  dateLabel,
  timeLabel,
  isEvents,
  statusLabel,
  whatHappensNext,
  onAddToCalendar,
  onCopyLink,
  copied = false,
  copy,
  lang = "en",
}: {
  status: BookingStatus;
  clientName: string;
  serviceName: string;
  /** "Thursday, October 1" — the year is the pass's to state. */
  dateLabel: string;
  /** The start time, or null for a full-day booking. */
  timeLabel: string | null;
  isEvents: boolean;
  /** The eyebrow: "Booking Confirmed", "Booking Updated", "Booking Cancelled". */
  statusLabel: string;
  whatHappensNext?: string;
  onAddToCalendar: () => void;
  /** Absent when there is no private link to copy. */
  onCopyLink?: () => void;
  copied?: boolean;
  copy: VerticalCopy;
  lang?: Lang;
}) {
  const t = bookingTranslations[lang];
  const ref = useRef<HTMLElement | null>(null);
  const isCancelled = status === "cancelled";

  useEffect(() => {
    // The flow is already scrolling to the top on this step change.
    ref.current?.focus({ preventScroll: true });
  }, []);

  const headline = getSuccessHeadline(t.publicFlow, {
    status,
    clientName,
    isEvents,
    booking: copy.booking,
  });
  const when = timeLabel
    ? fillTemplate(t.publicFlow.successAt, { date: dateLabel, time: timeLabel })
    : fillTemplate(t.publicFlow.successOnDay, { date: dateLabel });
  const tone = isCancelled
    ? {
        disc: "bg-[#e11d48] shadow-[0_0_0_10px_rgba(225,29,72,0.12),0_14px_30px_rgba(190,18,60,0.3)]",
        eyebrow: "text-[#be123c]",
        glow: "rgba(225,29,72,0.14)",
      }
    : {
        disc: "bg-[var(--action-teal)] shadow-[0_0_0_10px_rgba(0,191,165,0.14),0_14px_30px_rgba(0,150,130,0.35)]",
        eyebrow: "text-[var(--action-teal-deep)]",
        glow: "rgba(0,191,165,0.22)",
      };

  return (
    <section
      ref={ref}
      role="status"
      tabIndex={-1}
      className="relative flex flex-col gap-[18px] overflow-hidden rounded-[26px] bg-[rgba(248,249,250,0.92)] px-5 pb-5 pt-[26px] text-center shadow-[0_20px_44px_rgba(15,23,42,0.10)] outline-none ring-1 ring-[rgba(255,255,255,0.9)] lg:gap-[26px] lg:rounded-[30px] lg:px-9 lg:py-[34px] lg:text-left lg:shadow-[0_24px_60px_rgba(15,23,42,0.10)]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-[120px] h-[360px] w-[360px] rounded-full"
        style={{ background: `radial-gradient(closest-side, ${tone.glow}, transparent)` }}
      />

      <div className="relative flex flex-col items-center gap-3 lg:flex-row lg:justify-between lg:gap-8">
        <div className="flex flex-col items-center gap-3 lg:flex-row lg:gap-[22px]">
          <span
            aria-hidden="true"
            className={cn(
              "flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full text-white [animation:haab-pop-in_0.5s_cubic-bezier(0.34,1.4,0.64,1)_both] lg:h-[76px] lg:w-[76px]",
              tone.disc,
            )}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 lg:h-9 lg:w-9"
            >
              {isCancelled ? (
                <>
                  <path
                    d="M18 6 6 18"
                    pathLength={1}
                    className="[stroke-dasharray:1] [animation:haab-stroke-draw_0.3s_ease-out_0.3s_both]"
                  />
                  <path
                    d="m6 6 12 12"
                    pathLength={1}
                    className="[stroke-dasharray:1] [animation:haab-stroke-draw_0.3s_ease-out_0.5s_both]"
                  />
                </>
              ) : (
                <path
                  d="M20 7 9 18l-5-5"
                  pathLength={1}
                  className="[stroke-dasharray:1] [animation:haab-stroke-draw_0.45s_ease-out_0.3s_both]"
                />
              )}
            </svg>
          </span>

          <div className="flex min-w-0 flex-col items-center gap-2 lg:items-start">
            <p
              className={cn(
                "mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] [font-family:var(--font-plex-mono)] lg:mt-0 lg:text-xs",
                tone.eyebrow,
              )}
            >
              {statusLabel}
            </p>
            <h2 className="text-[27px] font-semibold leading-[1.15] tracking-[-0.035em] text-[var(--ink)] lg:text-[34px] lg:leading-[1.1]">
              {headline}
            </h2>
            <p className="text-[15px] leading-[1.5] text-[#3c4043] lg:text-base">
              <span className="block break-words lg:inline">{serviceName}</span>
              <span aria-hidden="true" className="hidden lg:inline">
                {" · "}
              </span>
              <span
                className={cn(
                  "block font-semibold lg:inline",
                  isCancelled ? "text-[var(--muted)] line-through" : "text-[var(--ink)]",
                )}
              >
                {when}
              </span>
            </p>
          </div>
        </div>

        {!isCancelled ? (
          <div className="mt-1 flex w-full flex-col gap-2 lg:mt-0 lg:w-auto lg:shrink-0 lg:gap-2.5">
            <button
              type="button"
              onClick={onAddToCalendar}
              className={cn(
                buttonBase,
                "bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] text-white shadow-[0_12px_26px_rgba(26,115,232,0.28)] hover:saturate-125",
              )}
            >
              <svg
                aria-hidden="true"
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                className="hidden lg:block"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18M12 13v5M9.5 15.5h5" />
              </svg>
              {t.publicFlow.addToCalendar}
            </button>
            {onCopyLink ? (
              <button
                type="button"
                onClick={onCopyLink}
                className={cn(
                  buttonBase,
                  "border border-[#cfd5df] bg-white text-[var(--ink)] hover:bg-[var(--surface-soft)]",
                )}
              >
                <svg
                  aria-hidden="true"
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="hidden lg:block"
                >
                  <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                  <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
                </svg>
                {copied ? t.publicFlow.copied : t.publicFlow.successCopyLink}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {whatHappensNext?.trim() && !isCancelled ? (
        <div className="relative flex items-start gap-3.5 rounded-2xl border border-[var(--callout-mint-line)] bg-[var(--callout-mint)] p-3.5 text-left lg:rounded-[18px] lg:px-[18px] lg:py-4">
          <span
            aria-hidden="true"
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#00796b] text-white lg:flex"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </span>
          <div className="flex flex-col gap-[3px]">
            <p className="text-[13.5px] font-semibold text-[var(--callout-mint-ink)] lg:text-sm">
              {t.publicFlow.successWhatNext}
            </p>
            <p className="text-[13.5px] leading-[1.55] text-[#2e4a45] lg:text-[14.5px]">
              {whatHappensNext}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
