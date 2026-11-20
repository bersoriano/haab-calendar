"use client";

import {
  Bank,
  BellRinging,
  CalendarCheck,
  EnvelopeSimpleOpen,
  GoogleLogo,
  LinkSimple,
  Palette,
  Ticket,
  Translate,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language-provider";
import { Reveal } from "./reveal";
import { IconTile, SectionHeading, lpBody, lpDisplay } from "./primitives";

/** One icon per entry in `t.featureList.items`, in the same order. */
const ICONS = [
  { icon: CalendarCheck, tone: "teal" as const },
  { icon: LinkSimple, tone: "blue" as const },
  { icon: BellRinging, tone: "coral" as const },
  { icon: Ticket, tone: "violet" as const },
  { icon: EnvelopeSimpleOpen, tone: "sun" as const },
  { icon: Bank, tone: "teal-400" as const },
  { icon: GoogleLogo, tone: "blue-soft" as const },
  { icon: Translate, tone: "mint-soft" as const },
  { icon: Palette, tone: "coral-soft" as const },
];

/**
 * The full feature list: every headline capability, one short card each.
 * Every claim here describes behavior that ships today.
 */
export function FeatureList() {
  const { t } = useLanguage();

  return (
    <section
      id="feature-list"
      className={cn(lpBody, "scroll-mt-24 bg-[var(--lp-paper)] px-5 py-[72px] sm:px-8 lg:py-28")}
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-7 lg:gap-[52px]">
        <SectionHeading
          eyebrow={t.featureList.eyebrow}
          title={t.featureList.title}
          body={t.featureList.body}
        />
        <Reveal>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {t.featureList.items.map((item, index) => {
              const { icon, tone } = ICONS[index % ICONS.length];

              return (
                <li
                  key={item.title}
                  className="flex flex-col gap-2.5 rounded-[20px] border border-[var(--lp-line)] bg-white p-[22px] shadow-[var(--lp-shadow-card)] lg:gap-3.5 lg:rounded-[24px] lg:p-7"
                >
                  <IconTile icon={icon} tone={tone} size={44} />
                  <h3
                    className={cn(
                      lpDisplay,
                      "text-[19px] font-bold leading-[1.2] tracking-[-0.02em] text-[var(--lp-ink)] lg:text-[21px]",
                    )}
                  >
                    {item.title}
                  </h3>
                  <p className="text-[14.5px] leading-[1.55] text-[var(--lp-muted)] lg:text-[15.5px] lg:leading-[1.6]">
                    {item.body}
                  </p>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
