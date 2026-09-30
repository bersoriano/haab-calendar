"use client";

import { EnvelopeSimple, Lightning, QrCode, User } from "@phosphor-icons/react";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language-provider";
import { Reveal } from "./reveal";
import { SectionHeading, lpBody, lpDisplay, lpMono } from "./primitives";

/** Reference QR tile: decorative and static, so there is nothing to hydrate. */
function QrTile({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-[14px] bg-white shadow-[0_8px_20px_rgba(26,107,224,0.15)] sm:rounded-[16px]",
        className,
      )}
    >
      <svg viewBox="0 0 21 21" fill="#0B1B2B" className="h-[76%] w-[76%]">
        <path d="M0 0h7v7H0zM1 1v5h5V1zM2 2h3v3H2zM14 0h7v7h-7zM15 1v5h5V1zM16 2h3v3h-3zM0 14h7v7H0zM1 15v5h5v-5zM2 16h3v3H2zM9 0h2v2H9zM9 3h1v3H9zM11 4h2v2h-2zM8 8h3v1H8zM12 8h2v2h-2zM16 8h2v1h-2zM19 9h2v2h-2zM0 9h2v2H0zM3 9h3v1H3zM9 11h2v2H9zM13 11h3v2h-3zM17 12h2v1h-2zM8 15h2v2H8zM11 14h2v1h-2zM14 15h3v2h-3zM18 15h3v1h-3zM9 18h3v3H9zM13 19h2v2h-2zM17 18h2v3h-2z" />
      </svg>
    </div>
  );
}

