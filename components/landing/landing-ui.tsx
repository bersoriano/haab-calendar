"use client";

import Link from "next/link";
import { ArrowRight, List, Minus, Plus } from "@phosphor-icons/react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DEMO_PAGES } from "@/lib/demo-pages";
import { resolveLandingAccountEntry } from "@/lib/landing-account-entry";
import { cn } from "@/lib/utils";
import type { VerticalId } from "@/lib/types";
import { HeroBookingPreview } from "./hero-preview";
import { useLanguage } from "./language-provider";
import { LiveDemoDialog } from "./live-demo-dialog";
import { BrandLink } from "./brand";
import { DemoGrid } from "./demo-card";
import { formatDemoCount } from "./demo-count";
import { FactStrip } from "./fact-strip";
import { GoogleIntegration } from "./google-integration";
import { HowItWorks } from "./how-it-works";
import { Features } from "./night-features";
import { HeadlineUnderline, HeroBackdrop } from "./hero-art";
import { LangPill } from "./lang-pill";
import { Reveal } from "./reveal";
import { Trust } from "./trust";
import {
  CheckChip,
  LandingScope,
  Eyebrow,
  LpButton,
  SectionHeading as LpSectionHeading,
  lpBody,
  lpButtonClass,
  lpDisplay,
  lpMono,
} from "./primitives";
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

/**
 * The primary action's label. `onStart` already sends an owner with a page to
 * their dashboard, so the wording follows the destination instead of always
 * offering to create something that exists.
 */
