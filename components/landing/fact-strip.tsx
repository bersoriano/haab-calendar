"use client";

import { DEMO_PAGES } from "@/lib/demo-pages";
import { cn } from "@/lib/utils";
import { formatDemoCount } from "./demo-count";
import { useLanguage } from "./language-provider";
import { StatCell, lpBody } from "./primitives";

// Number colours, in order: hold, accounts, demo count, languages. The coral is
// darker than the decorative coral-500 so the large numeral keeps 3:1.
const valueColors = [
  "text-[var(--lp-teal-600)]",
  "text-[var(--lp-blue-700)]",
  "text-[#e0552f]",
  "text-[var(--lp-ink)]",
];

// Dividers: a 2x2 grid below md, four across from md.
const cellBorders = [
  "border-b border-r md:border-b-0",
  "border-b md:border-b-0 md:border-r",
  "border-r",
  "",
];

/** A card that overlaps the bottom of the hero with four one-line facts. */
export function FactStrip() {
  const { t } = useLanguage();

  return (
    <section className={cn(lpBody, "relative z-10 -mt-14 px-5 sm:px-8 lg:-mt-16")}>
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 rounded-[22px] border border-[#e2ecea] bg-white shadow-[var(--lp-shadow-raised)] md:grid-cols-4 lg:rounded-[24px]">
        {t.facts.map((fact, index) => (
          <StatCell
            key={fact.caption}
            value={formatDemoCount(fact.value, DEMO_PAGES.length)}
            caption={fact.caption}
            valueClassName={valueColors[index]}
            className={cn("border-[var(--lp-line-soft)]", cellBorders[index])}
          />
        ))}
      </div>
    </section>
  );
}
