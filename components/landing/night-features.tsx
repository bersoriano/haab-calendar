"use client";

import { Lock } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language-provider";
import { Reveal } from "./reveal";
import { SectionHeading, lpBody, lpDisplay, lpMono } from "./primitives";

const modePills = [
  "bg-[rgba(31,209,178,0.18)] text-[var(--lp-mint-300)]",
  "bg-[rgba(90,160,255,0.2)] text-[#a9cbff]",
  "bg-[rgba(255,122,89,0.2)] text-[#ffb59f]",
];

function ModesVisual() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-1.5 sm:gap-2">
      {t.features.modes.map((mode, index) => (
        <div
          key={mode.label}
          className="flex items-center justify-between gap-3 rounded-[11px] bg-[var(--lp-night-3)] px-3 py-2.5 sm:rounded-[12px] sm:px-3.5 sm:py-3"
        >
          <span className="text-[13.5px] font-semibold sm:text-[14.5px]">{mode.label}</span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-[3px] text-[11.5px] font-bold sm:px-[9px] sm:text-[12px]",
              modePills[index],
            )}
          >
            {mode.pill}
          </span>
        </div>
      ))}
    </div>
  );
}

function LanguageVisual() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col justify-center gap-3 lg:min-h-[148px]">
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {t.features.words.map((word, index) => (
          <span
            key={word}
            className={cn(
              "rounded-full px-3 py-[7px] text-[14px] font-semibold sm:px-3.5 sm:py-2 sm:text-[15px]",
              index === 0
                ? "bg-[var(--lp-teal-400)] font-bold text-[var(--lp-teal-on-400)]"
                : "border border-[var(--lp-night-line-2)] text-[var(--lp-night-ink)]",
            )}
          >
            {word}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2.5 text-[14px] text-[var(--lp-night-muted)]">
        <span className="flex gap-0.5 rounded-full bg-[var(--lp-night-3)] p-[3px]">
          <span className="rounded-full bg-white px-2.5 py-1 text-[12px] font-bold text-[var(--lp-night)]">
            EN
          </span>
          <span className="rounded-full px-2.5 py-1 text-[12px] font-bold text-[var(--lp-night-ink)]">
            ES
          </span>
        </span>
        {t.features.wordsExample}
      </div>
    </div>
  );
}

function SelfServiceVisual() {
  const { t } = useLanguage();
  const s = t.features.selfService;

  return (
    <div className="flex flex-col justify-center gap-3 rounded-[14px] bg-[var(--lp-night-3)] p-3.5 sm:rounded-[16px] sm:p-4 lg:min-h-[148px]">
      <div className="flex items-center gap-2 text-[12.5px] text-[var(--lp-night-muted)] sm:text-[13px]">
        <Lock aria-hidden="true" weight="bold" className="h-3.5 w-3.5 shrink-0" />
        {s.lock}
      </div>
      <div className="text-[14.5px] font-bold sm:text-[15px]">{s.when}</div>
      <div className="flex gap-2">
        <span className="rounded-[10px] bg-white px-3 py-[7px] text-[13px] font-bold text-[var(--lp-night)] sm:px-3.5 sm:py-2 sm:text-[13.5px]">
          {s.reschedule}
        </span>
        <span className="rounded-[10px] border border-[var(--lp-night-line-2)] px-3 py-[7px] text-[13px] font-semibold text-[var(--lp-night-ink)] sm:px-3.5 sm:py-2 sm:text-[13.5px]">
          {s.cancel}
        </span>
      </div>
    </div>
  );
}

function NightCard({
  illustration,
  label,
  title,
  body,
}: {
  illustration: ReactNode;
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-[22px] border border-[var(--lp-night-line)] bg-[var(--lp-night-2)] p-[22px] md:flex-row md:items-center md:gap-8 lg:flex-col lg:items-stretch lg:gap-7 lg:rounded-[28px] lg:p-8">
      {/* Mock UI: the label, title and body beside it carry the meaning. */}
      <div aria-hidden="true" className="md:flex-1 lg:flex-none">
        {illustration}
      </div>
      <div className="flex flex-col gap-2 md:flex-1 lg:flex-none lg:gap-2.5">
        <p className={cn(lpMono, "text-[11px] uppercase tracking-[0.14em] text-[var(--lp-night-muted)] sm:text-[12px]")}>
          {label}
        </p>
        <h3
          className={cn(
            lpDisplay,
            "text-[22px] font-bold leading-[1.15] tracking-[-0.02em] lg:text-[26px] lg:leading-[1.12]",
          )}
        >
          {title}
        </h3>
        <p className="text-[15px] leading-[1.55] text-[var(--lp-night-text)] lg:text-[16px]">{body}</p>
      </div>
    </div>
  );
}

/**
 * "Why it feels different": the page's one dark band. Three cards, each with a
 * small illustration; the existing label, title and body copy sit beside it.
 */
export function Features() {
  const { t } = useLanguage();
  const visuals = [<ModesVisual key="modes" />, <LanguageVisual key="language" />, <SelfServiceVisual key="self" />];

  return (
    <section
      id="features"
      className={cn(
        lpBody,
        "relative scroll-mt-24 overflow-hidden bg-[var(--lp-night)] px-5 py-[72px] text-white sm:px-8 lg:py-[120px]",
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[220px] left-1/2 h-[440px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(31,209,178,0.18),transparent)] lg:-top-[300px] lg:h-[600px] lg:w-[900px]"
      />
      <div className="relative mx-auto flex max-w-[1200px] flex-col gap-8 lg:gap-14">
        <SectionHeading
          night
          eyebrow={t.features.eyebrow}
          title={t.features.title}
          className="[&_h2]:max-w-[720px]"
        />
        <Reveal>
          <div className="grid gap-3.5 lg:grid-cols-3 lg:gap-5">
            {t.features.items.map((item, index) => (
              <NightCard
                key={item.title}
                illustration={visuals[index]}
                label={item.tag}
                title={item.title}
                body={item.body}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
