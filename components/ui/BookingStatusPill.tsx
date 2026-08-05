import { cn } from "@/lib/utils";
import type { BookingStatus, Lang } from "@/lib/types";
import { bookingTranslations } from "@/components/booking/i18n/translations";

/**
 * The one thing a client wants from a management link: is this booking still on?
 * A dot + word, always in the same place, in the status colour.
 */
export function BookingStatusPill({
  status,
  lang = "en",
  className,
}: {
  status: BookingStatus;
  lang?: Lang;
  className?: string;
}) {
  const t = bookingTranslations[lang];
  const label =
    status === "cancelled"
      ? t.publicFlow.statusCancelled
      : status === "rescheduled"
        ? t.publicFlow.statusUpdated
        : t.publicFlow.statusConfirmed;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold ring-1",
        status === "cancelled"
          ? "bg-[#fff1f2] text-[#be123c] ring-[rgba(254,205,211,0.9)]"
          : status === "rescheduled"
            ? "bg-[#fffbeb] text-[#92400e] ring-[rgba(253,230,138,0.9)]"
            : "bg-[rgba(104,250,221,0.2)] text-[var(--action-teal-deep)] ring-[rgba(0,191,165,0.28)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 rounded-full",
          status === "cancelled"
            ? "bg-[#e11d48]"
            : status === "rescheduled"
              ? "bg-[#f59e0b]"
              : "bg-[var(--action-teal)]",
        )}
      />
      {label}
    </span>
  );
}
