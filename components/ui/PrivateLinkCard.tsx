import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/types";
import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
import { shortenManageUrl } from "@/lib/success-copy";

/**
 * The private management link is the client's only key to this booking — there
 * is no account to log back into. So it gets a card of its own, with the promise
 * spelled out, rather than a footnote under the buttons.
 */
export function PrivateLinkCard({
  url,
  lang = "en",
  copied = false,
  onCopy,
  variant = "classic",
  bookingNoun = "booking",
  className,
}: {
  url: string;
  lang?: Lang;
  copied?: boolean;
  onCopy?: () => void;
  /**
   * `refined` is the dedicated page's card: a lock tile, one merged sentence and
   * a field that shortens the link in the middle so the token is never the part
   * that gets cut off. `classic` is the original and stays the default.
   */
  variant?: "classic" | "refined";
  /** The vertical's noun, for "manage the appointment". Refined only. */
  bookingNoun?: string;
  className?: string;
}) {
  const t = bookingTranslations[lang];

  if (variant === "refined") {
    // Buttons carry `!` on their type: globals.css resets `font` on buttons
    // outside any layer, which outranks every layered utility.
    const pill =
      "inline-flex h-[46px] items-center justify-center whitespace-nowrap rounded-full px-4 !text-[14.5px] !font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:h-12 lg:px-5";

    return (
      <section
        aria-label={t.publicFlow.managementUrlLabel}
        className={cn(
          "flex flex-col gap-3 rounded-3xl bg-[var(--surface)] p-[18px] ring-1 ring-[var(--line)] lg:gap-3.5 lg:rounded-[28px] lg:px-[26px] lg:py-6",
          className,
        )}
      >
        <div className="flex items-center gap-3 lg:gap-3.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[var(--tile-blue)] text-[var(--link)] lg:h-10 lg:w-10 lg:rounded-xl"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-[15.5px] font-semibold text-[var(--ink)] lg:text-base">
              {t.publicFlow.linkTitle}
            </p>
            <p className="hidden text-sm leading-[1.5] text-[var(--muted)] lg:block">
              {fillTemplate(t.publicFlow.linkBody, { booking: bookingNoun })}
            </p>
          </div>
        </div>
        <p className="text-[13.5px] leading-[1.5] text-[var(--muted)] lg:hidden">
          {t.publicFlow.linkBodyShort}
        </p>

        <div className="flex flex-col gap-2.5 lg:flex-row">
          {/* A plain box, not an <input>: an input can only clip the end of a
              value, and the end is the token. The full address is in the
              accessible text, in `title`, and is what Copy uses. */}
          <div
            title={url}
            className="flex min-h-12 min-w-0 flex-1 items-center rounded-[14px] border border-[var(--form-border)] bg-[var(--surface-lowest)] px-3.5 py-3 text-[12.5px] text-[var(--ink-secondary)] [font-family:var(--font-plex-mono)] lg:px-4 lg:py-0 lg:text-[13.5px]"
          >
            <span className="sr-only">{url}</span>
            <span aria-hidden="true" className="min-w-0 break-all lg:hidden">
              {shortenManageUrl(url, 34)}
            </span>
            <span aria-hidden="true" className="hidden min-w-0 break-all lg:inline">
              {shortenManageUrl(url, 64)}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 lg:flex">
            {onCopy ? (
              <button
                type="button"
                onClick={onCopy}
                className={cn(pill, "bg-[var(--link)] text-[var(--on-primary)] hover:opacity-90 lg:px-[22px]")}
              >
                {copied ? t.publicFlow.copied : t.publicFlow.copyLink}
              </button>
            ) : null}
          </div>
        </div>
        <span className="sr-only" aria-live="polite">
          {copied ? t.publicFlow.manageLinkCopied : ""}
        </span>
      </section>
    );
  }

  return (
    <section
      aria-label={t.publicFlow.managementUrlLabel}
      className={cn(
        // The same glass as the page header, so the two read as one surface and
        // both follow whatever theme is set. A fixed colour here sat outside
        // the palette and stayed light even on the dark theme.
        "rounded-[28px] border border-[rgba(255,255,255,0.6)] bg-[var(--panel-glass-55)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_42px_rgba(25,28,29,0.07)] backdrop-blur-[20px] [-webkit-backdrop-filter:blur(20px)]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--panel-glass-72)] text-[var(--accent-strong)] ring-1 ring-[rgba(255,255,255,0.9)]"
        >
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden>
            <path
              d="M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold tracking-[-0.01em] text-[var(--ink)]">
            {t.publicFlow.saveThisLinkTitle}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            {t.publicFlow.saveThisLinkTagline}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          readOnly
          value={url}
          aria-label={t.publicFlow.managementUrlLabel}
          onFocus={(event) => event.currentTarget.select()}
          className="w-full min-w-0 flex-1 rounded-2xl border border-[rgba(255,255,255,0.9)] bg-[var(--surface-lowest)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] [font-family:var(--font-plex-mono)] sm:min-w-[240px]"
        />
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="min-h-11 shrink-0 rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] transition hover:opacity-90"
          >
            {copied ? t.publicFlow.copied : t.publicFlow.copyLink}
          </button>
        ) : null}
        <span className="sr-only" aria-live="polite">
          {copied ? t.publicFlow.manageLinkCopied : ""}
        </span>
      </div>

      <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
        {t.publicFlow.saveThisLinkBody}
      </p>
    </section>
  );
}
