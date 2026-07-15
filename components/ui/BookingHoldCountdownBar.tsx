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
  copy = defaultCopy,
  lang = "en",
}: {
  isCancelled?: boolean;
  isConfirmed?: boolean;
  isExpired: boolean;
  remainingMs: number;
  remainingRatio: number;
  helperDesktopHidden?: boolean;
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
            ? copy.phrases.serviceUnavailableBody
            : "Finish your details before the temporary hold expires."
      : isCancelled
        ? t.public.holdInactiveBody
        : isConfirmed
          ? t.public.holdConfirmedBody
          : isExpired
            ? copy.phrases.serviceUnavailableBody
            : t.public.holdFinishBody;

  return (
    <div
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
          <p
            className={cn(
              "font-semibold tabular-nums",
              isExpired
                ? "text-[0.8125rem] uppercase tracking-[0.12em]"
                : "text-2xl tracking-[-0.04em]",
            )}
          >
            {isExpired ? t.public.expired : formatCountdown(remainingMs)}
          </p>
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
    </div>
  );
}