function usePrimaryCtaLabel() {
  const { hasPage } = useLandingActions();
  const { t } = useLanguage();

  return hasPage ? t.nav.dashboard : t.hero.ctaPrimary;
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
 * The returning-provider entry point: a sign-in link, or a way back into the
 * workspace. See lib/landing-account-entry.ts for why setup state does not
 * gate this.
 */
function useAccountEntry() {
  const { loggedIn, loginHref, onOpenDashboard } = useLandingActions();
  const { t } = useLanguage();

  const entry = resolveLandingAccountEntry({
    loggedIn: Boolean(loggedIn),
    canOpenDashboard: Boolean(onOpenDashboard),
    hasLoginHref: Boolean(loginHref),
  });

  if (entry === "login" && loginHref) {
    return { kind: "login", href: loginHref, label: t.nav.logIn } as const;
  }

  if (entry === "dashboard" && onOpenDashboard) {
    return { kind: "dashboard", onClick: onOpenDashboard, label: t.nav.dashboard } as const;
  }

  return null;
}

/** Footer variant: drops the whole row rather than leaving an empty bullet. */
function AccountEntryListItem() {
  const entry = useAccountEntry();

  if (!entry) {
    return null;
  }

  return (
    <li>
      <AccountEntry className="rounded-sm text-left text-[15px] text-[var(--lp-night-ink)] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-mint-300)] lg:text-[15.5px]" />
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

function tryBookingPath(lang: "en" | "es") {
  return `/try-booking?lang=${lang}`;
}

/**
 * Section links are same-page anchors on the landing page. Anywhere else they
 * have to name the landing page first, or they scroll nowhere.
 */
function sectionAnchor(goHome: boolean, lang: "en" | "es") {
  return (id: string) => (goHome ? `/?lang=${lang}#${id}` : `#${id}`);
}

export function galleryPath(lang: "en" | "es") {
  return `/gallery?lang=${lang}`;
}

export { DemoGrid, GoogleIntegration, formatDemoCount };

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

export function StickyNav({
  alwaysShowCta = false,
  showUseCases = true,
  anchorsGoHome = false,
}: {
  alwaysShowCta?: boolean;
  showUseCases?: boolean;
  /** Set on pages that reuse this nav but carry none of its sections. */
  anchorsGoHome?: boolean;
} = {}) {
  const { lang, setLang, t } = useLanguage();
  const { hasPage } = useLandingActions();
  const anchor = sectionAnchor(anchorsGoHome, lang);
  const heroPassed = useHeroPassed(alwaysShowCta);
  const navLinks = [
    { href: anchor("live-examples"), label: t.nav.links.examples },
    { href: anchor("how"), label: t.nav.links.how },
    ...(showUseCases ? [{ href: anchor("verticals"), label: t.nav.links.useCases }] : []),
    { href: anchor("faq"), label: t.nav.links.faq },
  ];
  const navLinkClass =
    "rounded-md px-1 py-2 text-[15.5px] font-semibold text-[var(--lp-ink-2)] transition hover:text-[var(--lp-teal-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-teal-600)]";

  return (
    <header
      className={cn(
        lpBody,
        "sticky top-0 z-40 w-full bg-[rgba(243,249,247,0.86)] backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex h-[68px] w-full max-w-[1264px] items-center justify-between gap-4 px-5 sm:px-8 xl:h-[88px]">
        <BrandLink label={t.nav.brand} hideLabelOnTiny />
        <nav className="hidden items-center gap-7 xl:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className={navLinkClass}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2 xl:gap-3.5">
          <LangPill lang={lang} onChange={setLang} />
          <AccountEntry className="hidden rounded-md px-2 py-2.5 text-[15.5px] font-semibold text-[var(--lp-ink)] transition hover:text-[var(--lp-teal-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-teal-600)] xl:inline-flex" />
          {hasPage ? null : (
            <StartButton
              className={cn(
                lpButtonClass({ variant: "primary", size: "nav" }),
                // Phones have no room beside the pill and menu; the menu
                // carries the action there instead.
                "max-sm:hidden",
                // Hidden rather than unmounted: the layout stays put as it appears.
                heroPassed ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              {t.nav.createPageLong}
              <ArrowRight aria-hidden="true" weight="bold" className="h-4 w-4" />
            </StartButton>
          )}
          <details className="group relative xl:hidden">
            <summary
              aria-label={t.nav.openMenu}
              className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-[14px] border border-[#d6e3e0] bg-white text-[var(--lp-ink)] transition marker:content-none hover:border-[var(--lp-teal-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-teal-600)]"
            >
              <List aria-hidden="true" weight="bold" className="h-5 w-5" />
            </summary>
            <nav
              aria-label="Mobile"
              className="absolute right-0 top-full mt-3 w-64 rounded-[20px] border border-[var(--lp-line)] bg-white p-2.5 shadow-[var(--lp-shadow-raised)]"
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block rounded-xl px-4 py-3 text-[15px] font-semibold text-[var(--lp-ink-2)] transition hover:bg-[var(--lp-paper)] hover:text-[var(--lp-teal-700)]"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-1 border-t border-[var(--lp-line-soft)] pt-1.5">
                {hasPage ? null : (
                  <StartButton className="block w-full rounded-xl px-4 py-3 text-left text-[15px] font-bold text-[var(--lp-teal-700)] transition hover:bg-[var(--lp-paper)] sm:hidden">
                    {t.nav.createPageLong}
                  </StartButton>
                )}
                <AccountEntry className="block w-full rounded-xl px-4 py-3 text-left text-[15px] font-semibold text-[var(--lp-blue-700)] transition hover:bg-[var(--lp-paper)]" />
              </div>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

/** The returning-owner line's tail: "Already have a page? Log in". */
function HeroAccountLine() {
  const entry = useAccountEntry();
  const { hasPage } = useLandingActions();
  const { t } = useLanguage();

  // The primary button already says this for an owner.
  if (!entry || hasPage) {
    return null;
  }

  return (
    <>
      {" "}
      {entry.kind === "login" ? `${t.hero.returningPrompt} ` : ""}
      <AccountEntry className="font-bold text-[var(--lp-blue-700)] underline-offset-4 hover:underline" />
    </>
  );
}

export function Hero() {
  const { t } = useLanguage();
  const { hasPage } = useLandingActions();
  const primaryLabel = usePrimaryCtaLabel();
  const [lineOne, lineTwo, lineThree] = t.hero.titleLines;

  return (
    <section className="relative overflow-hidden bg-[var(--lp-paper)] pb-24 lg:pb-32">
      <HeroBackdrop />
      {/* On phones the preview slots between the headline and the supporting
          copy so the running hold is on screen without scrolling. On large
          screens it moves into its own column beside the full text block. The
          preview's own column carries no landing font class: the booking card
          keeps Inter. */}
      <div className="relative mx-auto grid max-w-[1264px] grid-cols-[minmax(0,1fr)] gap-5 px-5 pt-5 sm:px-8 lg:grid-cols-[minmax(0,596fr)_minmax(0,556fr)] lg:items-center lg:gap-x-12 lg:gap-y-7 lg:pt-12">
        <div className={cn(lpBody, "flex flex-col gap-5 lg:col-start-1 lg:row-start-1 lg:gap-7 lg:self-end")}>
          <div className="flex items-center gap-2 self-start rounded-full border border-[#cde7e0] bg-white py-[5px] pl-[5px] pr-3 text-[12.5px] font-semibold text-[var(--lp-ink-2)] shadow-[0_4px_14px_rgba(0,105,92,0.08)] lg:gap-2.5 lg:py-1.5 lg:pl-1.5 lg:pr-3.5 lg:text-[14px]">
            <span className="rounded-full bg-[var(--lp-teal-700)] px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.04em] text-white lg:px-2.5 lg:py-1 lg:text-[12px]">
              {t.hero.badge}
            </span>
            <span className="lg:hidden">{t.hero.badgeTextShort}</span>
            <span className="hidden lg:inline">{t.hero.badgeText}</span>
          </div>
          <h1
            className={cn(
              lpDisplay,
              "flex flex-col gap-0.5 text-[38px] font-bold leading-none tracking-[-0.035em] text-[var(--lp-ink)] sm:text-[44px] lg:gap-1 lg:text-[56px] xl:text-[66px]",
            )}
          >
            <span>{lineOne}</span>
            <span>{lineTwo}</span>
            <span className="relative self-start text-[var(--lp-teal-600)]">
              {lineThree}
              <HeadlineUnderline />
            </span>
          </h1>
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <HeroBookingPreview className="mx-auto mt-2 w-full max-w-[440px] lg:mt-0 lg:max-w-none" />
          <p
            className={cn(
              lpBody,
              "mt-2.5 text-center text-[12px] text-[var(--lp-muted)] lg:mt-3 lg:text-left lg:text-[13px]",
            )}
          >
            {t.hero.previewCaption}
          </p>
        </div>

        <div className={cn(lpBody, "flex flex-col gap-5 lg:col-start-1 lg:row-start-2 lg:gap-7 lg:self-start")}>
          <p className="max-w-[540px] text-pretty text-[17px] leading-[1.55] text-[var(--lp-body)] lg:text-[20px]">
            {t.hero.body}
          </p>
          <div
            id="hero-cta-anchor"
            className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3.5"
          >
            <StartButton
              className={cn(lpButtonClass({ variant: "primary", size: "hero" }), "w-full sm:w-auto")}
            >
              {primaryLabel}
              <ArrowRight aria-hidden="true" weight="bold" className="h-[18px] w-[18px] shrink-0" />
            </StartButton>
            <DemoButton
              className={cn(lpButtonClass({ variant: "secondary", size: "hero" }), "w-full sm:w-auto")}
            >
              <span
                aria-hidden="true"
                className="haab-live-dot h-2 w-2 rounded-full bg-[var(--lp-teal-400)] shadow-[0_0_0_4px_rgba(31,209,178,0.2)]"
              />
              {t.hero.ctaSecondary}
            </DemoButton>
          </div>
          <ul className="flex flex-wrap gap-2 lg:gap-2.5">
            {t.hero.chips.map((chip) => (
              <li key={chip}>
                <CheckChip>{chip}</CheckChip>
              </li>
            ))}
          </ul>
          {/* The account line rides on the fine print, at the exact moment
              someone realises the primary CTA is not for them: they already
              have a page. */}
          {hasPage ? null : (
            <p className="text-[14px] leading-[1.5] text-[var(--lp-muted)] lg:text-[15px]">
              {t.hero.fineprint}
              <HeroAccountLine />
            </p>
          )}
        </div>
      </div>
    </section>
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
    <section
      id="live-examples"
      className={cn(lpBody, "scroll-mt-24 bg-white px-5 py-[72px] sm:px-8 lg:py-[120px]")}
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-7 lg:gap-12">
        <LpSectionHeading
          eyebrow={t.liveExamples.eyebrow}
          title={t.liveExamples.title}
          body={formatDemoCount(t.liveExamples.body, DEMO_PAGES.length)}
        />
        <Reveal>
          <DemoGrid indexes={featured} carousel />
        </Reveal>
        <div className="flex flex-col items-stretch gap-2.5 text-center sm:items-center sm:gap-3">
          <LpButton variant="outline-ink" size="card" arrow href={galleryPath(lang)} className="sm:px-[26px]">
            {formatDemoCount(t.liveExamples.seeAll, DEMO_PAGES.length).replace(/\s*→\s*$/, "")}
          </LpButton>
          <p className="text-[13.5px] text-[var(--lp-muted)] sm:text-[14.5px]">
            {formatDemoCount(t.liveExamples.note, DEMO_PAGES.length)}
          </p>
        </div>
      </div>
    </section>
  );
}

export function FAQ() {
  const { t } = useLanguage();

  return (
    <section
      id="faq"
      className={cn(lpBody, "scroll-mt-24 bg-white px-5 py-[72px] sm:px-8 lg:py-[120px]")}
    >
      {/* No ancestor clips overflow: the left column is sticky. */}
      <div className="mx-auto grid max-w-[1200px] gap-6 lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start lg:gap-20">
        <div className="flex flex-col gap-3.5 lg:sticky lg:top-28 lg:gap-5">
          <Eyebrow>{t.faq.eyebrow}</Eyebrow>
          <h2
            className={cn(
              lpDisplay,
              "text-[36px] font-bold leading-[1.05] tracking-[-0.035em] text-[var(--lp-ink)] lg:text-[54px] lg:leading-[1.04]",
            )}
          >
            {t.faq.title}
          </h2>
          <p className="hidden text-[17px] leading-[1.6] text-[var(--lp-muted)] lg:block">
            {t.faq.aside}
          </p>
          <DemoButton className="hidden items-center gap-2 self-start rounded-md text-[16px] font-bold text-[var(--lp-teal-700)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-teal-600)] lg:inline-flex">
            {t.hero.ctaSecondary}
            <ArrowRight aria-hidden="true" weight="bold" className="h-4 w-4" />
          </DemoButton>
        </div>
        <div className="flex flex-col gap-2.5 lg:gap-3">
          {t.faq.items.map((item, index) => (
            <details
              key={item.q}
              open={index === 0}
              className="group rounded-[18px] border border-[var(--lp-line-soft)] bg-white p-[18px] open:border-[#d5eae4] open:bg-[var(--lp-paper)] lg:rounded-[20px] lg:px-7 lg:py-6"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-left marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-teal-600)] lg:gap-4 [&::-webkit-details-marker]:hidden">
                <span
                  className={cn(
                    lpDisplay,
                    "text-[18px] font-bold leading-[1.25] tracking-[-0.015em] text-[var(--lp-ink)] lg:text-[21px]",
                  )}
                >
                  {item.q}
                </span>
                <span
                  aria-hidden="true"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#eef3f2] text-[var(--lp-ink)] group-open:bg-[var(--lp-teal-600)] group-open:text-white lg:h-[34px] lg:w-[34px]"
                >
                  <Plus weight="bold" className="h-3.5 w-3.5 group-open:hidden lg:h-4 lg:w-4" />
                  <Minus weight="bold" className="hidden h-3.5 w-3.5 group-open:block lg:h-4 lg:w-4" />
                </span>
              </summary>
              <p className="mt-2.5 max-w-[640px] text-[15px] leading-[1.55] text-[var(--lp-body)] lg:mt-3 lg:text-[16.5px] lg:leading-[1.6]">
                {item.a}
              </p>
            </details>
          ))}
        </div>
        {/* Below lg the aside and link follow the accordion instead of
            crowding the heading. */}
        <div className="flex flex-col gap-3 lg:hidden">
          <p className="text-[15px] leading-[1.55] text-[var(--lp-muted)]">{t.faq.aside}</p>
          <DemoButton className="inline-flex items-center gap-2 self-start rounded-md text-[15.5px] font-bold text-[var(--lp-teal-700)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-teal-600)]">
            {t.hero.ctaSecondary}
            <ArrowRight aria-hidden="true" weight="bold" className="h-4 w-4" />
          </DemoButton>
        </div>
      </div>
    </section>
  );
}

export function FinalCTA() {
  const { t } = useLanguage();
  const { hasPage } = useLandingActions();
  const primaryLabel = usePrimaryCtaLabel();

  return (
    <section
      id="early-access"
      className={cn(lpBody, "scroll-mt-24 bg-white px-5 pb-[72px] sm:px-8 lg:pb-[120px]")}
    >
      <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[28px] bg-[var(--lp-teal-700)] px-6 py-12 text-white sm:px-10 lg:rounded-[36px] lg:px-20 lg:py-[88px]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="lp-dot-grid-light absolute inset-0" />
          <div className="absolute -right-[140px] -top-[140px] h-[360px] w-[360px] rounded-full bg-[radial-gradient(closest-side,rgba(104,250,221,0.45),transparent)] lg:-right-[140px] lg:-top-[180px] lg:h-[520px] lg:w-[520px]" />
          <div className="absolute -bottom-[220px] left-[38%] hidden h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(26,107,224,0.45),transparent)] lg:block" />
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          <div className="flex flex-col gap-3 lg:gap-4">
            <h2
              className={cn(
                lpDisplay,
                "text-[44px] font-bold leading-none tracking-[-0.04em] lg:text-[72px]",
              )}
            >
              {t.finalCta.titleLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className="text-[17px] leading-[1.5] text-[var(--lp-mint-100)] lg:text-[20px]">
              {hasPage ? t.finalCta.ownerBody : t.finalCta.body}
            </p>
          </div>
          <div className="flex flex-col gap-2.5 lg:items-end lg:gap-4">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
              <StartButton
                className={cn(
                  lpButtonClass({ variant: "inverse", size: "hero" }),
                  "w-full text-[17px] sm:w-auto lg:h-[60px] lg:px-[30px] lg:text-[18px]",
                )}
              >
                {primaryLabel}
                <ArrowRight aria-hidden="true" weight="bold" className="h-[18px] w-[18px]" />
              </StartButton>
              <DemoButton
                className={cn(
                  lpButtonClass({ variant: "ghost-inverse", size: "hero" }),
                  "w-full text-[17px] sm:w-auto lg:h-[60px] lg:px-[26px] lg:text-[18px]",
                )}
              >
                {t.hero.ctaSecondary}
              </DemoButton>
            </div>
            {hasPage ? null : (
              <p className="text-center text-[14px] text-[var(--lp-mint-100)] lg:text-[15px]">
                {t.finalCta.fineprint}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer({
  showUseCases = true,
  anchorsGoHome = false,
}: {
  showUseCases?: boolean;
  anchorsGoHome?: boolean;
} = {}) {
  const { lang, setLang, t } = useLanguage();
  const { hasPage } = useLandingActions();
  const anchor = sectionAnchor(anchorsGoHome, lang);
  const linkClass =
    "rounded-sm text-[15px] text-[var(--lp-night-ink)] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-mint-300)] lg:text-[15.5px]";
  const headingClass = cn(lpMono, "text-[11.5px] uppercase tracking-[0.14em] text-[var(--lp-mint-300)] lg:text-[12px]");

  return (
    <footer className={cn(lpBody, "bg-[var(--lp-night)] px-5 pb-10 pt-14 text-[var(--lp-night-ink)] sm:px-8 lg:pb-12 lg:pt-20")}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-9 lg:gap-14">
        <div className="grid grid-cols-2 gap-x-6 gap-y-9 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr] lg:gap-12">
          <div className="col-span-2 flex flex-col items-start gap-3.5 lg:col-span-1 lg:gap-4">
            <BrandLink label={t.nav.brand} onNight />
            <p className="max-w-[320px] text-[15px] leading-[1.6] text-[#9fb2c3] lg:text-[16px]">
              {t.footer.tagline}
            </p>
            {/* Phones get the action under the tagline; wider screens keep it in
                the last column. */}
            {hasPage ? null : (
              <StartButton className={cn(footerCtaClass, "lg:hidden")}>
                {t.footer.createLink.replace(/\s*→\s*$/, "")}
                <ArrowRight aria-hidden="true" weight="bold" className="h-4 w-4" />
              </StartButton>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <p className={headingClass}>{t.footer.productHeading}</p>
            <ul className="flex flex-col gap-3">
              <li>
                <a href={anchor("how")} className={linkClass}>
                  {t.footer.product.how}
                </a>
              </li>
              <li>
                <a href={anchor("features")} className={linkClass}>
                  {t.footer.product.features}
                </a>
              </li>
              {showUseCases ? (
                <li>
                  <a href={anchor("verticals")} className={linkClass}>
                    {t.footer.product.useCases}
                  </a>
                </li>
              ) : null}
              <li>
                <a href={tryBookingPath(lang)} className={linkClass}>
                  {t.footer.product.seeLivePage}
                </a>
              </li>
              <AccountEntryListItem />
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <p className={headingClass}>{t.footer.companyHeading}</p>
            <ul className="flex flex-col gap-3">
              <li>
                <a href={anchor("early-access")} className={linkClass}>
                  {t.footer.company.pricing}
                </a>
              </li>
              {/* Google's OAuth consent screen links to both, and its reviewer
                  checks they are reachable from the app itself, not only by
                  their bare URLs. */}
              <li>
                <Link href={`/privacy?lang=${lang}`} className={linkClass}>
                  {t.footer.company.privacy}
                </Link>
              </li>
              <li>
                <Link href={`/terms?lang=${lang}`} className={linkClass}>
                  {t.footer.company.terms}
                </Link>
              </li>
            </ul>
          </div>
          <div className="col-span-2 hidden flex-col items-start gap-4 lg:col-span-1 lg:flex">
            {hasPage ? null : (
              <>
                <p className={headingClass}>{t.footer.getStarted}</p>
                <StartButton className={footerCtaClass}>
                  {t.footer.createLink.replace(/\s*→\s*$/, "")}
                  <ArrowRight aria-hidden="true" weight="bold" className="h-4 w-4" />
                </StartButton>
              </>
            )}
            <LangPill lang={lang} onChange={setLang} variant="night" long />
          </div>
        </div>
        {/* Phones: the language switch sits above the rule, not in a column. */}
        <div className="lg:hidden">
          <LangPill lang={lang} onChange={setLang} variant="night" long />
        </div>
        <div className="border-t border-[var(--lp-night-line)] pt-[22px] text-[13px] leading-[1.5] text-[var(--lp-night-muted)] lg:pt-7 lg:text-[14px]">
          <p>{t.footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}

const footerCtaClass =
  "inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-[var(--lp-teal-400)] px-[22px] text-[16px] font-bold text-[var(--lp-teal-on-400)] transition hover:bg-[var(--lp-mint-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-mint-300)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--lp-night)] active:translate-y-px";

// Full marketing landing. `afterHero` is slotted directly below the hero — the
// host (HomeExperience) injects the verticals picker or the "go to dashboard"
// panel there, depending on auth/configuration state.
export function LandingPage({
  afterHero,
  featuredDemos,
  showUseCases = true,
}: {
  afterHero?: ReactNode;
  /** Chosen on the server; see lib/demo-gallery.ts. */
  featuredDemos: number[];
  /**
   * Whether the verticals picker is on the page. It is replaced by the
   * dashboard panel once an owner has a page, and the nav must not keep
   * offering an anchor that no longer exists.
   */
  showUseCases?: boolean;
}) {
  return (
    <LandingDialogsProvider>
      <LandingScope>
        <StickyNav showUseCases={showUseCases} />
        <main className="flex-1">
          <Hero />
          <FactStrip />
          {afterHero}
          <HowItWorks />
          <LiveExamples featured={featuredDemos} />
          <Features />
          <GoogleIntegration />
          <Trust />
          <FAQ />
          <FinalCTA />
        </main>
        <Footer showUseCases={showUseCases} />
      </LandingScope>
    </LandingDialogsProvider>
  );
}
