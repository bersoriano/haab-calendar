"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { getVerticalPreset } from "@/config/verticals";
import { DEMO_PAGES, getDemoPagePath } from "@/lib/demo-pages";
import type { VerticalId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language-provider";
import { lpBody, lpDisplay, lpMono } from "./primitives";

const liveExamplePaths = DEMO_PAGES.map(getDemoPagePath);

function localizedExamplePath(path: string, lang: "en" | "es") {
  return `${path}?lang=${lang}`;
}

type HeaderStyle = {
  ground: string;
  label: string;
  pill: string;
  dot: string;
  link: string;
};

// Header colour follows the demo's vertical, not the card's position. The two
// warm headers (coral, sun) take dark text: white on them fails AA.
const HEADER_STYLES: Record<string, HeaderStyle> = {
  healthcare: {
    ground: "bg-[var(--lp-teal-900)]",
    label: "text-[var(--lp-mint-200)]",
    pill: "bg-white/[0.14] text-white",
    dot: "bg-[var(--lp-teal-400)]",
    link: "text-[var(--lp-teal-700)]",
  },
  spaces: {
    ground: "bg-[var(--lp-blue-600)]",
    label: "text-white",
    pill: "bg-white/[0.18] text-white",
    dot: "bg-[var(--lp-mint-300)]",
    link: "text-[var(--lp-blue-800)]",
  },
  professional: {
    ground: "bg-[var(--lp-violet-600)]",
    label: "text-[#e2ddff]",
    pill: "bg-white/[0.18] text-white",
    dot: "bg-[var(--lp-mint-300)]",
    link: "text-[var(--lp-violet-700)]",
  },
  restaurant: {
    ground: "bg-[var(--lp-coral-600)]",
    label: "text-[var(--lp-coral-ink)]",
    pill: "bg-white/[0.88] text-[var(--lp-coral-ink)]",
    dot: "bg-[var(--lp-coral-600)]",
    link: "text-[var(--lp-coral-700)]",
  },
  events: {
    ground: "bg-[var(--lp-sun-500)]",
    label: "text-[var(--lp-sun-ink)]",
    pill: "bg-white/[0.88] text-[var(--lp-sun-ink)]",
    dot: "bg-[var(--lp-sun-500)]",
    link: "text-[var(--lp-sun-800)]",
  },
};

const FALLBACK_STYLE: HeaderStyle = HEADER_STYLES.spaces;

/** Decorative mini visuals: none of these carry information a screen reader needs. */
function TimePills() {
  return (
    <div className="flex gap-1.5">
      {["9:00", "10:30", "11:00"].map((time, index) => (
        <span
          key={time}
          className={cn(
            "rounded-lg px-[9px] py-[5px] text-[12px] font-semibold sm:px-2.5 sm:py-1.5 sm:text-[12.5px]",
            index === 0
              ? "bg-[var(--lp-teal-400)] font-bold text-[var(--lp-teal-on-400)]"
              : "bg-white/[0.12] text-[var(--lp-mint-100)]",
          )}
        >
          {time}
        </span>
      ))}
    </div>
  );
}

function HourBlocks() {
  return (
    <div className="grid grid-cols-6 gap-1">
      {[false, true, true, false, false, false].map((booked, index) => (
        <span
          key={index}
          className={cn(
            "h-6 rounded-md sm:h-[26px]",
            booked ? "bg-white" : "bg-white/20",
          )}
        />
      ))}
    </div>
  );
}

function ServiceChips({ names }: { names: string[] }) {
  return (
    <div className="flex gap-1.5">
      {names.map((name, index) => (
        <span
          key={name}
          className={cn(
            "truncate rounded-lg px-2.5 py-1.5 text-[12px] font-semibold sm:text-[12.5px]",
            index === 0 ? "bg-white font-bold text-[#3a2ba8]" : "bg-white/[0.18] text-white",
          )}
        >
          {name}
        </span>
      ))}
    </div>
  );
}

function TableDots() {
  return (
    <div className="flex items-center gap-2">
      {[true, true, false, true, false, false].map((taken, index) => (
        <span
          key={index}
          className={cn("h-[22px] w-[22px] rounded-full", taken ? "bg-white" : "bg-white/30")}
        />
      ))}
    </div>
  );
}

function CapacityBar({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="h-2 overflow-hidden rounded-full bg-[var(--lp-sun-ink)]/15">
        <span className="block h-full w-[62%] rounded-full bg-[var(--lp-sun-ink)]" />
      </span>
      <span className="truncate text-[12px] font-semibold text-[var(--lp-sun-ink)] sm:text-[12.5px]">
        {label}
      </span>
    </div>
  );
}

function HeaderVisual({ vertical }: { vertical: VerticalId }) {
  const { lang } = useLanguage();

  switch (vertical) {
    case "healthcare":
      return <TimePills />;
    case "spaces":
      return <HourBlocks />;
    case "professional": {
      const names =
        getVerticalPreset("professional", lang)
          ?.services.slice(0, 2)
          .map((service) => service.name) ?? [];
      return <ServiceChips names={names} />;
    }
    case "restaurant":
      return <TableDots />;
    case "events":
      return (
        <CapacityBar
          label={getVerticalPreset("events", lang)?.services[0]?.capacity ?? ""}
        />
      );
    default:
      return <TimePills />;
  }
}

/**
 * A single example page. `index` addresses both DEMO_PAGES and the landing
 * copy's items list, which are kept the same length by demo-pages.test.ts — so
 * one number is enough to pair a card with the page it opens.
 */
export function DemoCard({ index, className }: { index: number; className?: string }) {
  const { lang, t } = useLanguage();
  const item = t.liveExamples.items[index];
  const demo = DEMO_PAGES[index];

  if (!item || !demo) {
    return null;
  }

  const style = HEADER_STYLES[demo.vertical] ?? FALLBACK_STYLE;

  return (
    <Link
      href={localizedExamplePath(liveExamplePaths[index], lang)}
      className={cn(
        lpBody,
        "lp-lift group flex flex-col overflow-hidden rounded-[22px] border border-[var(--lp-line)] bg-white shadow-[var(--lp-shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-teal-600)] focus-visible:ring-offset-2 sm:rounded-[24px]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "flex h-[104px] flex-col justify-between px-[18px] py-4 sm:h-[120px] sm:px-5 sm:py-[18px]",
          style.ground,
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              lpMono,
              "truncate text-[11px] uppercase tracking-[0.14em] sm:text-[11.5px]",
              style.label,
            )}
          >
            {item.vertical}
          </span>
          <span
            className={cn(
              "flex shrink-0 items-center gap-[5px] rounded-full px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.1em] sm:gap-1.5 sm:px-[9px] sm:py-1 sm:text-[11px]",
              style.pill,
            )}
          >
            <span className={cn("haab-live-dot h-1.5 w-1.5 rounded-full", style.dot)} />
            {t.liveExamples.liveBadge}
          </span>
        </div>
        <HeaderVisual vertical={demo.vertical} />
      </div>
      <div className="flex flex-grow flex-col gap-2 p-[18px] sm:gap-2.5 sm:px-5 sm:pb-6 sm:pt-[22px]">
        <h3
          className={cn(
            lpDisplay,
            "text-[20px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--lp-ink)] sm:text-[22px]",
          )}
        >
          {item.title}
        </h3>
        <p className="flex-grow text-[14px] leading-[1.5] text-[var(--lp-muted)] sm:text-[15px]">
          {item.proof}
        </p>
        <span
          className={cn(
            "flex items-center gap-2 text-[14.5px] font-bold sm:text-[15px]",
            style.link,
          )}
        >
          {item.cta}
          <ArrowRight
            aria-hidden="true"
            weight="bold"
            className="h-[15px] w-[15px] transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}

// Phone carousel geometry: 270px cards and a 12px gap (see .lp-snap-row).
const CAROUSEL_STEP = 270 + 12;

/**
 * The example cards. With `carousel` they become a swipe row below 640px, with
 * pagination dots; the dots are decorative because every card is already a
 * focusable link. Wider than that (and always, without `carousel`) they are a
 * grid that divides both the landing's four and the gallery's twelve evenly.
 */
export function DemoGrid({
  indexes,
  carousel = false,
}: {
  indexes: number[];
  carousel?: boolean;
}) {
  const [active, setActive] = useState(0);

  const cards: ReactNode = indexes.map((index) => (
    <DemoCard key={index} index={index} className={carousel ? "w-[270px] sm:w-auto" : undefined} />
  ));

  if (!carousel) {
    return (
      <div className="mt-9 grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">{cards}</div>
    );
  }

  return (
    <>
      <div
        onScroll={(event) => {
          const next = Math.round(event.currentTarget.scrollLeft / CAROUSEL_STEP);
          setActive(Math.min(Math.max(next, 0), indexes.length - 1));
        }}
        className="lp-snap-row -mx-5 px-5 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 xl:grid-cols-4"
      >
        {cards}
      </div>
      <div aria-hidden="true" className="mt-4 flex justify-center gap-1.5 sm:hidden">
        {indexes.map((index, position) => (
          <span
            key={index}
            className={cn(
              "h-1.5 rounded-full transition-all",
              position === active
                ? "w-[22px] bg-[var(--lp-teal-600)]"
                : "w-1.5 bg-[#c9dad6]",
            )}
          />
        ))}
      </div>
    </>
  );
}
