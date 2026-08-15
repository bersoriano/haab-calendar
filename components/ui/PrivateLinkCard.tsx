import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/types";
import { bookingTranslations } from "@/components/booking/i18n/translations";

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
  showOpenLink = true,
  className,
}: {
  url: string;
  lang?: Lang;
  copied?: boolean;
  onCopy?: () => void;
  /** Hidden on the management page itself — the visitor is already there. */
  showOpenLink?: boolean;
  className?: string;
}) {
  const t = bookingTranslations[lang];

  return (
    <section
      aria-label={t.publicFlow.managementUrlLabel}
      className={cn(
        // Opaque rather than a translucent tint: this block sits over the public
        // page's own gradient, where a wash disappears and the one durable thing
        // on the screen stops looking like a section of its own.
        "rounded-[28px] bg-[linear-gradient(135deg,#eaf2fe,#e7faf5)] p-5 ring-1 ring-[rgba(26,115,232,0.22)] shadow-[0_18px_40px_rgba(15,23,42,0.07)]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-[var(--accent-strong)] ring-1 ring-[rgba(255,255,255,0.9)]"
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
          className="w-full min-w-0 flex-1 rounded-2xl border border-[rgba(255,255,255,0.9)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--ink)] [font-family:var(--font-plex-mono)] sm:min-w-[240px]"
        />
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="min-h-11 shrink-0 rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {copied ? t.publicFlow.copied : t.publicFlow.copyLink}
          </button>
        ) : null}
        {showOpenLink ? (
          <a
            href={url}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[var(--ink)] ring-1 ring-[rgba(193,198,214,0.5)] transition hover:bg-[var(--surface-soft)]"
          >
            {t.publicFlow.openPrivateLink}
          </a>
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
