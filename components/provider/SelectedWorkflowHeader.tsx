import { translations, type Lang } from "@/components/landing/translations";
import type { VerticalId } from "@/lib/types";

export function SelectedWorkflowHeader({
  lang,
  onChooseAnother,
  onSignOut,
  userEmail,
  vertical,
}: {
  lang: Lang;
  onChooseAnother: () => void;
  onSignOut?: () => void | Promise<void>;
  userEmail?: string;
  vertical: VerticalId;
}) {
  const copy = translations[lang].home;
  const verticalCopy = copy.verticals[vertical];

  return (
    <div
      aria-label={copy.selectedWorkflow}
      className="flex w-full flex-col gap-4 rounded-[24px] border border-[var(--line)] bg-[var(--surface-lowest)] px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--primary),var(--teal))] text-sm font-bold text-white shadow-[0_10px_24px_rgba(26,115,232,0.24)]"
        >
          {verticalCopy.label.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
            {copy.selectedWorkflow}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-base font-semibold text-[var(--ink)] sm:text-lg">
              {verticalCopy.label}
            </p>
            <p className="text-sm text-[var(--muted)]">{verticalCopy.tagline}</p>
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--muted)] sm:text-sm">
            {copy.selectedWorkflowHint}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        {userEmail ? (
          <span className="w-full break-all px-1 text-xs text-[var(--muted)] sm:w-auto sm:max-w-56 sm:text-right">
            {userEmail}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onChooseAnother}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          {copy.chooseAnotherWorkflow}
        </button>
        {onSignOut ? (
          <form action={onSignOut}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              {copy.signOut}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
