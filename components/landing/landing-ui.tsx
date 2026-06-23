"use client";

import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";
import type { VerticalId } from "@/lib/types";
import { LanguageToggle, useLanguage } from "./language-provider";

// Verticals shown on the landing page, in display order. These map 1:1 to the
// `VerticalId`s in config/verticals.ts and to the UseCases card variants below.
export type LandingVertical = Extract<
  VerticalId,
  "healthcare" | "spaces" | "professional" | "events"
>;

// Wiring from the host page (HomeExperience) into the landing UI: a generic
// "start setup" action and a per-vertical selection. Defaults are no-ops so the
// landing components stay renderable in isolation.
type LandingActions = {
  onStart: () => void;
  onSelectVertical: (vertical: LandingVertical) => void;
};

const LandingActionsContext = createContext<LandingActions>({
  onStart: () => {},
  onSelectVertical: () => {},
});

export function LandingActionsProvider({
  actions,
  children,
}: {
  actions: LandingActions;
  children: ReactNode;
}) {
  return (
    <LandingActionsContext.Provider value={actions}>
      {children}
    </LandingActionsContext.Provider>
  );
}

function useLandingActions() {
  return useContext(LandingActionsContext);
}

// CTA button that kicks off setup. Replaces the original marketing links to
// /setup and /demo, which do not exist in this app — both funnel into onStart.
function StartButton({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const { onStart } = useLandingActions();
  return (
    <button type="button" onClick={onStart} className={className}>
      {children}
    </button>
  );
}

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(26,115,232,0.28)] transition hover:shadow-[0_18px_40px_rgba(26,115,232,0.34)] active:translate-y-px";

const ghostButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-white/70 px-5 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-white";

const sectionPadding = "px-5 py-20 sm:px-8 sm:py-24 lg:py-28";

function BrandGlyph({ label, tone = "blue" }: { label: string; tone?: "blue" | "teal" | "gold" }) {
  const toneClass =
    tone === "teal"
      ? "from-[rgba(13,148,136,0.16)] to-[rgba(26,115,232,0.06)] text-[var(--teal)]"
      : tone === "gold"
        ? "from-[rgba(217,119,6,0.16)] to-[rgba(26,115,232,0.05)] text-[#b45309]"
        : "from-[rgba(26,115,232,0.16)] to-[rgba(13,148,136,0.07)] text-[var(--primary)]";

  return (
    <div
      aria-hidden="true"
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-sm font-bold ${toneClass}`}
    >
      {label}
    </div>
  );
}

function BrowserFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[24px] border border-white/80 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.09)] ${className}`}
    >
      <div className="flex items-center gap-1.5 border-b border-[var(--line)] bg-[rgba(248,250,252,0.9)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#fecaca]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#fde68a]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#bbf7d0]" />
        <span className="ml-3 h-2 w-24 rounded-full bg-[rgba(15,23,42,0.08)]" />
      </div>
      {children}
    </div>
  );
}

function PhoneFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[32px] border-[10px] border-[#111827] bg-white shadow-[0_22px_55px_rgba(15,23,42,0.16)] ${className}`}
    >
      <div className="mx-auto mt-2 h-4 w-16 rounded-full bg-[#111827]" />
      <div className="p-4">{children}</div>
    </div>
  );
}

