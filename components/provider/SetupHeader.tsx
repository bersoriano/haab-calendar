import Link from "next/link";
import { translations, type Lang } from "@/components/landing/translations";
import type { VerticalId } from "@/lib/types";

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-lowest)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2";

/**
 * The one header above first-run setup and the guest page builder: where you
 * are (the chosen workflow), how to change it, and who is signed in. Replaces
 * the hero headline, the workflow card and the module's own header that used
 * to stack here.
 */
export function SetupHeader({
  lang,
  vertical,
  userEmail,
  onChooseAnother,
  onBackToHome,
  onSignOut,
}: {
  lang: Lang;
  vertical?: VerticalId;
  userEmail?: string;
  onChooseAnother: () => void;
  onBackToHome: () => void;
  onSignOut?: () => void | Promise<void>;
}) {
  const copy = translations[lang].home;
  const verticalCopy = vertical ? copy.verticals[vertical] : undefined;

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)]/60 bg-[var(--background)]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Haab Calendar"
          className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <span
            aria-hidden="true"
            className="relative grid h-9 w-9 place-items-center rounded-xl bg-[var(--primary)] text-base font-extrabold text-white shadow-[0_10px_24px_rgba(0,91,191,0.24)]"
          >
            H
            <span className="absolute -right-[3px] -top-[3px] h-[10px] w-[10px] rounded-full border-2 border-[var(--background)] bg-[var(--teal)]" />
          </span>
          <span className="hidden text-base font-bold tracking-[-0.02em] text-[var(--ink)] sm:inline">
            Haab Calendar
          </span>
        </Link>

        {verticalCopy ? (
          <div
            aria-label={copy.selectedWorkflow}
            className="min-w-0 flex-1 border-l border-[var(--line)]/70 pl-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
              {copy.selectedWorkflow}
            </p>
            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-semibold text-[var(--ink)]">{verticalCopy.label}</span>
              <span className="text-[var(--muted)]">{verticalCopy.tagline}</span>
            </p>
            <p className="mt-0.5 hidden text-xs text-[var(--muted)] lg:block">
              {copy.selectedWorkflowHint}
            </p>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {verticalCopy ? (
            <button type="button" onClick={onChooseAnother} className={buttonClass}>
              {copy.chooseAnotherWorkflow}
            </button>
          ) : (
            <button type="button" onClick={onBackToHome} className={buttonClass}>
              {copy.backToHome}
            </button>
          )}
          {userEmail ? (
            <span className="max-w-56 truncate px-1 text-xs text-[var(--muted)]" title={userEmail}>
              {userEmail}
            </span>
          ) : null}
          {onSignOut ? (
            <form action={onSignOut}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              >
                {copy.signOut}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </header>
  );
}
