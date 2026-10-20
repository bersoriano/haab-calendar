"use client";

import {
  ArrowRight,
  CalendarCheck,
  ChatCircleText,
  EnvelopeSimple,
  Globe,
  GoogleLogo,
  InstagramLogo,
  LinkSimple,
  LockSimple,
  MoonStars,
  PhoneSlash,
  QrCode,
  Stethoscope,
  Translate,
  UserList,
} from "@phosphor-icons/react";
import { Fragment, useRef } from "react";

import { logout } from "@/app/login/actions";
import { DEMO_PAGES, getDemoPagePath } from "@/lib/demo-pages";
import { DOCTORS_LANDING_PATHS } from "@/lib/language/localized-routes";
import { cn } from "@/lib/utils";
import { doctorsTranslations } from "./doctors-translations";
import { HeroBackdrop, HeadlineUnderline } from "./hero-art";
import { HeroBookingPreview } from "./hero-preview";
import { LandingAnalytics } from "./landing-analytics";
import { DemoVideo } from "./demo-video";
import {
  DemoGrid,
  FAQ,
  Footer,
  GoogleIntegration,
  LandingActionsProvider,
  LandingDialogsProvider,
  StickyNav,
} from "./landing-ui";
import { LanguageProvider, useLanguage } from "./language-provider";
import {
  CheckChip,
  Eyebrow,
  IconTile,
  LandingScope,
  LpButton,
  SectionHeading,
  lpBody,
  lpButtonClass,
  lpDisplay,
  lpMono,
} from "./primitives";
import { Reveal } from "./reveal";
import { Trust } from "./trust";
import type { Lang } from "./translations";

/**
 * The seeded examples for people who treat people: the family doctor and the
 * dental practice. The vet clinic is healthcare too, but not this audience.
 */
const PRACTICE_DEMO_KEYS = ["doctors", "dentists"];
const HEALTHCARE_DEMOS = DEMO_PAGES.flatMap((page, index) =>
  PRACTICE_DEMO_KEYS.includes(page.key) ? [index] : [],
);
const DOCTOR_EXAMPLE = DEMO_PAGES[HEALTHCARE_DEMOS[0]];

const OUTCOME_ICONS = [MoonStars, PhoneSlash, LockSimple, CalendarCheck];
const FEATURE_ICONS = [Stethoscope, UserList, Translate, LockSimple, EnvelopeSimple, LinkSimple];
const CHANNEL_ICONS = [Globe, GoogleLogo, InstagramLogo, ChatCircleText, QrCode];
const NUMERALS = ["01", "02", "03"];

/** Setup in the Healthcare preset, on the landing page that owns that flow. */
function startHref(lang: Lang) {
  return `/?lang=${lang}&vertical=healthcare`;
}

function exampleHref(lang: Lang) {
  return `${getDemoPagePath(DOCTOR_EXAMPLE)}?lang=${lang}`;
}

function Hero() {
  const { lang } = useLanguage();
  const t = doctorsTranslations[lang];
  const [lineOne, lineTwo, lineThree] = t.hero.titleLines;

  return (
    <section data-landing-section="hero" className="relative overflow-hidden bg-[var(--lp-paper)] pb-24 lg:pb-32">
      <HeroBackdrop />
      <div className="relative mx-auto grid max-w-[1264px] grid-cols-[minmax(0,1fr)] gap-5 px-5 pt-5 sm:px-8 lg:grid-cols-[minmax(0,596fr)_minmax(0,556fr)] lg:items-center lg:gap-x-12 lg:pt-12">
        <div className={cn(lpBody, "flex flex-col gap-5 lg:gap-7")}>
          <h1
            className={cn(
              lpDisplay,
              "flex flex-col gap-0.5 text-[38px] font-bold leading-none tracking-[-0.035em] text-[var(--lp-ink)] sm:text-[44px] lg:gap-1 lg:text-[56px] xl:text-[62px]",
            )}
          >
            {/* The kicker is the search phrase; spaces between spans are for
                text extraction, as in the landing hero. */}
            <span
              className={cn(
                lpBody,
                "mb-2 text-[15px] font-semibold leading-[1.35] tracking-normal text-[var(--lp-teal-700)] lg:mb-3 lg:text-[18px]",
              )}
            >
              {t.hero.kicker}
            </span>{" "}
            <span>{lineOne}</span>{" "}
            <span>{lineTwo}</span>{" "}
            <span className="relative self-start text-[var(--lp-teal-600)]">
              {lineThree}
              <HeadlineUnderline />
            </span>
          </h1>
          <p className="max-w-[540px] text-pretty text-[17px] leading-[1.55] text-[var(--lp-body)] lg:text-[20px]">
            {t.hero.body}
          </p>
          <div id="hero-cta-anchor" className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3.5">
            <LpButton href={startHref(lang)} arrow data-landing-action="create_page" data-landing-vertical="healthcare" className="w-full sm:w-auto">
              {t.hero.ctaPrimary}
            </LpButton>
            <LpButton href={exampleHref(lang)} variant="secondary" live data-landing-action="view_example" className="w-full sm:w-auto">
              {t.hero.ctaSecondary}
            </LpButton>
          </div>
          <ul className="flex flex-wrap gap-2 lg:gap-2.5">
            {t.hero.chips.map((chip) => (
              <li key={chip}>
                <CheckChip>{chip}</CheckChip>
              </li>
            ))}
          </ul>
          <p className="text-[14px] leading-[1.5] text-[var(--lp-muted)] lg:text-[15px]">{t.hero.fineprint}</p>
        </div>
        <div className="lg:self-center">
          <HeroBookingPreview className="lp-booking-card mx-auto mt-2 w-full max-w-[440px] lg:mt-0 lg:max-w-none" />
        </div>
      </div>
    </section>
  );
}