function CalendarGrid({ selected = 11 }: { selected?: number }) {
  const { t } = useLanguage();
  const days = [30, 31, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

  return (
    <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-[var(--muted)]">
      {t.visuals.weekdays.map((d, i) => (
        <span key={`${d}-${i}`} className="py-1 font-semibold">
          {d}
        </span>
      ))}
      {days.map((day, i) => (
        <span
          key={`${day}-${i}`}
          className={`rounded-xl py-1.5 font-medium ${
            day === selected
              ? "bg-[var(--primary)] text-white shadow-[0_8px_18px_rgba(26,115,232,0.26)]"
              : i < 2
                ? "text-[rgba(91,99,115,0.42)]"
                : "bg-white/70 text-[var(--ink)]"
          }`}
        >
          {day}
        </span>
      ))}
    </div>
  );
}

function SlotChips({ selected = "2:00 PM" }: { selected?: string }) {
  const slots = ["10:00 AM", "1:00 PM", "2:00 PM", "3:30 PM"];

  return (
    <div className="grid grid-cols-2 gap-2">
      {slots.map((slot) => (
        <span
          key={slot}
          className={`rounded-xl border px-3 py-2 text-center text-[11px] font-semibold ${
            slot === selected
              ? "border-[var(--teal)] bg-[rgba(13,148,136,0.1)] text-[var(--teal)]"
              : "border-[var(--line)] bg-white text-[var(--ink)]"
          }`}
        >
          {slot}
        </span>
      ))}
    </div>
  );
}

function ServiceSetupVisual() {
  const { t } = useLanguage();
  const v = t.visuals.serviceSetup;
  return (
    <BrowserFrame className="aspect-[16/10]">
      <div className="grid h-full grid-cols-[0.42fr_1fr] bg-[linear-gradient(135deg,#fff,#eef7ff)]">
        <div className="border-r border-[var(--line)] bg-white/68 p-4">
          {v.steps.map((item, i) => (
            <div
              key={item}
              className={`mb-2 rounded-xl px-3 py-2 text-[11px] font-semibold ${
                i === 0 ? "bg-[var(--accent-soft)] text-[var(--primary)]" : "text-[var(--muted)]"
              }`}
            >
              {item}
            </div>
          ))}
        </div>
        <div className="p-5">
          <div className="mb-4 h-3 w-32 rounded-full bg-[rgba(15,23,42,0.12)]" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
              <p className="text-[10px] font-semibold uppercase text-[var(--muted)]">{v.serviceLabel}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{v.serviceValue}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
              <p className="text-[10px] font-semibold uppercase text-[var(--muted)]">{v.durationLabel}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{v.durationValue}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
              <p className="text-[10px] font-semibold uppercase text-[var(--muted)]">{v.capacityLabel}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{v.capacityValue}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
              <p className="text-[10px] font-semibold uppercase text-[var(--muted)]">{v.modeLabel}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--teal)]">{v.modeValue}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-[rgba(13,148,136,0.1)] p-3">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--teal)]">
              <span>{v.readyToPublish}</span>
              <span>{v.setupTime}</span>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function ShareLinkVisual() {
  const { t } = useLanguage();
  const v = t.visuals.shareLink;
  return (
    <BrowserFrame className="aspect-[16/10]">
      <div className="grid h-full gap-4 bg-[linear-gradient(135deg,#fff,#eef8f7)] p-5 sm:grid-cols-[1fr_0.72fr]">
        <div className="flex flex-col justify-between rounded-3xl border border-[var(--line)] bg-white p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[var(--muted)]">{v.yourPage}</p>
            <div className="mt-3 rounded-2xl border border-[var(--line)] bg-[rgba(245,247,251,0.9)] px-3 py-2 text-xs font-semibold text-[var(--ink)]">
              haab.app/doctors/dr-maya-alvarez
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-[var(--muted)]">
            {v.chips.map((item) => (
              <span key={item} className="rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-[var(--primary)]">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-white/80 bg-white/80 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
          <CalendarGrid selected={14} />
          <div className="mt-4">
            <SlotChips selected="1:00 PM" />
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function AutomationVisual() {
  const { t } = useLanguage();
  const v = t.visuals.automation;
  return (
    <BrowserFrame className="aspect-[16/10]">
      <div className="h-full bg-[linear-gradient(135deg,#fff,#eef4ff)] p-5">
        <div className="grid h-full gap-4 sm:grid-cols-[0.8fr_1fr]">
          <div className="rounded-3xl border border-[var(--line)] bg-white p-4">
            <CalendarGrid selected={18} />
            <div className="mt-4 rounded-2xl bg-[var(--teal-soft)] p-3 text-xs font-semibold text-[var(--teal)]">
              {v.confirmedAt}
            </div>
          </div>
          <div className="space-y-3">
            {v.cards.map(([title, body], i) => (
              <div key={title} className="rounded-2xl border border-[var(--line)] bg-white p-3">
                <div className="flex items-center gap-3">
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-[#fef3c7] text-[#b45309]" : "bg-[var(--accent-soft)] text-[var(--primary)]"}`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
                    <p className="text-[11px] text-[var(--muted)]">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function StepVisual({ step }: { step: string }) {
  if (step === "01") return <ServiceSetupVisual />;
  if (step === "02") return <ShareLinkVisual />;
  return <AutomationVisual />;
}

function HoldVisual() {
  const { t } = useLanguage();
  const v = t.visuals.hold;
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(135deg,#fff,#e9fbf8)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <PhoneFrame className="mx-auto max-w-[230px] rotate-[-4deg]">
        <div className="space-y-4">
          <CalendarGrid selected={11} />
          <SlotChips selected="2:00 PM" />
          <div className="rounded-2xl bg-[#f59e0b] px-3 py-2 text-center text-xs font-bold text-white shadow-[0_12px_24px_rgba(245,158,11,0.24)]">
            {v.expires}
          </div>
          <div className="h-10 rounded-2xl bg-[var(--teal)]" />
        </div>
      </PhoneFrame>
      <div className="absolute right-6 top-6 rounded-2xl bg-white/85 px-4 py-3 text-xs font-semibold text-[var(--ink)] shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        {v.protected}
      </div>
    </div>
  );
}

function NaturalLanguageVisual() {
  const { t } = useLanguage();
  const v = t.visuals.natural;
  return (
    <div className="aspect-[4/3] overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(135deg,#fff,#eef4ff)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="mx-auto max-w-md rounded-[28px] border border-[var(--line)] bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase text-[var(--muted)]">{v.typeATime}</p>
        <div className="mt-3 rounded-2xl border border-[var(--primary)] bg-[var(--accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--ink)]">
          {v.example}
        </div>
        <div className="my-5 h-px bg-[linear-gradient(90deg,transparent,var(--line),transparent)]" />
        <div className="grid gap-4 sm:grid-cols-[0.9fr_1fr]">
          <CalendarGrid selected={15} />
          <div>
            <SlotChips selected="2:00 PM" />
            <div className="mt-3 rounded-2xl bg-[var(--teal-soft)] px-3 py-2 text-xs font-bold text-[var(--teal)]">
              {v.matched}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelfServiceVisual() {
  const { t } = useLanguage();
  const tones = ["bg-[var(--accent-soft)] text-[var(--primary)]", "bg-[var(--teal-soft)] text-[var(--teal)]"];
  return (
    <div className="aspect-[4/3] overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(135deg,#fff,#eef8f7)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="grid h-full content-center gap-4">
        {t.visuals.selfService.map(([title, body], i) => (
          <div key={title} className="relative rounded-[28px] border border-[var(--line)] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-4">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl text-sm font-bold ${tones[i]}`}>
                {i === 0 ? "1" : "2"}
              </span>
              <div>
                <p className="text-lg font-semibold text-[var(--ink)]">{title}</p>
                <p className="text-sm text-[var(--muted)]">{body}</p>
              </div>
            </div>
            {i === 0 ? <div className="absolute left-11 top-full h-4 w-px bg-[var(--line)]" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function DifferentiatorVisual({ type }: { type: "hold" | "natural" | "selfservice" }) {
  if (type === "hold") return <HoldVisual />;
  if (type === "natural") return <NaturalLanguageVisual />;
  return <SelfServiceVisual />;
}

function UseCaseVisual({ variant }: { variant: keyof typeof glyphMap }) {
  const { t } = useLanguage();
  const meta = glyphMap[variant] ?? glyphMap.healthcare;
  const lines = t.visuals.useCaseLines[variant] ?? t.visuals.useCaseLines.healthcare;

  return (
    <div className="relative aspect-[3/2] overflow-hidden rounded-[24px] border border-white/80 bg-[linear-gradient(135deg,#fff,#eef7ff)] p-4 shadow-inner">
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[rgba(13,148,136,0.12)]" />
      <div className="relative flex h-full flex-col justify-between rounded-[20px] border border-[var(--line)] bg-white/78 p-4">
        <div className="flex items-center justify-between">
          <BrandGlyph label={meta.glyph} tone={meta.tone} />
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[10px] font-bold uppercase text-[var(--primary)]">
            {t.visuals.useCaseBadge}
          </span>
        </div>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={line} className="flex items-center justify-between rounded-xl bg-[rgba(245,247,251,0.88)] px-3 py-2">
              <span className="text-xs font-semibold text-[var(--ink)]">{line}</span>
              <span className={i === 0 ? "h-2 w-10 rounded-full bg-[var(--teal)]" : "h-2 w-8 rounded-full bg-[rgba(15,23,42,0.12)]"} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const glyphMap = {
  healthcare: { glyph: "+", tone: "teal" as const },
  spaces: { glyph: "▦", tone: "blue" as const },
  professional: { glyph: "↗", tone: "blue" as const },
  events: { glyph: "★", tone: "gold" as const },
};

function MobileScreen({ type }: { type: "calendar" | "slots" | "confirm" }) {
  const { t } = useLanguage();
  const v = t.visuals.mobile;
  return (
    <PhoneFrame className="w-full max-w-[190px]">
      {type === "calendar" ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-bold text-[var(--ink)]">{v.calendar.name}</p>
            <p className="text-[11px] text-[var(--muted)]">{v.calendar.service}</p>
          </div>
          <CalendarGrid selected={11} />
          <div className="rounded-2xl bg-[var(--primary)] py-3 text-center text-xs font-bold text-white">
            {v.calendar.cta}
          </div>
        </div>
      ) : null}
      {type === "slots" ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-bold text-[var(--ink)]">{v.slots.date}</p>
            <p className="text-[11px] text-[var(--muted)]">{v.slots.openings}</p>
          </div>
          <SlotChips selected="2:00 PM" />
          <div className="rounded-2xl bg-[#f59e0b] py-2 text-center text-[11px] font-bold text-white">
            {v.slots.held}
          </div>
          <div className="rounded-2xl bg-[var(--teal)] py-3 text-center text-xs font-bold text-white">
            {v.slots.cta}
          </div>
        </div>
      ) : null}
      {type === "confirm" ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--teal-soft)] text-2xl font-bold text-[var(--teal)]">
            ✓
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--ink)]">{v.confirm.title}</p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">{v.confirm.when}</p>
          </div>
          <div className="mx-auto grid h-24 w-24 grid-cols-5 gap-1 rounded-2xl border border-[var(--line)] bg-white p-2">
            {Array.from({ length: 25 }).map((_, i) => (
              <span
                key={i}
                className={`${[0, 2, 3, 6, 8, 10, 12, 13, 17, 19, 20, 22, 24].includes(i) ? "bg-[var(--ink)]" : "bg-[rgba(15,23,42,0.08)]"} rounded-[2px]`}
              />
            ))}
          </div>
          <div className="rounded-2xl bg-[var(--primary)] py-3 text-center text-xs font-bold text-white">
            {v.confirm.cta}
          </div>
        </div>
      ) : null}
    </PhoneFrame>
  );
}

function CustomerAvatar({ initials, tone = "blue" }: { initials: string; tone?: "blue" | "teal" | "gold" }) {
  return (
    <div
      aria-hidden="true"
      className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-bold ${
        tone === "teal"
          ? "bg-[var(--teal-soft)] text-[var(--teal)]"
          : tone === "gold"
            ? "bg-[#fef3c7] text-[#b45309]"
            : "bg-[var(--accent-soft)] text-[var(--primary)]"
      }`}
    >
      {initials}
    </div>
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[28px] border border-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.78)] p-6 shadow-[0_18px_46px_rgba(15,23,42,0.06)] backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {body ? (
        <p className="mt-4 text-base leading-7 text-[var(--muted)] sm:text-lg">{body}</p>
      ) : null}
    </div>
  );
}

export function StickyNav() {
  const { t } = useLanguage();
  const navLinks = [
    { href: "#how", label: t.nav.links.how },
    { href: "#features", label: t.nav.links.features },
    { href: "#use-cases", label: t.nav.links.useCases },
    { href: "#faq", label: t.nav.links.faq },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--line)] bg-[rgba(245,247,251,0.78)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] text-sm font-bold text-white shadow-[0_8px_22px_rgba(26,115,232,0.32)]">
            H
          </span>
          <span className="text-base font-semibold text-[var(--ink)]">
            {t.nav.brand}
          </span>
        </Link>
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle />
          <StartButton className="hidden text-sm font-semibold text-[var(--ink)] transition hover:text-[var(--primary)] sm:inline-flex">
            {t.nav.seeLivePage}
          </StartButton>
          <StartButton className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(26,115,232,0.28)] transition hover:shadow-[0_14px_30px_rgba(26,115,232,0.34)] active:translate-y-px sm:px-6 sm:py-3">
            <span className="sm:hidden">{t.nav.createPageShort}</span>
            <span className="hidden sm:inline">{t.nav.createPageLong}</span>
          </StartButton>
          <details className="group relative lg:hidden">
            <summary
              aria-label={t.nav.openMenu}
              className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-full border border-[var(--line)] bg-white/70 text-[var(--ink)] transition hover:bg-white"
            >
              <span aria-hidden="true" className="flex flex-col gap-[3px]">
                <span className="h-0.5 w-4 rounded-full bg-current" />
                <span className="h-0.5 w-4 rounded-full bg-current" />
                <span className="h-0.5 w-4 rounded-full bg-current" />
              </span>
            </summary>
            <nav
              aria-label="Mobile"
              className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-[var(--line)] bg-[rgba(245,247,251,0.97)] p-2 shadow-[0_18px_46px_rgba(15,23,42,0.12)] backdrop-blur-xl"
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--muted)] transition hover:bg-white hover:text-[var(--ink)]"
                >
                  {link.label}
                </a>
              ))}
              <StartButton className="block w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-[var(--ink)] transition hover:bg-white">
                {t.nav.seeLivePage}
              </StartButton>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

export function Hero() {
  const { t } = useLanguage();
  return (
    <section className="relative overflow-hidden bg-[url('/hero2.png')] bg-cover bg-right-top md:bg-center">
      <div className="pointer-events-none absolute inset-0 bg-[rgba(245,247,251,0.55)] md:bg-[linear-gradient(90deg,rgba(245,247,251,0.72)_0%,rgba(245,247,251,0.52)_40%,rgba(245,247,251,0.18)_68%,rgba(245,247,251,0.08)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(245,247,251,0.4)_0%,rgba(245,247,251,0.12)_54%,rgba(245,247,251,0.72)_100%)]" />
      <div className="mx-auto max-w-[1280px] px-5 pt-16 pb-20 sm:px-8 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-28">
        <div className="relative max-w-2xl rounded-3xl bg-white/60 p-8 backdrop-blur-md sm:p-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
            {t.hero.badge}
          </p>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl lg:text-6xl">
            {t.hero.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
            {t.hero.body}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <StartButton className={primaryButtonClass}>
              {t.hero.ctaPrimary}
            </StartButton>
            <StartButton className={ghostButtonClass}>
              {t.hero.ctaSecondary}
            </StartButton>
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">
            {t.hero.fineprint}
          </p>
        </div>
        <div className="relative mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-[var(--line)] pt-8">
          {t.hero.chips.map((item) => (
            <p
              key={item}
              className="text-xs font-semibold uppercase text-[var(--muted)]"
            >
              · {item}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SocialProof() {
  const { t } = useLanguage();
  const tones = ["teal", "blue", "blue", "gold", "teal", "blue"] as const;
  const glyphs = ["+", "C", "N", "A", "D", "B"];

  return (
    <section className="border-y border-[var(--line)] bg-white/55 px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
            {t.socialProof.badge}
          </span>
          <p className="max-w-xl text-base font-medium text-[var(--ink)]">
            {t.socialProof.earlyAccess}
          </p>
        </div>
        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {t.socialProof.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[24px] border border-[var(--line)] bg-white/80 p-5 text-center shadow-[0_14px_34px_rgba(15,23,42,0.04)]"
            >
              <p className="text-3xl font-semibold tracking-tight text-[var(--primary)]">{stat.value}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{stat.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-12 text-center text-xs font-semibold uppercase text-[var(--muted)]">
          {t.socialProof.heading}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {t.socialProof.customers.map((customer, i) => (
            <div
              key={customer.name}
              className="flex min-h-24 items-center gap-3 rounded-[24px] border border-[var(--line)] bg-white/80 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.04)]"
            >
              <BrandGlyph label={glyphs[i]} tone={tones[i]} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--ink)]">{customer.name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{customer.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-[var(--muted)]">
          {t.socialProof.footer}
        </p>
      </div>
    </section>
  );
}

export function Problem() {
  const { t } = useLanguage();
  return (
    <section className={sectionPadding}>
      <div className="mx-auto max-w-[1100px]">
        <SectionHeading
          eyebrow={t.problem.eyebrow}
          title={t.problem.title}
          body={t.problem.body}
        />
        <ul className="mt-12 grid gap-3 sm:grid-cols-2">
          {t.problem.pains.map((p) => (
            <li
              key={p}
              className="flex gap-3 rounded-[24px] border border-[var(--line)] bg-white/70 p-5 text-[15px] leading-6 text-[var(--ink)]"
            >
              <span
                aria-hidden="true"
                className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#fee2e2] text-[12px] font-bold text-[#be123c]"
              >
                ×
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center text-lg font-medium text-[var(--ink)]">
          {t.problem.closing}
        </p>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const { t } = useLanguage();
  const stepNumbers = ["01", "02", "03"];
  return (
    <section id="how" className={`${sectionPadding} bg-white/55`}>
      <div className="mx-auto max-w-[1280px]">
        <SectionHeading
          eyebrow={t.how.eyebrow}
          title={t.how.title}
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {t.how.steps.map((s, i) => (
            <GlassCard key={stepNumbers[i]} className="flex h-full flex-col gap-5">
              <span className="text-xs font-semibold uppercase text-[var(--primary)]">
                {t.how.stepLabel} {stepNumbers[i]}
              </span>
              <h3 className="text-2xl font-semibold text-[var(--ink)]">
                {s.title}
              </h3>
              <p className="text-[15px] leading-7 text-[var(--muted)]">{s.body}</p>
              <div className="mt-2">
                <StepVisual step={stepNumbers[i]} />
              </div>
            </GlassCard>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <StartButton className={primaryButtonClass}>
            {t.how.cta}
          </StartButton>
        </div>
      </div>
    </section>
  );
}

export function Features() {
  const { t } = useLanguage();
  const meta = [
    { glyph: "A", tone: "blue" as const },
    { glyph: "H", tone: "gold" as const },
    { glyph: "T", tone: "teal" as const },
    { glyph: "Q", tone: "blue" as const },
    { glyph: "S", tone: "teal" as const },
    { glyph: "D", tone: "gold" as const },
    { glyph: "#", tone: "teal" as const },
    { glyph: "L", tone: "blue" as const },
  ];
  return (
    <section id="features" className={sectionPadding}>
      <div className="mx-auto max-w-[1280px]">
        <SectionHeading
          eyebrow={t.features.eyebrow}
          title={t.features.title}
        />
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {t.features.items.map((f, i) => (
            <GlassCard key={f.title} className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <BrandGlyph label={meta[i].glyph} tone={meta[i].tone} />
                <div>
                  <h3 className="text-xl font-semibold text-[var(--ink)]">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-7 text-[var(--muted)]">{f.body}</p>
                </div>
              </div>
              <p className="mt-auto text-xs font-semibold uppercase text-[var(--teal)]">
                {f.tag}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Differentiators() {
  const { t } = useLanguage();
  const visuals = ["hold", "natural", "selfservice"] as const;
  return (
    <section className={`${sectionPadding} bg-white/55`}>
      <div className="mx-auto max-w-[1280px] space-y-20 lg:space-y-28">
        <SectionHeading
          eyebrow={t.differentiators.eyebrow}
          title={t.differentiators.title}
        />
        {t.differentiators.blocks.map((b, i) => (
          <div
            key={b.heading}
            className="grid items-center gap-10 lg:grid-cols-2"
          >
            <div className={i % 2 === 1 ? "lg:order-2" : ""}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
                {b.tag}
              </p>
              <h3 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
                {b.heading}
              </h3>
              <p className="mt-5 text-base leading-8 text-[var(--muted)]">{b.body}</p>
            </div>
            <DifferentiatorVisual type={visuals[i]} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function IndustryLanguage() {
  const { t } = useLanguage();
  const tones = [
    "from-[rgba(13,148,136,0.16)] to-[rgba(26,115,232,0.06)] text-[var(--teal)]",
    "from-[rgba(26,115,232,0.16)] to-[rgba(13,148,136,0.07)] text-[var(--primary)]",
    "from-[rgba(26,115,232,0.16)] to-[rgba(13,148,136,0.07)] text-[var(--primary)]",
    "from-[rgba(217,119,6,0.16)] to-[rgba(26,115,232,0.05)] text-[#b45309]",
  ];
  return (
    <section className={sectionPadding}>
      <div className="mx-auto max-w-[1280px]">
        <SectionHeading
          eyebrow={t.industryLanguage.eyebrow}
          title={t.industryLanguage.title}
          body={t.industryLanguage.body}
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.industryLanguage.verticals.map((v, i) => (
            <div
              key={v.label}
              className="rounded-[24px] border border-[var(--line)] bg-white/80 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]"
            >
              <div className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-sm font-bold ${tones[i]}`}>
                {v.label.charAt(0)}
              </div>
              <p className="mt-4 text-base font-semibold text-[var(--ink)]">{v.label}</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 rounded-xl bg-[rgba(245,247,251,0.88)] px-3 py-2">
                  <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--primary)]">●</span>
                  <span className="font-semibold text-[var(--ink)]">{v.client}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-[rgba(245,247,251,0.88)] px-3 py-2">
                  <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--teal-soft)] text-[10px] font-bold text-[var(--teal)]">▣</span>
                  <span className="font-semibold text-[var(--teal)]">{v.booking}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function UseCases() {
  const { t } = useLanguage();
  const { onSelectVertical } = useLandingActions();
  const variants = ["healthcare", "spaces", "professional", "events"] as const;
  return (
    <section id="use-cases" className={sectionPadding}>
      <div className="mx-auto max-w-[1280px]">
        <SectionHeading eyebrow={t.useCases.eyebrow} title={t.useCases.title} />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {t.useCases.cards.map((c, i) => (
            <button
              key={c.title}
              type="button"
              onClick={() => onSelectVertical(variants[i])}
              className="text-left transition hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
            >
              <GlassCard className="flex h-full flex-col gap-4 transition hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
                <UseCaseVisual variant={variants[i]} />
                <h3 className="text-lg font-semibold text-[var(--ink)]">
                  {c.title}
                </h3>
                <p className="text-[15px] leading-7 text-[var(--muted)]">{c.body}</p>
                <span className="mt-auto text-sm font-semibold text-[var(--primary)]">
                  {t.useCases.cta} →
                </span>
              </GlassCard>
            </button>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-xl text-center text-sm text-[var(--muted)]">
          {t.useCases.note}
        </p>
        <div className="mt-8 flex justify-center">
          <StartButton className={primaryButtonClass}>
            {t.useCases.cta}
          </StartButton>
        </div>
      </div>
    </section>
  );
}

export function MobileSection() {
  const { t } = useLanguage();
  return (
    <section className={`${sectionPadding} bg-white/55`}>
      <div className="mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-[1fr_0.85fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
            {t.mobile.eyebrow}
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl lg:text-5xl">
            {t.mobile.title}
          </h2>
          <p className="mt-5 text-base leading-8 text-[var(--muted)]">
            {t.mobile.body}
          </p>
        </div>
        <div className="grid justify-items-center gap-5 sm:grid-cols-3">
          <MobileScreen type="calendar" />
          <MobileScreen type="slots" />
          <MobileScreen type="confirm" />
        </div>
      </div>
    </section>
  );
}

export function FAQ() {
  const { t } = useLanguage();
  return (
    <section id="faq" className={sectionPadding}>
      <div className="mx-auto max-w-[920px]">
        <SectionHeading eyebrow={t.faq.eyebrow} title={t.faq.title} />
        <div className="mt-12 divide-y divide-[var(--line)] rounded-[28px] border border-[var(--line)] bg-white/75">
          {t.faq.items.map((item) => (
            <details key={item.q} className="group px-6 py-5 sm:px-8">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left">
                <span className="text-base font-semibold text-[var(--ink)] sm:text-lg">
                  {item.q}
                </span>
                <span
                  aria-hidden="true"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)] transition group-open:rotate-45 group-open:border-[var(--primary)] group-open:text-[var(--primary)]"
                >
                  +
                </span>
              </summary>
              <p className="mt-4 text-[15px] leading-7 text-[var(--muted)]">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <StartButton className={primaryButtonClass}>
            {t.how.cta}
          </StartButton>
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  const { t } = useLanguage();
  const tones = ["teal", "blue", "gold"] as const;
  const initials = ["✚", "◎", "↗"];
  return (
    <section className={`${sectionPadding} bg-white/55`}>
      <div className="mx-auto max-w-[1280px]">
        <SectionHeading eyebrow={t.testimonials.eyebrow} title={t.testimonials.title} />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {t.testimonials.items.map((item, i) => (
            <GlassCard key={item.quote} className="flex h-full flex-col justify-between gap-6">
              <p className="text-lg leading-8 text-[var(--ink)]">&ldquo;{item.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <CustomerAvatar initials={initials[i]} tone={tones[i]} />
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">{item.name}</p>
                  <p className="text-xs text-[var(--muted)]">{item.role}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-[var(--muted)]">
          {t.testimonials.note}
        </p>
      </div>
    </section>
  );
}

export function PricingTeaser() {
  const { t } = useLanguage();
  return (
    <section className={sectionPadding}>
      <div className="mx-auto grid max-w-[1040px] overflow-hidden rounded-[36px] border border-[var(--line)] bg-white/85 shadow-[0_24px_64px_rgba(15,23,42,0.07)] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
            {t.pricing.eyebrow}
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            {t.pricing.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--muted)]">
            {t.pricing.body}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <StartButton className={primaryButtonClass}>
              {t.pricing.startFree}
            </StartButton>
            <StartButton className="inline-flex items-center justify-center rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-white">
              {t.pricing.viewPricing}
            </StartButton>
          </div>
        </div>
        <div className="border-t border-[var(--line)] bg-[linear-gradient(135deg,rgba(26,115,232,0.08),rgba(13,148,136,0.1))] p-8 sm:p-10 lg:border-l lg:border-t-0">
          <div className="rounded-[28px] border border-white/80 bg-white/78 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            {t.pricing.features.map((item) => (
              <div key={item} className="flex items-center gap-3 border-b border-[var(--line)] py-3 last:border-b-0">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--teal-soft)] text-xs font-bold text-[var(--teal)]">
                  ✓
                </span>
                <span className="text-sm font-semibold text-[var(--ink)]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalCTA() {
  const { t } = useLanguage();
  return (
    <section className="relative overflow-hidden px-5 py-24 sm:px-8 lg:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(26,115,232,0.95),rgba(79,142,241,0.92))]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" />
      <div className="relative mx-auto max-w-[920px] text-center">
        <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {t.finalCta.title}
        </h2>
        <p className="mt-5 text-lg leading-8 text-white/85">
          {t.finalCta.body}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <StartButton className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[var(--primary)] shadow-[0_18px_44px_rgba(15,23,42,0.18)] transition hover:bg-white/90">
            {t.finalCta.ctaPrimary}
          </StartButton>
          <StartButton className="inline-flex items-center justify-center rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            {t.finalCta.ctaSecondary}
          </StartButton>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-[var(--line)] bg-white/65 px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] text-sm font-bold text-white">
                H
              </span>
              <span className="text-base font-semibold text-[var(--ink)]">{t.nav.brand}</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-[var(--muted)]">
              {t.footer.tagline}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--ink)]">
              {t.footer.productHeading}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              <li>
                <a href="#how" className="hover:text-[var(--ink)]">
                  {t.footer.product.how}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[var(--ink)]">
                  {t.footer.product.features}
                </a>
              </li>
              <li>
                <a href="#use-cases" className="hover:text-[var(--ink)]">
                  {t.footer.product.useCases}
                </a>
              </li>
              <li>
                <StartButton className="text-left hover:text-[var(--ink)]">
                  {t.footer.product.seeLivePage}
                </StartButton>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--ink)]">
              {t.footer.companyHeading}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              <li>
                <Link href="/about" className="hover:text-[var(--ink)]">
                  {t.footer.company.about}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[var(--ink)]">
                  {t.footer.company.contact}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[var(--ink)]">
                  {t.footer.company.pricing}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--ink)]">
              {t.footer.legalHeading}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              <li>
                <Link href="/privacy" className="hover:text-[var(--ink)]">
                  {t.footer.legal.privacy}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[var(--ink)]">
                  {t.footer.legal.terms}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-[var(--line)] pt-6 text-sm text-[var(--muted)] sm:flex-row sm:items-center">
          <p>{t.footer.copyright}</p>
          <StartButton className="font-semibold text-[var(--primary)] hover:underline">
            {t.footer.createLink}
          </StartButton>
        </div>
      </div>
    </footer>
  );
}

// Full marketing landing. `afterHero` is slotted directly below the hero — the
// host (HomeExperience) injects the verticals picker or the "go to dashboard"
// panel there, depending on auth/configuration state.
export function LandingPage({ afterHero }: { afterHero?: ReactNode }) {
  return (
    <>
      <StickyNav />
      <main className="flex-1">
        <Hero />
        {afterHero}
        <SocialProof />
        <Problem />
        <HowItWorks />
        <Features />
        <IndustryLanguage />
        <Differentiators />
        <UseCases />
        <MobileSection />
        <FAQ />
        <Testimonials />
        <PricingTeaser />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
