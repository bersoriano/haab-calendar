"use client";

import { useId, useState } from "react";

import { generateSlug, getPublicVerticalSegment } from "@/lib/public-url";
import { cn } from "@/lib/utils";
import { LandingDialog } from "./landing-dialog";
import { useLanguage } from "./language-provider";
import type { LandingVertical } from "./landing-ui";

const VERTICAL_ORDER: LandingVertical[] = [
  "healthcare",
  "spaces",
  "professional",
  "events",
];

const VERTICAL_GLYPHS: Record<LandingVertical, string> = {
  healthcare: "+",
  spaces: "▦",
  professional: "↗",
  events: "★",
};

// First step of provider onboarding: pick what you book, name the page, see the
// link appear. Everything else (services, hours, publishing) happens after.
export function StartPageDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (vertical: LandingVertical, pageName: string) => void;
}) {
  const { t } = useLanguage();
  const copy = t.startDialog;
  const titleId = useId();
  const nameId = useId();
  const [vertical, setVertical] = useState<LandingVertical | null>(null);
  const [pageName, setPageName] = useState("");

  const trimmedName = pageName.trim();
  const previewSlug = generateSlug(trimmedName || copy.namePlaceholder);
  const previewSegment = getPublicVerticalSegment(vertical ?? "healthcare");

  return (
    <LandingDialog
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      closeLabel={copy.close}
      className="max-w-[540px]"
    >
      <form
        className="overflow-y-auto p-6 sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (!vertical) return;
          onSubmit(vertical, trimmedName);
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--primary)]">
          {copy.eyebrow}
        </p>
        <h2
          id={titleId}
          className="mt-2 text-balance text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl"
        >
          {copy.title}
        </h2>

        <fieldset className="mt-6">
          <legend className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            {copy.stepVertical}
          </legend>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {VERTICAL_ORDER.map((id) => {
              const chosen = vertical === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={chosen}
                  onClick={() => setVertical(id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-2xl border p-3 text-left transition",
                    chosen
                      ? "border-[var(--accent)] bg-white ring-2 ring-[rgba(26,115,232,0.16)]"
                      : "border-[var(--line)] bg-[var(--surface-soft)] hover:border-[rgba(26,115,232,0.4)]",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-bold transition",
                      chosen
                        ? "bg-[var(--accent-soft)] text-[var(--primary)]"
                        : "bg-white text-[var(--muted)]",
                    )}
                  >
                    {VERTICAL_GLYPHS[id]}
                  </span>
                  <span className="text-[13px] font-semibold leading-4 text-[var(--ink)]">
                    {t.home.verticals[id].label}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5">
          <label
            htmlFor={nameId}
            className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]"
          >
            {copy.stepName}
          </label>
          <input
            id={nameId}
            data-autofocus
            value={pageName}
            onChange={(event) => setPageName(event.target.value)}
            maxLength={60}
            autoComplete="organization"
            placeholder={copy.namePlaceholder}
            className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-base font-medium text-[var(--ink)] outline-none transition placeholder:text-[rgba(95,99,104,0.55)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(26,115,232,0.16)]"
          />
        </div>

        {/* The payoff: the link exists before any form does. */}
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
          <span className="haab-live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--teal)]" aria-hidden="true" />
          <span className="truncate font-mono text-xs text-[var(--muted)] sm:text-[13px]">
            haab.app/{previewSegment}/
            <span
              className={
                trimmedName
                  ? "font-semibold text-[var(--ink)]"
                  : "text-[rgba(95,99,104,0.55)]"
              }
            >
              {previewSlug}
            </span>
          </span>
        </div>

        <button
          type="submit"
          disabled={!vertical}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] px-6 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(26,115,232,0.28)] transition hover:shadow-[0_18px_40px_rgba(26,115,232,0.34)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
        >
          {vertical ? copy.submit : copy.submitDisabled}
        </button>
        <p className="mt-3 text-center text-xs text-[var(--muted)]">{copy.fineprint}</p>
      </form>
    </LandingDialog>
  );
}
