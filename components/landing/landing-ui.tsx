"use client";

import Link from "next/link";
import { ArrowRight, List } from "@phosphor-icons/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DEMO_PAGES, getDemoPagePath } from "@/lib/demo-pages";
import { resolveLandingAccountEntry } from "@/lib/landing-account-entry";
import { cn } from "@/lib/utils";
import type { VerticalId } from "@/lib/types";
import { HeroBookingPreview } from "./hero-preview";
import { useLanguage } from "./language-provider";
import { LiveDemoDialog } from "./live-demo-dialog";
import { formatDemoCount } from "./demo-count";
import { FactStrip } from "./fact-strip";
import { HeadlineUnderline, HeroBackdrop } from "./hero-art";
import { LangPill } from "./lang-pill";
import {
  CheckChip,
  LandingScope,
  lpBody,
  lpButtonClass,
  lpDisplay,
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

export { formatDemoCount };

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
      className={`rounded-2xl border border-[var(--line)] bg-[var(--surface-lowest)] p-6 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Fades a section in the first time it reaches the viewport.
 *
 * The hidden class is added by script rather than sitting in the markup, so a
 * visitor whose JS never runs — or whose browser lacks IntersectionObserver —
 * gets the fully visible page instead of an empty one. Reduced motion is
 * handled in CSS, where both reveal classes collapse to "visible, no
 * transition".
 */
function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");

  // A ref callback rather than an effect: the hidden class is only ever
  // applied to an element that was measured as below the fold, so nothing
  // already on screen flashes out and back in.
  const attach = useCallback((node: HTMLDivElement | null) => {
    if (!node || typeof IntersectionObserver === "undefined") {
      return;
    }

    if (node.getBoundingClientRect().top < window.innerHeight) {
      return;
    }

    setState("hidden");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={attach}
      className={cn(
        state === "hidden" && "haab-reveal",
        state === "shown" && "haab-reveal-in",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Which band a heading is being set on, so its type and rules pick the right
 * contrast. Sections used to alternate between `white/70` and `white/55` — a
 * difference nobody can see — so nine of them read as one uninterrupted plane;
 * the bands are now `--band-paper`, `--band-tint`, and the single `--night`
 * stop, and only that last one changes the heading's colours.
 */
type BandTone = "paper" | "night";

/**
 * An eyebrow, set in the mono face.
 *
 * Not a stylistic tic: this product is a timetable, and mono is the face a
 * timetable is set in. It also keeps the section indices — 01, 02 — on a
 * fixed advance so they line up down the page.
 */
function Eyebrow({
  children,
  tone = "paper",
}: {
  children: ReactNode;
  tone?: BandTone;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[0.22em]",
        tone === "night" ? "text-[var(--secondary-fixed)]" : "text-[var(--primary)]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-px w-8 shrink-0",
          tone === "night" ? "bg-[var(--night-line)]" : "bg-[var(--line)]",
        )}
      />
      {children}
    </p>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  align = "center",
  tone = "paper",
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  /** Six centred headings in a row is the monotony; alternate them. */
  align?: "center" | "left";
  tone?: BandTone;
}) {
  const centered = align === "center";

  return (
    <div className={cn("max-w-3xl", centered && "mx-auto")}>
      {eyebrow ? (
        <div className={cn(centered && "justify-center", "flex")}>
          <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
        </div>
      ) : null}
      <h2
        className={cn(
          "mt-5 text-balance text-[2rem] font-semibold leading-[1.06] tracking-[-0.035em] sm:text-[2.6rem] lg:text-[3.1rem]",
          tone === "night" ? "text-[var(--night-ink)]" : "text-[var(--ink)]",
          centered && "text-center",
        )}
      >
        {title}
      </h2>
      {body ? (
        <p
          className={cn(
            "mt-4 text-base leading-7 sm:text-lg",
            tone === "night" ? "text-[var(--night-muted)]" : "text-[var(--muted)]",
            centered && "text-center",
          )}
        >
          {body}
        </p>
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
        <Link href="/" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap xl:gap-3">
          <span
            className={cn(
              lpDisplay,
              "relative grid h-[34px] w-[34px] place-items-center rounded-[11px] bg-[var(--lp-blue-600)] text-[18px] font-extrabold text-white shadow-[var(--lp-shadow-logo)] xl:h-[38px] xl:w-[38px] xl:rounded-[12px] xl:text-[20px]",
            )}
          >
            H
            <span
              aria-hidden="true"
              className="absolute -right-[3px] -top-[3px] h-[11px] w-[11px] rounded-full border-2 border-[var(--lp-paper)] bg-[var(--lp-teal-400)] xl:h-3 xl:w-3"
            />
          </span>
          <span
            className={cn(
              lpDisplay,
              "text-[18px] font-bold tracking-[-0.02em] text-[var(--lp-ink)] max-[379px]:sr-only xl:text-[20px]",
            )}
          >
            {t.nav.brand}
          </span>
        </Link>
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
      className="group relative flex min-h-56 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-lowest)] p-5 transition duration-300 hover:-translate-y-1 hover:border-[rgba(26,115,232,0.32)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
    >
      {/* The card's own slot rule, drawn along the top edge and filled in on
          hover: the same hour-rule device the setup steps use. */}
      <span
        aria-hidden="true"
        className="haab-slot-rule absolute inset-x-0 top-0 h-1.5 text-[var(--primary)] opacity-25 transition-opacity duration-300 group-hover:opacity-70"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
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

// Four featured demos left an orphan in a three-up grid. Two-up through lg and
// four-up above it both divide the landing's four and the gallery's twelve
// without a ragged last row.
export function DemoGrid({ indexes }: { indexes: number[] }) {
  return (
    <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
    <section id="live-examples" className="scroll-mt-20 border-b border-[var(--line)] bg-[var(--band-paper)] px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <Eyebrow>{t.liveExamples.eyebrow}</Eyebrow>
            <h2 className="mt-5 text-balance text-[2rem] font-semibold leading-[1.06] tracking-[-0.035em] text-[var(--ink)] sm:text-[2.6rem]">
              {t.liveExamples.title}
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-[var(--muted)]">
            {formatDemoCount(t.liveExamples.body, DEMO_PAGES.length)}
          </p>
        </div>
        <Reveal>
          <DemoGrid indexes={featured} />
        </Reveal>
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



/**
 * Setup, as a rail rather than three boxes.
 *
 * These steps are a real sequence — you cannot publish a page you have not
 * named — so the numbering carries information, and the layout should show the
 * order instead of leaving three interchangeable cards to imply it. The rail is
 * the slot rule: an hour line with the three steps marked on it.
 */
export function HowItWorks() {
  const { t } = useLanguage();
  const stepNumbers = ["01", "02", "03"];
  return (
    <section id="how" className="scroll-mt-20 bg-[var(--band-paper)] px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-[1280px]">
        <SectionHeading eyebrow={t.how.eyebrow} title={t.how.title} align="left" />
        <Reveal className="relative mt-14">
          {/* The rail. Vertical on phones, where the steps stack; horizontal
              from lg, where they sit side by side. */}
          <span
            aria-hidden="true"
            className="haab-slot-rule-y absolute bottom-2 left-[15px] top-2 w-1.5 text-[var(--primary)] lg:hidden"
          />
          <span
            aria-hidden="true"
            className="haab-slot-rule absolute left-0 right-0 top-[15px] hidden h-1.5 text-[var(--primary)] lg:block"
          />
          <ol className="relative grid gap-10 lg:grid-cols-3 lg:gap-8">
            {t.how.steps.map((s, i) => (
              <li key={stepNumbers[i]} className="relative pl-14 lg:pl-0">
                <span className="absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface-lowest)] font-mono text-[11px] font-semibold tabular-nums text-[var(--primary)] lg:relative lg:mb-6">
                  {/* The marker carries the number; naming it again in a line
                      of its own would say "step" twice. */}
                  <span className="sr-only">{t.how.stepLabel} </span>
                  {stepNumbers[i]}
                </span>
                <h3 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">
                  {s.title}
                </h3>
                <p className="mt-3 max-w-md text-[15px] leading-7 text-[var(--muted)]">{s.body}</p>
              </li>
            ))}
          </ol>
        </Reveal>
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
    <section
      id="features"
      className="scroll-mt-20 bg-[var(--band-tint)] px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-[1280px]">
        <SectionHeading eyebrow={t.features.eyebrow} title={t.features.title} />
        {/* Five equal cards say all five matter equally. The first one is the
            reason the product exists, so it gets the width and the larger
            type; the rest fall in behind it. */}
        <Reveal className="mt-14 grid gap-4 md:grid-cols-2">
          {t.features.items.map((f, i) => (
            <GlassCard
              key={f.title}
              className={cn(
                "flex flex-col gap-4 transition duration-300 hover:-translate-y-1 hover:border-[rgba(26,115,232,0.28)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.07)]",
                i === 0 && "md:col-span-2 md:p-8",
              )}
            >
              <div className={cn("flex items-start gap-4", i === 0 && "md:gap-5")}>
                <BrandGlyph label={meta[i].glyph} tone={meta[i].tone} />
                <div>
                  <h3
                    className={cn(
                      "font-semibold tracking-[-0.02em] text-[var(--ink)]",
                      i === 0 ? "text-xl md:text-3xl" : "text-xl",
                    )}
                  >
                    {f.title}
                  </h3>
                  <p
                    className={cn(
                      "mt-2 leading-7 text-[var(--muted)]",
                      i === 0 ? "text-[15px] md:max-w-2xl md:text-lg md:leading-8" : "text-[15px]",
                    )}
                  >
                    {f.body}
                  </p>
                </div>
              </div>
              <p className="mt-auto font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">
                {f.tag}
              </p>
            </GlassCard>
          ))}
        </Reveal>
      </div>
    </section>
  );
}





/**
 * Reliability, privacy, and scope. Every claim here describes behavior that
 * ships today; the last item names what does not, which is the part that makes
 * the other three believable while the product is in early access.
 */
/**
 * The Google Calendar integration, explained on the home page.
 *
 * Not a marketing section. Google's OAuth review reads the home page of any app
 * requesting a sensitive scope and checks that the page explains what the app
 * does and why it needs that access; this one was rejected for "does not
 * explain the purpose of your app" while the page said nothing about Google at
 * all. The claims here mirror lib/legal/content.ts and the behaviour in
 * lib/google/, and components/landing/__tests__/google-disclosure.test.tsx
 * pins the parts the review depends on.
 */
export function GoogleIntegration() {
  const { lang, t } = useLanguage();
  return (
    <section
      id="google-calendar"
      className="scroll-mt-20 border-b border-[var(--line)] bg-[var(--band-paper)] px-5 py-20 sm:px-8 sm:py-24"
    >
      {/* Two columns rather than another three-across row of cards: the
          explanation stays alongside the claims it covers as they scroll. */}
      <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            eyebrow={t.googleIntegration.eyebrow}
            title={t.googleIntegration.title}
            align="left"
          />
          <p className="mt-5 max-w-[52ch] text-[15px] leading-7 text-[var(--muted)]">
            {t.googleIntegration.purpose}
          </p>
          <Link
            href={`/privacy?lang=${lang}#google`}
            className={cn(secondaryLinkClass, "mt-7")}
          >
            {t.googleIntegration.privacyLink}
          </Link>
        </div>
        <Reveal className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {t.googleIntegration.items.map((item) => (
            <div key={item.title} className="py-7 first:pt-0 last:pb-0 sm:py-8">
              <h3 className="text-lg font-semibold tracking-[-0.015em] text-[var(--ink)]">
                {item.title}
              </h3>
              <p className="mt-2.5 max-w-[62ch] text-[15px] leading-7 text-[var(--muted)]">
                {item.body}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

export function Trust() {
  const { t } = useLanguage();

  return (
    /* The page's one dark stop. Trust used to render exactly like the Google
       section directly above it — same hairline grid, same three cells — so
       the two read as one long panel. Dropping the cards here and letting the
       claims sit on the night band separates them and gives the scroll a
       floor to land on before the closing CTA. */
    <section
      id="trust"
      className="relative scroll-mt-20 overflow-hidden bg-[var(--night)] px-5 py-20 sm:px-8 sm:py-28"
    >
      <span
        aria-hidden="true"
        className="haab-slot-rule haab-slot-rule-fade absolute inset-x-0 top-0 h-10 text-[var(--secondary-fixed)]"
      />
      <div className="relative mx-auto max-w-[1280px]">
        <SectionHeading eyebrow={t.trust.eyebrow} title={t.trust.title} tone="night" />
        <Reveal className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {t.trust.items.map((item) => (
            <div key={item.title} className="border-t border-[var(--night-line)] pt-6">
              <h3 className="text-lg font-semibold tracking-[-0.015em] text-[var(--night-ink)]">
                {item.title}
              </h3>
              <p className="mt-3 text-[15px] leading-7 text-[var(--night-muted)]">{item.body}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

export function FAQ() {
  const { t } = useLanguage();
  return (
    <section id="faq" className={cn(sectionPadding, "bg-[var(--band-paper)]")}>
      {/* No box around the questions: after the night band the page wants a
          quiet, plainly typeset column, not another panel. */}
      <div className="mx-auto max-w-[820px]">
        <SectionHeading eyebrow={t.faq.eyebrow} title={t.faq.title} align="left" />
        <div className="mt-12 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {t.faq.items.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
                <span className="text-base font-semibold text-[var(--ink)] transition group-hover:text-[var(--primary)] sm:text-lg">
                  {item.q}
                </span>
                <span
                  aria-hidden="true"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)] transition duration-300 group-open:rotate-45 group-open:border-[var(--primary)] group-open:text-[var(--primary)]"
                >
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-[68ch] text-[15px] leading-7 text-[var(--muted)]">{item.a}</p>
            </details>
          ))}
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
    <section id="early-access" className="relative scroll-mt-20 overflow-hidden px-5 py-24 sm:px-8 lg:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(26,115,232,0.95),rgba(79,142,241,0.92))]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" />
      <span
        aria-hidden="true"
        className="haab-slot-rule haab-slot-rule-fade pointer-events-none absolute inset-x-0 top-0 h-12 text-white"
      />
      <div className="relative mx-auto max-w-[920px] text-center">
        <h2 className="text-balance text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl lg:text-[3.4rem]">
          {t.finalCta.title}
        </h2>
        <p className="mt-5 text-lg leading-8 text-white/85">
          {hasPage ? t.finalCta.ownerBody : t.finalCta.body}
        </p>
        <div className="mt-9 flex flex-col items-center gap-4">
          <StartButton className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-white/90">
            {primaryLabel}
          </StartButton>
          {hasPage ? null : (
            <p className="text-sm !text-white/70">{t.finalCta.fineprint}</p>
          )}
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
  const { lang, t } = useLanguage();
  const { hasPage } = useLandingActions();
  const anchor = sectionAnchor(anchorsGoHome, lang);
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--band-tint)] px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
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
                <a href={anchor("how")} className="hover:text-[var(--ink)]">
                  {t.footer.product.how}
                </a>
              </li>
              <li>
                <a href={anchor("features")} className="hover:text-[var(--ink)]">
                  {t.footer.product.features}
                </a>
              </li>
              {showUseCases ? (
                <li>
                  <a href={anchor("verticals")} className="hover:text-[var(--ink)]">
                    {t.footer.product.useCases}
                  </a>
                </li>
              ) : null}
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
                <a href={anchor("early-access")} className="hover:text-[var(--ink)]">
                  {t.footer.company.pricing}
                </a>
              </li>
              {/* Google's OAuth consent screen links to both, and its reviewer
                  checks they are reachable from the app itself, not only by
                  their bare URLs. */}
              <li>
                <Link href={`/privacy?lang=${lang}`} className="hover:text-[var(--ink)]">
                  {t.footer.company.privacy}
                </Link>
              </li>
              <li>
                <Link href={`/terms?lang=${lang}`} className="hover:text-[var(--ink)]">
                  {t.footer.company.terms}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-[var(--line)] pt-6 text-sm text-[var(--muted)] sm:flex-row sm:items-center">
          <p>{t.footer.copyright}</p>
          {hasPage ? null : (
            <StartButton className="font-semibold text-[var(--primary)] hover:underline">
              {t.footer.createLink}
            </StartButton>
          )}
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
