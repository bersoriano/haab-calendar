"use client";

import {
  ArrowRight,
  Briefcase,
  Buildings,
  ForkKnife,
  Heartbeat,
  Ticket,
} from "@phosphor-icons/react";
import type { ComponentType } from "react";
import { VERTICALS, getVerticalPreset } from "@/config/verticals";
import { cn } from "@/lib/utils";
import type { LandingVertical } from "./landing-ui";
import { useLanguage } from "./language-provider";
import { IconTile, LpButton, SectionHeading, lpBody, lpDisplay, lpMono } from "./primitives";

type TileStyle = {
  icon: ComponentType<{ className?: string; weight?: "regular" | "bold"; "aria-hidden"?: boolean | "true" }>;
  tone: "blue" | "violet" | "coral" | "sun";
  /** Card ground and link colour; each pair is checked for AA in the tokens file. */
  surface: string;
  link: string;
};

const TILE_STYLES: Record<Exclude<LandingVertical, "healthcare">, TileStyle> = {
  spaces: {
    icon: Buildings,
    tone: "blue",
    surface: "bg-[var(--lp-blue-100)]",
    link: "text-[var(--lp-blue-800)]",
  },
  professional: {
    icon: Briefcase,
    tone: "violet",
    surface: "bg-[var(--lp-violet-100)]",
    link: "text-[var(--lp-violet-700)]",
  },
  events: {
    icon: Ticket,
    tone: "coral",
    surface: "bg-[var(--lp-coral-100)]",
    link: "text-[var(--lp-coral-700)]",
  },
  restaurant: {
    icon: ForkKnife,
    tone: "sun",
    surface: "bg-[var(--lp-sun-100)]",
    link: "text-[var(--lp-sun-800)]",
  },
};

const sectionClass =
  "bg-white px-5 pb-[72px] pt-20 sm:px-8 lg:pb-[120px] lg:pt-32";

/** "Start with Healthcare →" without the arrow, which the button draws itself. */
function withoutArrow(label: string) {
  return label.replace(/\s*→\s*$/, "");
}

function HealthcareTile({ onSelect }: { onSelect: () => void }) {
  const { lang, t } = useLanguage();
  const copy = t.home.verticals.healthcare;
  const services = getVerticalPreset("healthcare", lang)?.services.slice(0, 2) ?? [];

  return (
    <div
      className={cn(
        lpBody,
        "relative col-span-2 flex flex-col gap-[18px] overflow-hidden rounded-[24px] bg-[var(--lp-teal-900)] px-[22px] py-[26px] text-white sm:rounded-[28px] sm:p-9 lg:col-span-1 lg:row-span-2 lg:gap-[22px]",
      )}
    >
      <div
        aria-hidden="true"
        className="lp-glow-mint pointer-events-none absolute -right-24 -top-24 h-[280px] w-[280px] rounded-full sm:-right-[120px] sm:-top-[120px] sm:h-[360px] sm:w-[360px]"
      />
      <div className="relative flex items-center justify-between gap-3">
        <IconTile icon={Heartbeat} tone="teal-400" size={48} />
        <span className="rounded-full bg-white/[0.12] px-3 py-1.5 text-[12px] font-semibold sm:text-[13px]">
          {t.useCases.healthBadge}
        </span>
      </div>
      <div className="relative flex flex-col gap-1.5 sm:gap-2">
        <h3
          className={cn(
            lpDisplay,
            "text-[30px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[36px]",
          )}
        >
          {copy.label}
        </h3>
        <p className="text-[15.5px] leading-[1.5] text-[var(--lp-mint-100)] sm:text-[17px]">
          {copy.tagline}. {t.useCases.healthLanguage}
        </p>
      </div>
      <div className="relative flex flex-col gap-2 sm:gap-2.5 lg:flex-grow">
        <p className={cn(lpMono, "text-[11px] uppercase tracking-[0.14em] text-[var(--lp-mint-200)] sm:text-[11.5px]")}>
          {t.useCases.prefilled}
        </p>
        <ul className="flex flex-col gap-2 sm:gap-2.5">
          {services.map((service) => (
            <li
              key={service.name}
              className="flex items-center justify-between gap-3 rounded-[12px] border border-white/[0.14] bg-white/[0.08] px-3.5 py-3 sm:rounded-[14px] sm:px-4 sm:py-3.5"
            >
              <span className="text-[14.5px] font-semibold sm:text-[15.5px]">{service.name}</span>
              <span className="shrink-0 text-[13px] text-[var(--lp-mint-100)] sm:text-[14px]">
                {service.durationMinutes} min
                <span className="hidden sm:inline"> · {service.cost}</span>
              </span>
            </li>
          ))}
          <li className="hidden items-center rounded-[14px] border border-dashed border-white/30 bg-white/[0.08] px-4 py-3.5 text-[15.5px] font-semibold text-[var(--lp-mint-100)] sm:flex">
            {t.useCases.addOwn}
          </li>
        </ul>
      </div>
      <LpButton
        variant="inverse"
        size="card"
        arrow
        onClick={onSelect}
        className="relative w-full sm:w-auto sm:self-start"
      >
        {withoutArrow(copy.start)}
      </LpButton>
    </div>
  );
}

