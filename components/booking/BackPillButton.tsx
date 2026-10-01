import { cn } from "@/lib/utils";

/** The pill that steps the visitor back one screen, e.g. "Change date/time" on the details step. */
export function BackPillButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--panel-tint-78)] px-3.5 text-[0.8125rem] font-semibold text-[var(--ink)] ring-1 ring-[rgba(193,198,214,0.42)] transition hover:bg-[var(--surface-lowest)] hover:ring-[var(--accent)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path
          d="M15 6l-6 6 6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {label}
    </button>
  );
}
