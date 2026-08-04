import { cn } from "@/lib/utils";
import { formatCountdown } from "@/lib/format";
import { defaultCopy, type VerticalCopy } from "@/lib/vertical-copy";
import type { Lang } from "@/lib/types";
import { bookingTranslations } from "@/components/booking/i18n/translations";

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
  copy?: VerticalCopy;
  lang?: Lang;
}) {
  const t = bookingTranslations[lang];
  const isUrgent = remainingMs <= 2 * 60 * 1000 || isExpired;
  const isWarning = !isUrgent && remainingMs <= 5 * 60 * 1000;
  const remainingPercent = Math.max(0, Math.min(100, remainingRatio * 100));
  const displayedRemainingPercent = isExpired
    ? 100
    : Math.max(isUrgent && remainingPercent > 0 ? 8 : 0, remainingPercent);
  const statusLabel =
    lang === "en"
      ? isCancelled
        ? `${copy.Booking} cancelled`
        : isConfirmed
          ? `${copy.Booking} secured`
          : isExpired
            ? "Hold expired"
            : isUrgent || isWarning
              ? "Hold ending soon"
              : ""
      : isCancelled
        ? t.public.holdCancelled
        : isConfirmed
          ? t.public.holdSecured
          : isExpired
            ? t.public.holdExpired
            : isUrgent || isWarning
              ? t.public.holdEndingSoon
              : "";
  const helperText =
    lang === "en"
      ? isCancelled
        ? "This reservation is no longer active."
        : isConfirmed
          ? `Your ${copy.booking} is confirmed and the temporary hold is complete.`
          : isExpired
            ? t.public.expiredBody
            : "Finish your details before the temporary hold expires."
      : isCancelled
        ? t.public.holdInactiveBody
        : isConfirmed
          ? t.public.holdConfirmedBody
          : isExpired
            ? t.public.expiredBody
            : t.public.holdFinishBody;

  return (
    <section
      aria-label={lang === "en" ? `${copy.Booking} hold countdown` : t.public.holdRemaining}
      className={cn(
        "overflow-hidden px-0 py-0 transition-colors duration-300",
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
        <div>
          <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.12em]">
            {lang === "en" ? `${copy.Booking} hold` : t.public.holdLabel}
          </p>
          {statusLabel ? (
            <p className="mt-1 text-[0.9375rem] font-semibold text-[var(--ink)]">
              {statusLabel}
            </p>
          ) : null}
        </div>
        {!isConfirmed && !isCancelled ? (
          <div
            role="timer"
            aria-label={`${t.public.holdRemaining}: ${isExpired ? t.public.expired : formatCountdown(remainingMs)}`}
            className={cn(
              "shrink-0 rounded-2xl px-4 py-2 text-center font-semibold tabular-nums ring-1 transition-colors",
              isExpired
                ? "bg-[#fff1f2] text-[0.8125rem] uppercase tracking-[0.12em] ring-[#fecdd3]"
                : isUrgent
                  ? "bg-[#fff1f2] text-3xl tracking-[-0.05em] ring-[#fecdd3] sm:text-4xl"
                  : isWarning
                    ? "bg-[#fffbeb] text-3xl tracking-[-0.05em] ring-[#fde68a] sm:text-4xl"
                    : "bg-white/80 text-3xl tracking-[-0.05em] ring-black/5 sm:text-4xl",
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
              className="mt-3 min-h-11 rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
      {isExpired && onChooseAnother ? (
        <button
          type="button"
          onClick={onChooseAnother}
          className="mt-4 min-h-11 rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {t.public.chooseAnotherTime}
        </button>
      ) : null}
    </section>
  );
}
