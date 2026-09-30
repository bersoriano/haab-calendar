"use client";

import { Eye, ShieldCheck, UserMinus } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language-provider";
import { Reveal } from "./reveal";
import { IconTile, SectionHeading, lpBody, lpDisplay } from "./primitives";

const ICONS = [
  { icon: ShieldCheck, tone: "teal" as const },
  { icon: UserMinus, tone: "blue" as const },
  { icon: Eye, tone: "coral" as const },
];

/**
 * Reliability, privacy, and scope. Every claim here describes behavior that
 * ships today; the last item names what does not, which is the part that makes
 * the other three believable while the product is in early access.
 */
export function Trust() {
  const { t } = useLanguage();

  return (
    <section
      id="trust"
      className={cn(lpBody, "scroll-mt-24 bg-[var(--lp-mint-band)] px-5 py-[72px] sm:px-8 lg:py-28")}
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-7 lg:gap-[52px]">
        <SectionHeading
          eyebrow={t.trust.eyebrow}
          title={t.trust.title}
          body={t.trust.intro}
          className="[&_p:last-child]:text-[#33514b]"
        />
        <Reveal>
          <div className="grid gap-3 lg:grid-cols-3 lg:gap-5">
            {t.trust.items.map((item, index) => (
              <div
                key={item.title}
                className="flex flex-col gap-2.5 rounded-[20px] bg-white p-[22px] lg:gap-3.5 lg:rounded-[24px] lg:p-8"
              >
                <IconTile
                  icon={ICONS[index].icon}
                  tone={ICONS[index].tone}
                  size={44}
                  className="lg:!h-[52px] lg:!w-[52px]"
                />
                <h3
                  className={cn(
                    lpDisplay,
                    "text-[20px] font-bold leading-[1.2] tracking-[-0.02em] lg:text-[23px]",
                  )}
                >
                  {item.title}
                </h3>
                <p className="text-[14.5px] leading-[1.55] text-[var(--lp-muted)] lg:text-[16px] lg:leading-[1.6]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