function ShareChip({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string; weight?: "regular" | "bold"; "aria-hidden"?: boolean | "true" }>;
  children: ReactNode;
}) {
  return (
    <span className="flex items-center gap-2 rounded-[9px] bg-white px-[11px] py-1.5 text-[12.5px] font-semibold text-[var(--lp-blue-800)] sm:rounded-[10px] sm:px-3 sm:py-[7px] sm:text-[13.5px]">
      <Icon aria-hidden="true" weight="bold" className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

// The three illustrations are mock UI. Each panel is aria-hidden: the step's
// heading and body, beside it, say the same thing in words.
function NamePanel() {
  const { t } = useLanguage();
  const v = t.how.visual;

  return (
    <div className="flex flex-col justify-center gap-2.5 bg-[var(--lp-mint-band)] p-4 sm:gap-3 sm:p-5">
      <div
        className={cn(
          lpMono,
          "flex h-[42px] items-center rounded-[11px] border-[1.5px] border-[#1fb39b] bg-white px-3 text-[12.5px] text-[var(--lp-subtle)] sm:h-11 sm:rounded-[12px] sm:px-3.5 sm:text-[13.5px]",
        )}
      >
        {v.urlPrefix}
        <span className="font-medium text-[var(--lp-ink)]">{v.slug}</span>
        <span className="ml-0.5 h-4 w-0.5 bg-[var(--lp-teal-600)] sm:h-[18px]" />
      </div>
      <div className="flex gap-1.5 sm:gap-2">
        {v.chips.map((chip) => (
          <span
            key={chip}
            className="rounded-full bg-white px-[9px] py-1 text-[12px] font-semibold text-[var(--lp-teal-700)] sm:px-2.5 sm:py-[5px] sm:text-[12.5px]"
          >
            ✓ {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

function SharePanel() {
  const { t } = useLanguage();
  const [bio, emails, door] = t.how.visual.share;

  return (
    <div className="flex items-center justify-between gap-3 bg-[var(--lp-blue-100)] p-4 sm:gap-4 sm:p-5">
      <div className="flex flex-col gap-1.5 sm:gap-2">
        <ShareChip icon={User}>{bio}</ShareChip>
        <ShareChip icon={EnvelopeSimple}>{emails}</ShareChip>
        <ShareChip icon={QrCode}>{door}</ShareChip>
      </div>
      <QrTile className="h-[86px] w-[86px] sm:h-24 sm:w-24" />
    </div>
  );
}

function AutopilotPanel() {
  const { t } = useLanguage();
  const v = t.how.visual;

  return (
    <div className="flex flex-col justify-center gap-2.5 bg-[var(--lp-coral-100)] p-4">
      <div className="flex items-center gap-3 rounded-[12px] bg-white px-3 py-2.5 shadow-[0_6px_16px_rgba(240,100,58,0.12)] sm:rounded-[14px] sm:px-3.5">
        <span className="flex h-[38px] w-[38px] shrink-0 flex-col items-center justify-center rounded-[10px] bg-[var(--lp-coral-600)] leading-none text-[var(--lp-coral-ink)] sm:h-10 sm:w-10">
          <span className="text-[9.5px] font-bold sm:text-[10px]">{v.eventDay}</span>
          <span className="text-[15px] font-extrabold sm:text-[16px]">{v.eventDate}</span>
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[14px] font-bold leading-[1.25] text-[var(--lp-ink)] sm:text-[14.5px]">
            {v.eventTitle}
          </span>
          <span className="line-clamp-2 text-[12.5px] leading-[1.3] text-[var(--lp-subtle)] sm:text-[13px]">
            {v.eventMeta}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--lp-coral-700)] sm:text-[13px]">
        <Lightning aria-hidden="true" weight="bold" className="h-3.5 w-3.5 shrink-0" />
        {v.added}
      </div>
    </div>
  );
}

const STEPS = [
  { Panel: NamePanel, color: "text-[var(--lp-teal-600)]" },
  { Panel: SharePanel, color: "text-[var(--lp-blue-700)]" },
  { Panel: AutopilotPanel, color: "text-[var(--lp-coral-700)]" },
];

/**
 * Setup as three cards, each with a small illustration of the step. The order
 * is a real sequence, so the numbering stays; it is carried by the "Step 01"
 * marker (a large numeral beside the title on phones).
 */
export function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section
      id="how"
      className={cn(lpBody, "scroll-mt-24 bg-[var(--lp-paper)] px-5 py-[72px] sm:px-8 lg:py-[120px]")}
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 lg:gap-14">
        <SectionHeading layout="centered" eyebrow={t.how.eyebrow} title={t.how.title} />
        <Reveal>
          <ol className="grid grid-cols-[minmax(0,1fr)] gap-3.5 lg:grid-cols-3 lg:gap-6">
            {t.how.steps.map((step, index) => {
              const { Panel, color } = STEPS[index];
              const number = String(index + 1).padStart(2, "0");

              return (
                <li
                  key={step.title}
                  className="flex flex-col gap-[18px] rounded-[22px] border border-[var(--lp-line)] bg-white p-5 sm:gap-6 sm:rounded-[28px] sm:p-8"
                >
                  <div
                    aria-hidden="true"
                    className="flex sm:h-[150px] flex-col overflow-hidden rounded-[16px] sm:rounded-[20px] [&>*]:flex-grow"
                  >
                    <Panel />
                  </div>
                  <div className="flex items-start gap-3.5 sm:block">
                    <span
                      aria-hidden="true"
                      className={cn(lpDisplay, "text-[28px] font-extrabold leading-none sm:hidden", color)}
                    >
                      {number}
                    </span>
                    <div className="flex flex-col gap-1.5 sm:gap-2.5">
                      <p
                        className={cn(
                          lpDisplay,
                          "hidden text-[15px] font-bold uppercase tracking-[0.04em] sm:block",
                          color,
                        )}
                      >
                        {t.how.stepLabel} {number}
                      </p>
                      <h3
                        className={cn(
                          lpDisplay,
                          "text-[22px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--lp-ink)] sm:text-[28px] sm:tracking-[-0.025em]",
                        )}
                      >
                        <span className="sr-only sm:hidden">
                          {t.how.stepLabel} {number}.{" "}
                        </span>
                        {step.title}
                      </h3>
                      <p className="text-[15px] leading-[1.5] text-[var(--lp-muted)] sm:text-[16.5px] sm:leading-[1.55]">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
