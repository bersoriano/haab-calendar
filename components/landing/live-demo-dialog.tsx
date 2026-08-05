"use client";

import { useId } from "react";

import { LandingDialog } from "./landing-dialog";
import { useLanguage } from "./language-provider";

// The demo is the seeded public page itself, embedded. Same origin, so it runs
// the real booking flow — holds included — without leaving the landing page.
const DEMO_PATH = "/doctors/dr-maya-rivera";

export function LiveDemoDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { lang, t } = useLanguage();
  const copy = t.demoDialog;
  const titleId = useId();

  return (
    <LandingDialog
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      closeLabel={copy.close}
      className="h-[92vh] max-w-[860px] sm:h-[86vh]"
    >
      <div className="border-b border-[var(--line)] px-5 py-4 pr-14 sm:px-6">
        <h2
          id={titleId}
          className="text-lg font-semibold tracking-tight text-[var(--ink)] sm:text-xl"
        >
          {copy.title}
        </h2>
        <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)] sm:text-[13px]">
          {copy.steps.map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              {index > 0 ? (
                <span aria-hidden="true" className="text-[var(--line)]">
                  →
                </span>
              ) : null}
              <span className="font-medium text-[var(--ink)]">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Mounted only while open: no hidden iframe cost on first paint. */}
      <iframe
        src={`${DEMO_PATH}?lang=${lang}`}
        title={copy.frameTitle}
        className="min-h-0 w-full flex-1 border-0 bg-[var(--background)]"
      />

      <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-3 sm:px-6">
        <p className="text-xs text-[var(--muted)]">{copy.disclaimer}</p>
        <a
          href={`${DEMO_PATH}?lang=${lang}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-xs font-semibold text-[var(--primary)] hover:underline sm:text-sm"
        >
          {copy.openFull}
        </a>
      </div>
    </LandingDialog>
  );
}