function IndustryTile({
  vertical,
  onSelect,
}: {
  vertical: Exclude<LandingVertical, "healthcare">;
  onSelect: () => void;
}) {
  const { t } = useLanguage();
  const copy = t.home.verticals[vertical];
  const style = TILE_STYLES[vertical];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        lpBody,
        "lp-lift group flex min-h-[176px] flex-col justify-between gap-3 rounded-[20px] p-[18px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-teal-600)] focus-visible:ring-offset-2 sm:rounded-[28px] sm:p-[30px]",
        style.surface,
      )}
    >
      <span className="flex flex-col gap-3 sm:gap-4">
        <IconTile icon={style.icon} tone={style.tone} size={44} className="sm:!h-12 sm:!w-12" />
        <span className="flex flex-col gap-1 sm:gap-1.5">
          <span
            className={cn(
              lpDisplay,
              "text-[20px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--lp-ink)] sm:text-[26px]",
            )}
          >
            {copy.label}
          </span>
          <span className="text-[13.5px] leading-[1.45] text-[var(--lp-body)] sm:text-[16px] sm:leading-[1.5]">
            {copy.tagline}
          </span>
        </span>
      </span>
      <span className={cn("flex items-center gap-2 text-[14px] font-bold sm:text-[16px]", style.link)}>
        <span className="sm:hidden">{t.useCases.startShort}</span>
        <span className="hidden items-center gap-2 sm:inline-flex">
          {withoutArrow(copy.start)}
          <ArrowRight
            aria-hidden="true"
            weight="bold"
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </span>
      </span>
    </button>
  );
}

/**
 * The picker for a visitor with no booking page yet. Healthcare leads as the
 * large tile because it is the product's core industry; the rest fill the
 * bento beside it. Each tile is one real button that starts setup for that
 * vertical, exactly as the old card grid did.
 */
export function UseCasesSection({
  onSelectVertical,
}: {
  onSelectVertical: (vertical: LandingVertical) => void;
}) {
  const { t } = useLanguage();

  return (
    <section id="verticals" className={cn(lpBody, "scroll-mt-24", sectionClass)}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 lg:gap-14">
        <SectionHeading
          eyebrow={t.useCases.eyebrow}
          title={t.useCases.title}
          body={t.useCases.body}
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:auto-rows-[minmax(270px,auto)] lg:grid-cols-3">
          {VERTICALS.map((v) => {
            const id = v.id as LandingVertical;

            return id === "healthcare" ? (
              <HealthcareTile key={id} onSelect={() => onSelectVertical(id)} />
            ) : (
              <IndustryTile key={id} vertical={id} onSelect={() => onSelectVertical(id)} />
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Shown in the same slot to an owner whose page is already set up. */
export function DashboardSection({
  onOpen,
  email,
}: {
  onOpen: () => void;
  email?: string;
}) {
  const { t } = useLanguage();

  return (
    <section className={cn(lpBody, sectionClass)}>
      <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-5 rounded-[24px] border border-[var(--lp-line)] bg-white p-8 text-center shadow-[var(--lp-shadow-card)] sm:rounded-[28px] sm:p-12">
        <p className={cn(lpMono, "text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--lp-teal-600)] sm:text-[13px]")}>
          {email ? `${t.home.signedInAs} ${email}` : t.home.signedIn}
        </p>
        <h2
          className={cn(
            lpDisplay,
            "text-balance text-[32px] font-bold leading-[1.05] tracking-[-0.035em] text-[var(--lp-ink)] sm:text-[44px]",
          )}
        >
          {t.home.bookingPageReady}
        </h2>
        <p className="max-w-xl text-[16.5px] leading-[1.55] text-[var(--lp-muted)] sm:text-[18px]">
          {t.home.dashboardBody}
        </p>
        <LpButton size="hero" onClick={onOpen}>
          {t.home.goToDashboard}
        </LpButton>
      </div>
    </section>
  );
}