function CardGrid({
  items,
  icons,
  columns,
}: {
  items: readonly { title: string; body: string }[];
  icons: typeof OUTCOME_ICONS;
  columns: "2" | "3";
}) {
  return (
    <ul
      className={cn(
        "grid gap-4 sm:grid-cols-2 sm:gap-5",
        columns === "3" ? "lg:grid-cols-3" : "lg:grid-cols-4",
      )}
    >
      {items.map((item, index) => (
        <li
          key={index}
          className="flex flex-col gap-3 rounded-[20px] border border-[var(--lp-line-soft)] bg-white p-6 lg:gap-4 lg:p-7"
        >
          <IconTile icon={icons[index]} tone="mint-soft" size={44} />
          <h3 className={cn(lpDisplay, "text-[20px] font-bold leading-[1.2] tracking-[-0.015em] text-[var(--lp-ink)] lg:text-[22px]")}>
            {item.title}
          </h3>
          <p className="text-[15px] leading-[1.55] text-[var(--lp-body)] lg:text-[16px]">{item.body}</p>
        </li>
      ))}
    </ul>
  );
}

function Outcomes() {
  const { lang } = useLanguage();
  const { outcomes } = doctorsTranslations[lang];

  return (
    <section id="front-desk" className={cn(lpBody, "scroll-mt-24 bg-white px-5 py-[72px] sm:px-8 lg:py-[120px]")}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-9 lg:gap-14">
        <SectionHeading eyebrow={outcomes.eyebrow} title={outcomes.title} body={outcomes.body} />
        <Reveal>
          <CardGrid items={outcomes.items} icons={OUTCOME_ICONS} columns="2" />
        </Reveal>
      </div>
    </section>
  );
}

function PracticeFeatures() {
  const { lang } = useLanguage();
  const { features } = doctorsTranslations[lang];

  return (
    <section id="for-practices" className={cn(lpBody, "scroll-mt-24 bg-[var(--lp-paper)] px-5 py-[72px] sm:px-8 lg:py-[120px]")}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-9 lg:gap-14">
        <SectionHeading eyebrow={features.eyebrow} title={features.title} body={features.body} />
        <Reveal>
          <CardGrid items={features.items} icons={FEATURE_ICONS} columns="3" />
        </Reveal>
      </div>
    </section>
  );
}

/** SectionHeading's split layout needs the full width; a column stacks. */
function ColumnHeading({
  eyebrow,
  title,
  body,
  tone,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  tone?: "teal" | "blue";
}) {
  return (
    <div className="flex flex-col gap-3.5 sm:gap-[18px]">
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      <h2 className={cn(lpDisplay, "text-balance text-[36px] font-bold leading-[1.05] tracking-[-0.035em] text-[var(--lp-ink)] sm:text-[44px]")}>
        {title}
      </h2>
      {body ? <p className="text-[16.5px] leading-[1.55] text-[var(--lp-muted)] sm:text-[18px]">{body}</p> : null}
    </div>
  );
}

