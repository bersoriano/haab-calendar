import Link from "next/link";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

// `!` on the type: globals.css resets `font` on buttons outside any layer,
// which outranks every layered utility.
const base =
  "inline-flex items-center justify-center rounded-full px-[22px] !text-[15px] !font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 lg:!text-[14.5px]";

/**
 * "Need to change something?" and the three things a visitor can do about it.
 * The handlers and the rules for when each is offered are the caller's, as
 * before: this only decides how they look. Stacked full width on a phone.
 */
export function SuccessActions({
  canReschedule,
  isCancelled,
  cancelLabel,
  onReschedule,
  onCancel,
  bookAnotherHref,
  onBookAnother,
  lang = "en",
}: {
  /** Single-occurrence services cannot be moved, so they do not offer it. */
  canReschedule: boolean;
  isCancelled: boolean;
  /** The vertical's "Cancel appointment". */
  cancelLabel: string;
  onReschedule: () => void;
  onCancel: () => void;
  /** With a manage token, "Book another" is a link back to the booking page. */
  bookAnotherHref?: string;
  onBookAnother?: () => void;
  lang?: Lang;
}) {
  const t = bookingTranslations[lang];
  // Once cancelled, booking again is the one thing left to do, so it leads.
  const bookAnotherClass = isCancelled
    ? "h-12 bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] text-[var(--on-primary)] shadow-[0_12px_26px_rgba(26,115,232,0.28)] hover:saturate-125 lg:h-[46px]"
    : "h-11 bg-transparent text-[var(--link)] hover:bg-[var(--accent-soft)] lg:h-[46px]";

  return (
    <section className="flex flex-col gap-2.5 rounded-3xl bg-[rgba(248,249,250,0.75)] p-[18px] ring-1 ring-[rgba(255,255,255,0.9)] lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:rounded-[26px] lg:bg-[rgba(248,249,250,0.72)] lg:py-[18px] lg:pl-7 lg:pr-[22px]">
      <p className="text-sm font-medium text-[var(--ink-secondary)] lg:text-[15px]">
        {t.publicFlow.actionsNeedChange}
      </p>
      <div className="flex flex-col gap-2.5 lg:flex-row">
        {canReschedule ? (
          <button
            type="button"
            disabled={isCancelled}
            onClick={onReschedule}
            className={cn(
              base,
              "h-12 border border-[var(--form-border)] bg-[var(--surface-lowest)] text-[var(--ink)] hover:bg-[var(--surface-soft)] lg:h-[46px]",
            )}
          >
            {t.publicFlow.reschedule}
          </button>
        ) : null}
        <button
          type="button"
          disabled={isCancelled}
          onClick={onCancel}
          className={cn(
            base,
            "h-12 border border-[var(--danger-line)] bg-[var(--danger-soft)] text-[var(--danger-strong)] hover:opacity-90 lg:h-[46px]",
          )}
        >
          {cancelLabel}
        </button>
        {bookAnotherHref ? (
          <Link href={bookAnotherHref} className={cn(base, bookAnotherClass)}>
            {t.publicFlow.bookAnother}
          </Link>
        ) : (
          <button type="button" onClick={onBookAnother} className={cn(base, bookAnotherClass)}>
            {t.publicFlow.bookAnother}
          </button>
        )}
      </div>
    </section>
  );
}
