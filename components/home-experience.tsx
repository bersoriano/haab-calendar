"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HaabBookingModule } from "@/components/haab-booking-module";
import { AdminHero } from "@/components/provider/AdminHero";
import { SelectedWorkflowHeader } from "@/components/provider/SelectedWorkflowHeader";
import { logout } from "@/app/login/actions";
import { VERTICALS } from "@/config/verticals";
import type { ModuleStore, VerticalId } from "@/lib/types";
import {
  LandingActionsProvider,
  LandingPage,
  type LandingVertical,
} from "@/components/landing/landing-ui";
import {
  LanguageProvider,
  useLanguage,
} from "@/components/landing/language-provider";
import type { Lang as LandingLang } from "@/components/landing/translations";
import { withAuthReturnLanguage } from "@/lib/auth-i18n";
import type { PublicationStatus } from "@/lib/supabase/publication";

type View = "home" | "app";

/** Page name captured on the landing page, before any account exists. */
const MAX_PAGE_NAME_LENGTH = 60;

function normalizePageName(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, MAX_PAGE_NAME_LENGTH) : undefined;
}

type HomeExperienceProps = {
  loggedIn: boolean;
  /** True when the signed-in user has finished provider setup. */
  configured: boolean;
  email?: string;
  /** Pre-selected vertical, e.g. after returning from login via ?vertical=. */
  initialVertical?: LandingVertical;
  /** Page name chosen on the landing page, carried through login via ?name=. */
  initialPageName?: string;
  /** Visitor language carried explicitly through the authentication return URL. */
  initialLanguage?: LandingLang;
  /** Supabase-backed provider data for configured users. */
  dashboardStore?: ModuleStore;
  /** Server-controlled ability to expose public URLs and booking actions. */
  publicationStatus?: PublicationStatus;
  /** Whether the signed-in account can open the super-admin area. */
  isSuperAdmin?: boolean;
};

function loginHref(next: string, lang: LandingLang) {
  const params = new URLSearchParams({
    next: withAuthReturnLanguage(next, lang),
    lang,
  });
  return `/login?${params.toString()}`;
}

export function HomeExperience(props: HomeExperienceProps) {
  const configuredLanguage = props.configured
    ? props.dashboardStore?.provider.language
    : undefined;

  return (
    <LanguageProvider initialLang={configuredLanguage ?? props.initialLanguage}>
      <HomeExperienceInner {...props} />
    </LanguageProvider>
  );
}

function HomeExperienceInner({
  loggedIn,
  configured,
  email,
  initialVertical,
  initialPageName,
  dashboardStore,
  publicationStatus,
  isSuperAdmin,
}: HomeExperienceProps) {
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();
  const [persistedDashboardStore, setPersistedDashboardStore] = useState<
    ModuleStore | undefined
  >();
  const effectiveDashboardStore = persistedDashboardStore ?? dashboardStore;
  const effectiveConfigured = configured || Boolean(effectiveDashboardStore?.setupComplete);

  // Returning from login with ?vertical=<id> jumps straight into setup for that
  // vertical. Configured users go to their dashboard instead, so they ignore it.
  const startInApp = loggedIn && !effectiveConfigured && Boolean(initialVertical);
  const [view, setView] = useState<View>(startInApp ? "app" : "home");
  const [selectedVertical, setSelectedVertical] = useState<
    VerticalId | undefined
  >(startInApp ? initialVertical : undefined);
  // Prefills the setup wizard so the page the visitor named on the landing page
  // is already there when setup opens.
  const [pageName, setPageName] = useState<string | undefined>(() =>
    startInApp ? normalizePageName(initialPageName) : undefined,
  );

  function openApp(vertical?: VerticalId, nextPageName?: string) {
    setSelectedVertical(vertical);
    setPageName(normalizePageName(nextPageName));
    setView("app");
  }

  function backToHome() {
    setView("home");
    setSelectedVertical(undefined);
    // Drop any ?vertical= param so a refresh lands back on the landing page.
    router.replace("/");
  }

  function handleVerticalChange(vertical?: VerticalId) {
    if (!vertical && !effectiveConfigured) {
      backToHome();
      return;
    }

    setSelectedVertical(vertical);
  }

  // "Create your page" for someone who already has one: straight to the app.
  function onStart() {
    if (effectiveConfigured) {
      openApp();
      return;
    }

    document.getElementById("verticals")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  // Landing first step complete: workflow chosen, page optionally named. Signed
  // in, setup opens right away; otherwise both survive the login round-trip.
  function onSelectVertical(vertical: LandingVertical, nextPageName?: string) {
    if (loggedIn) {
      openApp(vertical, nextPageName);
      return;
    }

    const named = normalizePageName(nextPageName);
    // encodeURIComponent, not URLSearchParams: "+" for a space survives one
    // round-trip but not every parser, and this string is shown back to the user.
    const query = named
      ? `vertical=${vertical}&name=${encodeURIComponent(named)}`
      : `vertical=${vertical}`;
    router.push(loginHref(`/?${query}`, lang));
  }

  if (view === "app") {
    const activeWorkflowVertical =
      selectedVertical ?? effectiveDashboardStore?.vertical;

    return (
      <div className="flex min-h-full flex-col">
        <AccountStatusBar
          isSuperAdmin={isSuperAdmin}
          publicationStatus={publicationStatus}
        />
        <div className="mx-auto w-full max-w-[1600px] px-4 pt-6 sm:px-6 lg:px-8">
          <AdminHero />
        </div>
        <header
          className={`sticky top-0 z-50 bg-[var(--surface)]/95 backdrop-blur ${
            activeWorkflowVertical ? "" : "border-b border-[var(--line)]"
          }`}
        >
          <div className="mx-auto flex w-full max-w-[1600px] items-center px-4 py-3 sm:px-6 lg:px-8">
            {activeWorkflowVertical ? (
              <SelectedWorkflowHeader
                lang={lang}
                vertical={activeWorkflowVertical}
                onChooseAnother={backToHome}
                onSignOut={logout}
                userEmail={email}
              />
            ) : (
              <button
                type="button"
                onClick={backToHome}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-lowest)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-highest)]"
              >
                {t.home.backToHome}
              </button>
            )}
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
          <HaabBookingModule
            injectedConfig={effectiveConfigured ? effectiveDashboardStore : undefined}
            userEmail={email}
            onSignOut={logout}
            persistSetup={loggedIn && !effectiveConfigured}
            persistAdminChanges={loggedIn && effectiveConfigured}
            onSetupPersisted={(store) => {
              setPersistedDashboardStore(store);
              router.refresh();
            }}
            initialLanguage={effectiveConfigured ? undefined : lang}
            initialVerticalId={effectiveConfigured ? undefined : selectedVertical}
            initialBusinessName={effectiveConfigured ? undefined : pageName}
            onLanguageChange={setLang}
            onVerticalChange={handleVerticalChange}
          />
        </main>
      </div>
    );
  }

  return (
    <>
      <AccountStatusBar
        isSuperAdmin={isSuperAdmin}
        publicationStatus={publicationStatus}
      />
      <LandingActionsProvider
        actions={{ onStart, onSelectVertical, hasPage: effectiveConfigured }}
      >
        <LandingPage
          afterHero={
            effectiveConfigured ? (
              <DashboardPanel onOpen={() => openApp()} email={email} />
            ) : (
              <VerticalsPanel onSelectVertical={onSelectVertical} />
            )
          }
        />
      </LandingActionsProvider>
    </>
  );
}