function ChannelsAndSteps() {
  const { lang } = useLanguage();
  const { channels, steps } = doctorsTranslations[lang];

  return (
    <section id="how" className={cn(lpBody, "scroll-mt-24 bg-white px-5 py-[72px] sm:px-8 lg:py-[120px]")}>
      <div className="mx-auto grid max-w-[1200px] gap-14 lg:grid-cols-2 lg:gap-20">
        <div className="flex flex-col gap-7 lg:gap-9">
          <ColumnHeading eyebrow={channels.eyebrow} title={channels.title} body={channels.body} />
          <ul className="flex flex-col">
            {channels.items.map((item, index) => {
              const Icon = CHANNEL_ICONS[index];
              return (
                <li key={index} className="flex gap-4 border-t border-[var(--lp-line-soft)] py-4 last:border-b">
                  <Icon aria-hidden="true" weight="regular" className="mt-0.5 h-6 w-6 shrink-0 text-[var(--lp-teal-600)]" />
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[16.5px] font-bold text-[var(--lp-ink)]">{item.title}</h3>
                    <p className="text-[15px] leading-[1.5] text-[var(--lp-body)]">{item.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex flex-col gap-7 lg:gap-9">
          <ColumnHeading eyebrow={steps.eyebrow} title={steps.title} tone="blue" />
          <ol className="flex flex-col gap-3">
            {steps.items.map((step, index) => (
              <li key={index} className="flex gap-5 rounded-[20px] bg-[var(--lp-paper)] p-6">
                <span className={cn(lpMono, "pt-1 text-[14px] font-medium text-[var(--lp-blue-700)]")}>{NUMERALS[index]}</span>
                <div className="flex flex-col gap-1.5">
                  <h3 className={cn(lpDisplay, "text-[20px] font-bold leading-[1.2] text-[var(--lp-ink)]")}>{step.title}</h3>
                  <p className="text-[15px] leading-[1.55] text-[var(--lp-body)]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Examples() {
  const { lang } = useLanguage();
  const { examples } = doctorsTranslations[lang];

  return (
    <section id="live-examples" className={cn(lpBody, "scroll-mt-24 bg-white px-5 py-[72px] sm:px-8 lg:py-[120px]")}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-7 lg:gap-12">
        <SectionHeading eyebrow={examples.eyebrow} title={examples.title} body={examples.body} />
        <Reveal>
          <DemoGrid indexes={HEALTHCARE_DEMOS} />
        </Reveal>
      </div>
    </section>
  );
}

function FinalCTA() {
  const { lang } = useLanguage();
  const t = doctorsTranslations[lang];

  return (
    <section id="early-access" className={cn(lpBody, "scroll-mt-24 bg-white px-5 pb-[72px] sm:px-8 lg:pb-[120px]")}>
      <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[28px] bg-[var(--lp-teal-700)] px-6 py-12 text-white sm:px-10 lg:rounded-[36px] lg:px-20 lg:py-[88px]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="lp-dot-grid-light absolute inset-0" />
          <div className="absolute -right-[140px] -top-[140px] h-[360px] w-[360px] rounded-full bg-[radial-gradient(closest-side,rgba(104,250,221,0.45),transparent)] lg:h-[520px] lg:w-[520px]" />
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          <div className="flex flex-col gap-3 lg:gap-4">
            <h2 className={cn(lpDisplay, "text-[44px] font-bold leading-none tracking-[-0.04em] lg:text-[72px]")}>
              {t.finalCta.titleLines.map((line) => (
                <Fragment key={line}>
                  <span className="block">{line}</span>{" "}
                </Fragment>
              ))}
            </h2>
            <p className="text-[17px] leading-[1.5] text-[var(--lp-mint-100)] lg:text-[20px]">{t.finalCta.body}</p>
          </div>
          <div className="flex flex-col gap-2.5 lg:items-end lg:gap-4">
            <a
              href={startHref(lang)}
              data-landing-action="create_page"
              data-landing-vertical="healthcare"
              className={cn(lpButtonClass({ variant: "inverse", size: "hero" }), "w-full text-[17px] sm:w-auto lg:h-[60px] lg:px-[30px] lg:text-[18px]")}
            >
              {t.hero.ctaPrimary}
              <ArrowRight aria-hidden="true" weight="bold" className="h-[18px] w-[18px]" />
            </a>
            <p className="text-center text-[14px] text-[var(--lp-mint-100)] lg:text-[15px]">{t.finalCta.fineprint}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DoctorsContent() {
  const { lang } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <LandingDialogsProvider>
      <LandingScope ref={rootRef}>
        <LandingAnalytics rootRef={rootRef} />
        <StickyNav anchorsGoHome showUseCases={false} showDoctors={false} />
        <main className="flex-1">
          <Hero />
          <Outcomes />
          <DemoVideo />
          <PracticeFeatures />
          <ChannelsAndSteps />
          <GoogleIntegration />
          <Trust />
          <Examples />
          <FAQ copy={doctorsTranslations[lang].faq} />
          <FinalCTA />
        </main>
        <Footer anchorsGoHome showUseCases={false} />
      </LandingScope>
    </LandingDialogsProvider>
  );
}

/**
 * /en/online-booking-for-doctors and /es/agenda-online-para-medicos: Haab for
 * practices and clinics. The language is the URL's, and the switch moves to
 * the other URL. Setup itself stays on the landing page, which owns that flow:
 * every start here lands there with the Healthcare preset chosen.
 */
export function DoctorsPage({
  lang,
  loggedIn,
  loginHref,
}: {
  lang: Lang;
  loggedIn: boolean;
  loginHref: string;
}) {
  return (
    <LanguageProvider initialLang={lang} languagePaths={DOCTORS_LANDING_PATHS}>
      <LandingActionsProvider
        actions={{
          onStart: () => {
            window.location.href = startHref(lang);
          },
          onSelectVertical: (vertical, pageName) => {
            const params = new URLSearchParams({ lang, vertical });
            if (pageName) params.set("name", pageName);
            window.location.href = `/?${params}`;
          },
          loggedIn,
          loginHref,
          onSignOut: loggedIn ? logout : undefined,
        }}
      >
        <DoctorsContent />
      </LandingActionsProvider>
    </LanguageProvider>
  );
}
