"use client";

import Link from "next/link";
import { ArrowsLeftRight, Lock, ToggleRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language-provider";
import { Reveal } from "./reveal";
import { Eyebrow, IconTile, lpBody, lpDisplay } from "./primitives";

const ITEM_ICONS = [
  { icon: ToggleRight, tone: "blue-soft" as const },
  { icon: ArrowsLeftRight, tone: "mint-soft" as const },
  { icon: Lock, tone: "coral-soft" as const },
];

/**
 * What Google would show versus what stays in Haab. Mock UI, so the whole
 * illustration is aria-hidden; the section's paragraphs say the same in words.
 */
function DisclosureVisual() {
  const { t } = useLanguage();
  const v = t.googleIntegration.visual;

  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-3 rounded-[22px] bg-[var(--lp-blue-50)] p-4 sm:flex-row sm:items-stretch sm:gap-5 sm:rounded-[28px] sm:p-8"
    >
      <div className="flex flex-1 flex-col gap-2 rounded-[16px] bg-white p-4 shadow-[0_12px_28px_rgba(26,107,224,0.12)] sm:gap-3 sm:rounded-[20px] sm:p-5">
        <div className="flex items-center justify-between gap-3 text-[12px] font-bold tracking-[0.04em] text-[var(--lp-muted)] sm:text-[13px]">
          <span className="uppercase">{v.calendar}</span>
          <span className="font-medium text-[var(--lp-subtle)]">{v.day}</span>
        </div>
        <div className="flex flex-col gap-1.5 text-[11.5px] text-[#98a2b3] sm:text-[12px]">
          <div className="flex items-start gap-2.5">
            <span className="w-9 shrink-0 pt-1.5 sm:w-10">8 AM</span>
            <span className="flex-1 rounded-lg bg-[#f2f4f7] px-2.5 py-1.5 text-[12px] text-[var(--lp-subtle)] sm:text-[12.5px]">
              {v.busy}
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-9 shrink-0 pt-2 sm:w-10">9 AM</span>
            <span className="flex-1 rounded-lg bg-[var(--lp-teal-600)] px-2.5 py-2 text-[13px] font-bold text-white sm:text-[13.5px]">
              {v.event}
              <span className="mt-0.5 block text-[11.5px] font-medium text-[var(--lp-mint-100)] sm:text-[12px]">
                {v.eventNote}
              </span>
            </span>
          </div>
          {["10 AM", "11 AM"].map((hour) => (
            <div key={hour} className="hidden items-start gap-2.5 sm:flex">
              <span className="w-10 shrink-0 pt-2">{hour}</span>
              <span className="h-[34px] flex-1 rounded-lg border border-dashed border-[#d0d5dd]" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2.5 rounded-[16px] bg-[var(--lp-night)] p-4 text-white sm:w-[200px] sm:gap-3 sm:rounded-[20px] sm:p-5">
        <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.04em] text-[var(--lp-mint-300)] sm:text-[12.5px]">
          <Lock weight="bold" className="h-3.5 w-3.5" />
          {v.stays}
        </span>
        <div className="flex flex-wrap gap-1.5 sm:flex-col sm:gap-2.5">
          {v.fields.map((field) => (
            <span
              key={field}
              className="rounded-[9px] bg-[var(--lp-night-3)] px-2.5 py-1.5 text-[13px] text-[var(--lp-night-ink)] sm:rounded-[10px] sm:px-3 sm:py-[9px] sm:text-[14px]"
            >
              {field}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The Google Calendar integration, explained on the home page.
 *
 * Not a marketing section. Google's OAuth review reads the home page of any app
 * requesting a sensitive scope and checks that the page explains what the app
 * does and why it needs that access; this one was rejected for "does not
 * explain the purpose of your app" while the page said nothing about Google at
 * all. The claims here mirror lib/legal/content.ts and the behaviour in
 * lib/google/, and components/landing/__tests__/google-disclosure.test.tsx
 * pins the parts the review depends on. The words are the reviewed copy; only
 * the layout around them is designed.
 */
export function GoogleIntegration() {
  const { lang, t } = useLanguage();

  return (
    <section
      id="google-calendar"
      className={cn(lpBody, "scroll-mt-24 bg-white px-5 py-[72px] sm:px-8 lg:py-[120px]")}
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-7 lg:gap-14">
        <div className="grid items-center gap-7 lg:grid-cols-2 lg:gap-[72px]">
          <div className="flex flex-col gap-3.5 lg:gap-[22px]">
            <Eyebrow tone="blue">{t.googleIntegration.eyebrow}</Eyebrow>
            <h2
              className={cn(
                lpDisplay,
                "text-balance text-[36px] font-bold leading-[1.05] tracking-[-0.035em] text-[var(--lp-ink)] sm:text-[44px] lg:text-[54px] lg:leading-[1.04]",
              )}
            >
              {t.googleIntegration.title}
            </h2>
            <p className="text-[16.5px] leading-[1.6] text-[var(--lp-muted)] lg:text-[18px]">
              {t.googleIntegration.purpose}
            </p>
            <Link
              href={`/privacy?lang=${lang}#google`}
              className="self-start rounded-md text-[15.5px] font-bold text-[var(--lp-blue-700)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-blue-700)] lg:text-[16px]"
            >
              {t.googleIntegration.privacyLink}
            </Link>
          </div>
          <DisclosureVisual />
        </div>
        <Reveal>
          <div className="grid gap-[22px] lg:grid-cols-3 lg:gap-10 lg:border-t lg:border-[var(--lp-line-soft)] lg:pt-10">
            {t.googleIntegration.items.map((item, index) => (
              <div key={item.title} className="flex items-start gap-3.5 lg:flex-col lg:gap-3">
                <IconTile
                  icon={ITEM_ICONS[index].icon}
                  tone={ITEM_ICONS[index].tone}
                  size={40}
                  className="lg:!h-11 lg:!w-11"
                />
                <div className="flex flex-col gap-1.5 lg:gap-3">
                  <h3
                    className={cn(
                      lpDisplay,
                      "text-[19px] font-bold leading-[1.2] tracking-[-0.02em] lg:text-[22px]",
                    )}
                  >
                    {item.title}
                  </h3>
                  <p className="text-[14.5px] leading-[1.55] text-[var(--lp-muted)] lg:text-[16px] lg:leading-[1.6]">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