function AccountStatusBar({
  isSuperAdmin,
  publicationStatus,
}: {
  isSuperAdmin?: boolean;
  publicationStatus?: PublicationStatus;
}) {
  if (!isSuperAdmin && !publicationStatus?.dashboardMessage) {
    return null;
  }

  return (
    <aside className="border-b border-[var(--line)] bg-white px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {publicationStatus?.dashboardMessage ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
              publicationStatus.publishingEnabled
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
            role={publicationStatus.publishingEnabled ? "status" : "alert"}
          >
            {publicationStatus.dashboardMessage}
          </div>
        ) : (
          <span />
        )}
        {isSuperAdmin ? (
          <Link
            href="/super-admin"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
          >
            Open super admin
          </Link>
        ) : null}
      </div>
    </aside>
  );
}

// Shown below the hero to a configured user: a direct route into their app.
function DashboardPanel({
  onOpen,
  email,
}: {
  onOpen: () => void;
  email?: string;
}) {
  const { t } = useLanguage();

  return (
    <section className="px-5 py-14 sm:px-8">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-5 rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-8 text-center shadow-[0_18px_46px_rgba(15,23,42,0.06)] sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
          {email ? `${t.home.signedInAs} ${email}` : t.home.signedIn}
        </p>
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          {t.home.bookingPageReady}
        </h2>
        <p className="max-w-xl text-base leading-7 text-[var(--muted)]">
          {t.home.dashboardBody}
        </p>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(26,115,232,0.28)] transition hover:shadow-[0_18px_40px_rgba(26,115,232,0.34)] active:translate-y-px"
        >
          {t.home.goToDashboard}
        </button>
      </div>
    </section>
  );
}

// Shown below the hero to everyone who hasn't configured yet: pick a vertical
// to start. Uses the real preset data from config/verticals.ts.
function VerticalsPanel({
  onSelectVertical,
}: {
  onSelectVertical: (vertical: LandingVertical) => void;
}) {
  const { t } = useLanguage();
  const tones = [
    "from-[rgba(13,148,136,0.16)] to-[rgba(26,115,232,0.06)] text-[var(--teal)]",
    "from-[rgba(26,115,232,0.16)] to-[rgba(13,148,136,0.07)] text-[var(--primary)]",
    "from-[rgba(26,115,232,0.16)] to-[rgba(13,148,136,0.07)] text-[var(--primary)]",
    "from-[rgba(217,119,6,0.16)] to-[rgba(26,115,232,0.05)] text-[#b45309]",
  ];

  return (
    <section id="verticals" className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-[1280px]">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
            {t.useCases.eyebrow}
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            {t.useCases.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--muted)] sm:text-lg">
            {t.useCases.body}
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VERTICALS.map((v, i) => {
            const verticalCopy = t.home.verticals[v.id];

            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectVertical(v.id as LandingVertical)}
                className="flex flex-col gap-4 rounded-[24px] border border-[var(--line)] bg-[var(--surface-lowest)] p-6 text-left shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
              >
                <span
                  aria-hidden="true"
                  className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-sm font-bold ${tones[i % tones.length]}`}
                >
                  {verticalCopy.label.charAt(0)}
                </span>
                <span className="text-lg font-semibold text-[var(--ink)]">
                  {verticalCopy.label}
                </span>
                <span className="text-[15px] leading-7 text-[var(--muted)]">
                  {verticalCopy.tagline}
                </span>
                <span className="mt-auto text-sm font-semibold text-[var(--primary)]">
                  {verticalCopy.start}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
