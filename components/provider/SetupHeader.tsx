import Link from "next/link";

import { BrandMark, Button, focusRing } from "@/components/app-ui";
import { translations, type Lang } from "@/components/landing/translations";
import type { VerticalId } from "@/lib/types";
import { cn } from "@/lib/utils";

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
    <header className="sticky top-0 z-50 border-b border-app-border bg-app-surface">
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Haab Calendar"
          className={cn("flex min-h-11 shrink-0 items-center gap-2.5 rounded-md", focusRing)}
        >
          <BrandMark />
          <span className="hidden text-sm font-bold text-app-fg sm:inline">Haab Calendar</span>
        </Link>

        {verticalCopy ? (
          <div role="group" aria-label={copy.selectedWorkflow} className="min-w-0 flex-1 border-l border-app-border pl-4">
            <p className="text-xs font-medium text-app-fg-muted">{copy.selectedWorkflow}</p>
            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-semibold text-app-fg">{verticalCopy.label}</span>
              <span className="text-app-fg-muted">{verticalCopy.tagline}</span>
            </p>
            <p className="mt-0.5 hidden text-xs text-app-fg-muted lg:block">{copy.selectedWorkflowHint}</p>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {verticalCopy ? (
            <Button variant="plain" onClick={onChooseAnother}>
              {copy.chooseAnotherWorkflow}
            </Button>
          ) : (
            <Button variant="plain" onClick={onBackToHome}>
              {copy.backToHome}
            </Button>
          )}
          {userEmail ? (
            <span className="max-w-56 truncate px-1 text-xs text-app-fg-muted" title={userEmail}>
              {userEmail}
            </span>
          ) : null}
          {onSignOut ? (
            <form action={onSignOut}>
              <Button type="submit" variant="secondary">
                {copy.signOut}
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </header>
  );
}
