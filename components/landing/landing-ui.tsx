"use client";

import Link from "next/link";
import { List } from "@phosphor-icons/react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEMO_PAGES, getDemoPagePath } from "@/lib/demo-pages";
import { cn } from "@/lib/utils";
import type { VerticalId } from "@/lib/types";
import { HeroBookingPreview } from "./hero-preview";
import { useLanguage } from "./language-provider";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { LiveDemoDialog } from "./live-demo-dialog";
import { StartPageDialog } from "./start-page-dialog";

// Verticals shown on the landing page, in display order. These map 1:1 to the
// `VerticalId`s in config/verticals.ts and to the UseCases card variants below.
export type LandingVertical = VerticalId;

// Wiring from the host page (HomeExperience) into the landing UI: a generic
// "start setup" action and a per-vertical selection. Defaults are no-ops so the
// landing components stay renderable in isolation.
type LandingActions = {
  onStart: () => void;
  onSelectVertical: (vertical: LandingVertical, pageName?: string) => void;
  /** True once the visitor already has a booking page: CTAs go to it directly. */
  hasPage?: boolean;
  /** True when this browser holds an unfinished or unpublished guest draft. */
  hasDraft?: boolean;
  /** Whether an account session already exists, which hides the log-in entries. */
  loggedIn?: boolean;
  /** Sign-in URL that returns to this page, language included. */
  loginHref?: string;
  /** Opens the workspace for a signed-in provider who finished setup. */
  onOpenDashboard?: () => void;
};

const LandingActionsContext = createContext<LandingActions>({
  onStart: () => {},
  onSelectVertical: () => {},
});

// Landing-owned dialogs: the progressive "create your page" first step and the
// embedded live demo. Kept in context so every CTA on the page can open them.
type LandingDialogs = {
  openStart: () => void;
  openDemo: () => void;
};

const LandingDialogsContext = createContext<LandingDialogs>({
  openStart: () => {},
  openDemo: () => {},
});

function useLandingDialogs() {
  return useContext(LandingDialogsContext);
}

function LandingDialogsProvider({ children }: { children: ReactNode }) {
  const { onSelectVertical, onStart, hasPage, hasDraft } = useLandingActions();
  const [startOpen, setStartOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <LandingDialogsContext.Provider
      value={{
        // Someone who already has a page does not need to name one again.
        openStart: () =>
          getLandingStartMode({ hasDraft, hasPage }) === "resume"
            ? onStart()
            : setStartOpen(true),
        openDemo: () => setDemoOpen(true),
      }}
    >
      {children}
      <StartPageDialog
        open={startOpen}
        onClose={() => setStartOpen(false)}
        onSubmit={(vertical, pageName) => {
          setStartOpen(false);
          onSelectVertical(vertical, pageName);
        }}
      />
      <LiveDemoDialog open={demoOpen} onClose={() => setDemoOpen(false)} />
    </LandingDialogsContext.Provider>
  );
}

export function getLandingStartMode({
  hasDraft,
  hasPage,
}: {
  hasDraft?: boolean;
  hasPage?: boolean;
}) {
  return hasDraft || hasPage ? "resume" : "dialog";
}

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

