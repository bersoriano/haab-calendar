import { cn } from "@/lib/utils";
import { formatCountdown } from "@/lib/format";
import { defaultCopy, type VerticalCopy } from "@/lib/vertical-copy";
import type { Lang } from "@/lib/types";
import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

export function BookingHoldCountdownBar({
  isCancelled,
  isConfirmed,
  isExpired,
  remainingMs,
  remainingRatio,
  helperDesktopHidden,
  isOnline = true,
  canExtend = false,
  isExtending = false,
  extensionUsed = false,
  extensionMessage,
  onExtend,
  onChooseAnother,
  onRetryHold,
  isRetryingHold = false,
  copy = defaultCopy,
  lang = "en",
}: {
  isCancelled?: boolean;
  isConfirmed?: boolean;
  isExpired: boolean;
  remainingMs: number;
  remainingRatio: number;
  helperDesktopHidden?: boolean;
  isOnline?: boolean;
  canExtend?: boolean;
  isExtending?: boolean;
  extensionUsed?: boolean;
  extensionMessage?: string | null;
  onExtend?: () => void;
  onChooseAnother?: () => void;
  /** One tap to take the same slot again after the hold ran out. */
  onRetryHold?: () => void;
  isRetryingHold?: boolean;
  copy?: VerticalCopy;
  lang?: Lang;
}) {
  const t = bookingTranslations[lang];
  const isUrgent = remainingMs <= 2 * 60 * 1000 || isExpired;
  const isWarning = !isUrgent && remainingMs <= 5 * 60 * 1000;
  const isRunning = !isConfirmed && !isCancelled && !isExpired;
  const remainingPercent = Math.max(0, Math.min(100, remainingRatio * 100));
  const displayedRemainingPercent = isExpired
    ? 100
    : Math.max(isUrgent && remainingPercent > 0 ? 8 : 0, remainingPercent);
  const nouns = { booking: copy.booking, Booking: copy.Booking };
  const statusLabel = isCancelled
    ? fillTemplate(t.public.holdCancelledFor, nouns)
    : isConfirmed
      ? fillTemplate(t.public.holdSecuredFor, nouns)
      : isExpired
        ? t.public.holdExpired
        : isUrgent || isWarning
          ? t.public.holdEndingSoon
          : "";
  const helperText = isCancelled
    ? t.public.holdInactiveBody
    : isConfirmed
      ? fillTemplate(t.public.holdConfirmedFor, nouns)
      : isExpired
        ? t.public.expiredBody
        // Vertical-specific: a clinic, a court, and a workshop reassure
        // differently, and this is the moment the visitor is deciding whether
        // to trust the page with their details.
        : copy.phrases.holdReassurance;

  return (
    <section
      aria-label={fillTemplate(t.public.holdCountdownLabel, nouns)}
      className={cn(
        // Not clipped: the label's tooltip has to be able to hang below the
        // section. The progress bar does its own clipping.
        "px-0 py-0 transition-colors duration-300",
        isCancelled || isUrgent || isExpired
          ? "text-[#be123c]"
          : isConfirmed
            ? "text-[var(--accent-strong)]"
            : isWarning
              ? "text-[#92400e]"
              : "text-[var(--ink)]",
      )}
    >
      {!isOnline && !isConfirmed && !isCancelled ? (
        <div
          role="status"
          className="mb-4 rounded-2xl border border-[#fcd34d] bg-[#fffbeb] px-4 py-3 text-[#92400e]"
        >
          <p className="font-semibold">{t.public.offlineTitle}</p>
          <p className="mt-1 text-sm leading-5">{t.public.offlineBody}</p>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold uppercase tracking-[0.12em]">
            {fillTemplate(t.public.holdLabelFor, nouns)}
            {/* What the hold means is reassurance, not instruction: worth
                having on demand, not worth re-reading on every booking. The
                icon rides the label because the title below it is hidden on
                small screens, where the answer is wanted most. */}
            {isRunning ? (
              <InfoTooltip
                label={t.public.holdMeaningTooltipLabel}
                text={`${t.public.holdMeaningBody} ${t.public.holdDetailsSafe}`}
              />
            ) : null}
          </p>
          {statusLabel ? (
            <p className="mt-1 text-[0.9375rem] font-semibold text-[var(--ink)]">
              {statusLabel}
            </p>
          ) : null}
          {/* What the hold actually means, said plainly, while it is running. */}
          {isRunning ? (
            <p className="mt-1 hidden text-[0.9375rem] font-semibold tracking-[-0.01em] text-[var(--ink)] sm:block">
              {t.public.holdMeaningTitle}
            </p>
          ) : null}
        </div>
        {!isConfirmed && !isCancelled ? (
          <div
            role="timer"
            aria-label={`${t.public.holdRemaining}: ${isExpired ? t.public.expired : formatCountdown(remainingMs)}`}
            className={cn(
              "shrink-0 rounded-[26px] px-5 py-3 text-center font-semibold tabular-nums ring-1 transition-colors",
              isExpired
                ? "bg-[#fff1f2] px-4 py-2 text-[0.8125rem] uppercase tracking-[0.12em] ring-[#fecdd3]"
                : isUrgent
                  ? "bg-[#fff1f2] text-4xl tracking-[-0.05em] ring-[#fecdd3] sm:text-5xl"
                  : isWarning
                    ? "bg-[#fffbeb] text-4xl tracking-[-0.05em] ring-[#fde68a] sm:text-5xl"
                    : "bg-white/85 text-4xl tracking-[-0.05em] ring-black/5 sm:text-5xl",
            )}
          >
            {isExpired ? t.public.expired : formatCountdown(remainingMs)}
          </div>
        ) : null}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
        <div
          aria-hidden="true"
          className={cn(
            "h-full rounded-full transition-[width,background-color] duration-500 ease-out",
            isCancelled || isUrgent || isExpired
              ? "bg-[#e11d48]"
              : isConfirmed
                ? "bg-[var(--accent)]"
                : isWarning
                  ? "bg-[#f59e0b]"
                  : "bg-[var(--action-teal)]",
          )}
          style={{
            width:
              isConfirmed || isCancelled ? "100%" : `${displayedRemainingPercent}%`,
          }}
        />
      </div>
      <p
        className={cn(
          "mt-2 text-[0.9375rem] leading-6 opacity-85",
          helperDesktopHidden && "lg:hidden",
        )}
      >
        {helperText}
      </p>
      {/* No button here: the step's action bar already carries "Change", and two
          controls for one action read as two different outcomes. The hold's
          meaning now lives in the tooltip on the label above. */}
      {!isConfirmed && !isCancelled && isUrgent && !isExpired ? (
        <div
          aria-live="polite"
          className="mt-4 rounded-2xl border border-[#fecdd3] bg-[#fff7f8] px-4 py-4 text-[var(--ink)]"
        >
          <p className="font-semibold">{t.public.stillInterestedTitle}</p>
          <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
            {canExtend || isExtending
              ? t.public.stillInterestedBody
              : extensionUsed
                ? t.public.extensionUsed
                : t.public.holdEndingCta}
          </p>
          {canExtend || isExtending ? (
            <button
              type="button"
              disabled={!isOnline || isExtending}
              onClick={onExtend}
              className="mt-3 min-h-11 rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExtending ? t.public.extendingHold : t.public.addFiveMinutes}
            </button>
          ) : null}
        </div>
      ) : null}
      {extensionMessage ? (
        <p role="status" aria-live="polite" className="mt-3 text-sm font-semibold text-[var(--accent-strong)]">
          {extensionMessage}
        </p>
      ) : null}
      {/* Expiry is a dead end unless getting back in is one tap. */}
      {isExpired && !isConfirmed && !isCancelled ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 rounded-[24px] border border-[#fecdd3] bg-[#fff7f8] px-4 py-4 text-[var(--ink)]"
        >
          <p className="text-base font-semibold tracking-[-0.01em]">
            {t.public.holdExpiredTitle}
          </p>
          <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
            {t.public.holdExpiredRecoveryBody}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {onRetryHold ? (
              <button
                type="button"
                disabled={isRetryingHold || !isOnline}
                onClick={onRetryHold}
                className="min-h-11 rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRetryingHold ? t.public.holdingAgain : t.public.holdAgain}
              </button>
            ) : null}
            {onChooseAnother ? (
              <button
                type="button"
                onClick={onChooseAnother}
                className="min-h-11 rounded-full bg-white px-5 text-sm font-semibold text-[var(--ink)] ring-1 ring-[rgba(193,198,214,0.5)] transition hover:bg-[var(--surface-soft)]"
              >
                {t.public.chooseAnotherTime}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