// Primary CTA everywhere on the page. Opens the lightweight first step (pick a
// workflow, name the page) instead of dropping the visitor into setup.
function StartButton({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const { openStart } = useLandingDialogs();
  return (
    <button type="button" onClick={openStart} className={className}>
      {children}
    </button>
  );
}

// Secondary CTA: opens the real public page inline, no account, no navigation.
function DemoButton({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const { openDemo } = useLandingDialogs();
  return (
    <button type="button" onClick={openDemo} className={className}>
      {children}
    </button>
  );
}

/**
 * The returning-provider entry point. A visitor with an account has no use for
 * "create your page", so every placement of this shows one of three things: a
 * sign-in link, a way into the workspace once setup is done, or nothing at all
 * while a signed-in provider is still mid-setup (the primary CTA continues that).
 */
function useAccountEntry() {
  const { hasPage, loggedIn, loginHref, onOpenDashboard } = useLandingActions();
  const { t } = useLanguage();

  if (!loggedIn) {
    return loginHref
      ? ({ kind: "login", href: loginHref, label: t.nav.logIn } as const)
      : null;
  }

  return hasPage && onOpenDashboard
    ? ({ kind: "dashboard", onClick: onOpenDashboard, label: t.nav.dashboard } as const)
    : null;
}

/** Footer variant: drops the whole row rather than leaving an empty bullet. */
function AccountEntryListItem() {
  const entry = useAccountEntry();

  if (!entry) {
    return null;
  }

  return (
    <li>
      <AccountEntry className="text-left hover:text-[var(--ink)]" />
    </li>
  );
}

function AccountEntry({ className }: { className: string }) {
  const entry = useAccountEntry();

  if (!entry) {
    return null;
  }

  return entry.kind === "login" ? (
    <a href={entry.href} className={className}>
      {entry.label}
    </a>
  ) : (
    <button type="button" onClick={entry.onClick} className={className}>
      {entry.label}
    </button>
  );
}

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-[var(--ink)] px-7 py-3 text-sm font-semibold !text-white transition hover:bg-[var(--ink)]/90 active:translate-y-px";

// Secondary actions read as links with a rule under them. Only the one action
// that starts a page is allowed a filled button, so nothing competes with it.
const secondaryLinkClass =
  "inline-flex items-center border-b border-[var(--primary)] pb-0.5 text-sm font-semibold text-[var(--primary)] transition hover:border-[var(--ink)] hover:text-[var(--ink)]";


const sectionPadding = "px-5 py-20 sm:px-8 sm:py-24 lg:py-28";
const liveExamplePaths = DEMO_PAGES.map(getDemoPagePath);

function localizedExamplePath(path: string, lang: "en" | "es") {
  return `${path}?lang=${lang}`;
}

function tryBookingPath(lang: "en" | "es") {
  return `/try-booking?lang=${lang}`;
}

export function galleryPath(lang: "en" | "es") {
  return `/gallery?lang=${lang}`;
}

/**
 * How many examples there are is written once, in DEMO_PAGES. Copy that names
 * the number carries a {n} placeholder instead, because a hand-written count
 * goes stale the moment a demo is added.
 */
export function formatDemoCount(template: string, count: number) {
  return template.replace("{n}", String(count));
}

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











function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-[var(--line)] bg-[var(--surface-lowest)] p-6 ${className}`}
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

/**
 * True once the hero's action row has scrolled out of view, so the nav's own
 * primary can take over without two filled buttons sharing a screen. Pages
 * without a hero (the gallery) pass `alwaysShowCta` instead of watching.
 */
function useHeroPassed(alwaysShowCta: boolean) {
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    if (alwaysShowCta || typeof IntersectionObserver === "undefined") {
      return;
    }

    const anchor = document.getElementById("hero-cta-anchor");

    if (!anchor) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setPassed(!entry.isIntersecting),
      { rootMargin: "-8px 0px 0px 0px" },
    );

    observer.observe(anchor);
    return () => observer.disconnect();
  }, [alwaysShowCta]);

  return alwaysShowCta || passed;
}

export function StickyNav({ alwaysShowCta = false }: { alwaysShowCta?: boolean } = {}) {
  const { lang, setLang, t } = useLanguage();
  const heroPassed = useHeroPassed(alwaysShowCta);
  const navLinks = [
    { href: "#live-examples", label: t.nav.links.examples },
    { href: "#how", label: t.nav.links.how },
    { href: "#verticals", label: t.nav.links.useCases },
    { href: "#faq", label: t.nav.links.faq },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[rgba(193,198,214,0.72)] bg-[rgba(248,249,252,0.86)] shadow-[0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-2xl">
      <div className="mx-auto flex min-h-[72px] max-w-[1344px] items-center justify-between gap-4 px-4 py-3 sm:min-h-[80px] sm:px-8 sm:py-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[var(--primary-container)] text-sm font-bold text-white shadow-[0_8px_22px_rgba(26,115,232,0.26)] sm:h-10 sm:w-10">
            H
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ink)] max-[379px]:sr-only sm:text-base">
            {t.nav.brand}
          </span>
        </Link>
        <nav className="hidden items-center gap-7 xl:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-1 py-2 text-sm font-semibold text-[var(--ink)] transition hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 xl:gap-5">
          <div className="hidden xl:block">
            <LanguageSwitcher lang={lang} onChange={setLang} />
          </div>
          <AccountEntry className="hidden rounded-md px-1 py-2 text-sm font-semibold text-[var(--ink)] transition hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] xl:inline-flex" />
          <StartButton
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--ink)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-2 active:translate-y-px sm:min-h-12 sm:px-5",
              // Hidden rather than unmounted: the layout stays put as it appears.
              heroPassed ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <span className="sm:hidden">{t.nav.createPageShort}</span>
            <span className="hidden sm:inline">{t.nav.createPageLong}</span>
          </StartButton>
          <details className="group relative xl:hidden">
            <summary
              aria-label={t.nav.openMenu}
              className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-full border border-[var(--line)] bg-white/55 text-[var(--ink)] transition marker:content-none hover:border-[var(--muted)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]"
            >
              <List aria-hidden="true" weight="bold" className="h-5 w-5" />
            </summary>
            <nav
              aria-label="Mobile"
              className="absolute right-0 top-full mt-3 w-64 rounded-2xl border border-[var(--line)] bg-[rgba(248,249,252,0.98)] p-2.5 shadow-[0_18px_46px_rgba(15,23,42,0.12)] backdrop-blur-xl"
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
              <div className="mt-1 border-t border-[var(--line)] pt-1.5">
                <LanguageSwitcher
                  lang={lang}
                  onChange={setLang}
                  className="w-full justify-start"
                />
                <AccountEntry className="block w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-[var(--primary)] transition hover:bg-white" />
              </div>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

function HeroAccountLine() {
  const entry = useAccountEntry();
  const { t } = useLanguage();

  if (!entry) {
    return null;
  }

  return (
    <p className="mt-2 text-sm text-[var(--muted)]">
      {entry.kind === "login" ? `${t.hero.returningPrompt} ` : ""}
      <AccountEntry className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline" />
    </p>
  );
}

export function Hero() {
  const { t } = useLanguage();
  return (
    <section className="relative overflow-hidden border-b border-[var(--line)] bg-[linear-gradient(145deg,#f5f7fb_0%,#edf4ff_54%,#e9f8f5_100%)]">
      <div className="pointer-events-none absolute -right-24 -top-32 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(26,115,232,0.16),transparent_68%)]" />
      <div className="pointer-events-none absolute -bottom-56 left-1/3 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(13,148,136,0.12),transparent_68%)]" />
      {/* On phones the preview slots between the headline and the supporting
          copy so the running hold is on screen without scrolling. On large
          screens it moves into its own column beside the full text block. */}
      <div className="relative mx-auto grid max-w-[1280px] gap-5 px-5 pb-8 pt-5 sm:gap-6 sm:px-8 sm:py-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-x-14 lg:gap-y-6 lg:py-18">
        <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
          <h1 className="mt-3 max-w-3xl text-balance text-[2.1rem] font-semibold leading-[1.05] tracking-[-0.045em] text-[var(--ink)] sm:mt-5 sm:text-5xl lg:text-[3.65rem] lg:leading-[1.02]">
            {t.hero.title}
          </h1>
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center lg:pl-2">
          <HeroBookingPreview className="mx-auto w-full max-w-[440px] lg:max-w-none" />
          <p className="mt-3 text-center text-xs text-[var(--muted)] lg:text-left">
            {t.hero.previewCaption}
          </p>
        </div>

        <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
          <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
            {t.hero.body}
          </p>
          <div id="hero-cta-anchor" className="mt-5 flex flex-wrap items-center gap-3 sm:mt-7">
            <StartButton className={primaryButtonClass}>{t.hero.ctaPrimary}</StartButton>
            <DemoButton className={secondaryLinkClass}>
              <span className="haab-live-dot mr-2 h-1.5 w-1.5 rounded-full bg-[var(--teal)]" aria-hidden="true" />
              {t.hero.ctaSecondary}
            </DemoButton>
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">{t.hero.fineprint}</p>
          {/* Second placement, at the exact moment someone realises the primary
              CTA is not for them: they already have a page. */}
          <HeroAccountLine />
        </div>
      </div>
    </section>
  );
}

/**
 * A single example page. `index` addresses both DEMO_PAGES and the landing
 * copy's items list, which are kept the same length by demo-pages.test.ts — so
 * one number is enough to pair a card with the page it opens.
 */
export function DemoCard({ index }: { index: number }) {
  const { lang, t } = useLanguage();
  const item = t.liveExamples.items[index];

  if (!item) {
    return null;
  }

  return (
    <Link
      href={localizedExamplePath(liveExamplePaths[index], lang)}
      className="group flex min-h-56 flex-col rounded-lg border border-[var(--line)] bg-white p-5 transition hover:border-[rgba(26,115,232,0.28)]"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          {item.vertical}
        </p>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
          <span className="haab-live-dot h-1.5 w-1.5 rounded-full bg-[var(--teal)]" aria-hidden="true" />
          {t.liveExamples.liveBadge}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-[-0.015em] text-[var(--ink)]">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.proof}</p>
      <span className="mt-auto pt-5 text-sm font-semibold text-[var(--primary)] group-hover:underline">
        {item.cta} →
      </span>
    </Link>
  );
}

export function DemoGrid({ indexes }: { indexes: number[] }) {
  return (
    <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {indexes.map((index) => (
        <DemoCard key={index} index={index} />
      ))}
    </div>
  );
}

/**
 * The landing section. `featured` is chosen on the server so a visit can show a
 * different handful without the shuffle causing a hydration mismatch; the rest
 * live in the gallery.
 */
export function LiveExamples({ featured }: { featured: number[] }) {
  const { lang, t } = useLanguage();

  return (
    <section id="live-examples" className="scroll-mt-20 border-b border-[var(--line)] bg-white/70 px-5 py-14 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
              {t.liveExamples.eyebrow}
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
              {t.liveExamples.title}
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-[var(--muted)]">
            {formatDemoCount(t.liveExamples.body, DEMO_PAGES.length)}
          </p>
        </div>
        <DemoGrid indexes={featured} />
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link href={galleryPath(lang)} className={secondaryLinkClass}>
            {formatDemoCount(t.liveExamples.seeAll, DEMO_PAGES.length)}
          </Link>
          <p className="text-center text-xs text-[var(--muted)]">
            {formatDemoCount(t.liveExamples.note, DEMO_PAGES.length)}
          </p>
        </div>
      </div>
    </section>
  );
}



export function HowItWorks() {
  const { t } = useLanguage();
  const stepNumbers = ["01", "02", "03"];
  return (
    <section id="how" className="scroll-mt-20 bg-white/55 px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-[1280px]">
        <SectionHeading
          eyebrow={t.how.eyebrow}
          title={t.how.title}
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {t.how.steps.map((s, i) => (
            <GlassCard key={stepNumbers[i]} className="flex h-full flex-col gap-4">
              <span className="font-mono text-xs font-semibold uppercase tracking-[0.1em] tabular-nums text-[var(--primary)]">
                {t.how.stepLabel} {stepNumbers[i]}
              </span>
              <h3 className="text-2xl font-semibold text-[var(--ink)]">
                {s.title}
              </h3>
              <p className="text-[15px] leading-7 text-[var(--muted)]">{s.body}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Features() {
  const { t } = useLanguage();
  const meta = [
    { glyph: "0", tone: "blue" as const },
    { glyph: "H", tone: "gold" as const },
    { glyph: "3", tone: "teal" as const },
    { glyph: "#", tone: "teal" as const },
    { glyph: "↗", tone: "blue" as const },
  ];
  return (
    <section id="features" className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-[1280px]">
        <SectionHeading
          eyebrow={t.features.eyebrow}
          title={t.features.title}
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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





/**
 * Reliability, privacy, and scope. Every claim here describes behavior that
 * ships today; the last item names what does not, which is the part that makes
 * the other three believable while the product is in early access.
 */
export function Trust() {
  const { t } = useLanguage();

  return (
    <section id="trust" className="scroll-mt-20 border-y border-[var(--line)] bg-white/55 px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-[1280px]">
        <SectionHeading eyebrow={t.trust.eyebrow} title={t.trust.title} />
        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
          {t.trust.items.map((item) => (
            <div key={item.title} className="bg-[var(--surface-lowest)] p-6 sm:p-7">
              <h3 className="text-base font-semibold tracking-[-0.01em] text-[var(--ink)]">
                {item.title}
              </h3>
              <p className="mt-2.5 text-[15px] leading-7 text-[var(--muted)]">{item.body}</p>
            </div>
          ))}
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



export function FinalCTA() {
  const { t } = useLanguage();
  return (
    <section id="early-access" className="relative scroll-mt-20 overflow-hidden px-5 py-20 sm:px-8 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(26,115,232,0.95),rgba(79,142,241,0.92))]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" />
      <div className="relative mx-auto max-w-[920px] text-center">
        <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {t.finalCta.title}
        </h2>
        <p className="mt-5 text-lg leading-8 text-white/85">
          {t.finalCta.body}
        </p>
        <div className="mt-9 flex flex-col items-center gap-4">
          <StartButton className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-white/90">
            {t.finalCta.ctaPrimary}
          </StartButton>
          <p className="text-sm !text-white/70">{t.finalCta.fineprint}</p>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const { lang, t } = useLanguage();
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
                <a href="#verticals" className="hover:text-[var(--ink)]">
                  {t.footer.product.useCases}
                </a>
              </li>
              <li>
                <a href={tryBookingPath(lang)} className="text-left hover:text-[var(--ink)]">
                  {t.footer.product.seeLivePage}
                </a>
              </li>
              <AccountEntryListItem />
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
                <a href="#early-access" className="hover:text-[var(--ink)]">
                  {t.footer.company.pricing}
                </a>
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
export function LandingPage({
  afterHero,
  featuredDemos,
}: {
  afterHero?: ReactNode;
  /** Chosen on the server; see lib/demo-gallery.ts. */
  featuredDemos: number[];
}) {
  return (
    <LandingDialogsProvider>
      <StickyNav />
      <main className="flex-1">
        <Hero />
        <LiveExamples featured={featuredDemos} />
        {afterHero}
        <HowItWorks />
        <Features />
        <Trust />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </LandingDialogsProvider>
  );
}
