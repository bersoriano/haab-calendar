"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HaabBookingModule } from "@/components/haab-booking-module";
import { AdminHero } from "@/components/provider/AdminHero";
import { SelectedWorkflowHeader } from "@/components/provider/SelectedWorkflowHeader";
import { logout } from "@/app/login/actions";
import type { Lang, ModuleStore, VerticalId } from "@/lib/types";
import {
  LandingActionsProvider,
  LandingPage,
  type LandingVertical,
} from "@/components/landing/landing-ui";
import { DashboardSection, UseCasesSection } from "@/components/landing/use-cases";
import {
  LanguageProvider,
  useLanguage,
} from "@/components/landing/language-provider";
import {
  translations as landingTranslations,
  type Lang as LandingLang,
} from "@/components/landing/translations";
import { withAuthReturnLanguage } from "@/lib/auth-i18n";
import type { PublicationStatus } from "@/lib/supabase/publication";
import { DEFAULT_STORAGE_KEY } from "@/lib/constants";
import { normalizeStore } from "@/lib/store";
import { resolveGuestChromeLanguage } from "@/lib/language/surface";
import {
  buildGuestPublishLoginHref,
  isGuestDraftMeaningful,
  shouldSeedBuilderFromLanding,
} from "@/lib/guest-builder";

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
  /** Server-resolved visitor language: cookie, Accept-Language, or the English default. */
  initialLanguage: LandingLang;
  /** Which example pages the landing section shows, picked per request. */
  featuredDemos: number[];
  /** Server-resolved language for the signed-in viewer; the dashboard default. */
  viewerLanguage: Lang;
  /** Supabase-backed provider data for configured users. */
  dashboardStore?: ModuleStore;
  /** Server-controlled ability to expose public URLs and booking actions. */
  publicationStatus?: PublicationStatus;
  /** Whether the signed-in account can open the super-admin area. */
  isSuperAdmin?: boolean;
  /** Continue a guest draft after signup, confirmation, or sign-in. */
  resumeGuestPublish?: boolean;
};

function loginHref(next: string, lang: LandingLang) {
  const params = new URLSearchParams({
    next: withAuthReturnLanguage(next, lang),
    lang,
  });
  return `/login?${params.toString()}`;
}

export function HomeExperience(props: HomeExperienceProps) {
  const dashboardLanguage = props.configured
    ? props.dashboardStore?.provider.dashboardLanguage
    : undefined;

  return (
    <LanguageProvider initialLang={dashboardLanguage ?? props.initialLanguage}>
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
  viewerLanguage,
  dashboardStore,
  publicationStatus,
  isSuperAdmin,
  featuredDemos,
  resumeGuestPublish = false,
}: HomeExperienceProps) {
  const router = useRouter();
  const { lang } = useLanguage();
  /**
   * The dashboard's one language. The chrome below (hero, workflow header,
   * guest bar) and the booking module are one composed screen, so they read a
   * single value: the owner's pinned workspace language, or the language the
   * server resolved for this viewer. It is deliberately NOT the landing
   * provider's `lang` — that one is the marketing site's, is writable by the
   * public switcher, and is backed by the global `haab-lang` cookie.
   */
  const [dashboardLanguage, setDashboardLanguage] = useState<Lang>(
    () => dashboardStore?.provider.dashboardLanguage ?? viewerLanguage,
  );
  const dashboardT = landingTranslations[dashboardLanguage];
  const [persistedDashboardStore, setPersistedDashboardStore] = useState<
    ModuleStore | undefined
  >();
  const effectiveDashboardStore = persistedDashboardStore ?? dashboardStore;
  const effectiveConfigured = configured || Boolean(effectiveDashboardStore?.setupComplete);
  const [guestDraftStore, setGuestDraftStore] = useState<ModuleStore>();
  const hasGuestDraft = Boolean(
    !loggedIn && guestDraftStore && isGuestDraftMeaningful(guestDraftStore),
  );

  useEffect(() => {
    if (loggedIn) return;

    const raw = window.localStorage.getItem(DEFAULT_STORAGE_KEY);
    if (!raw) return;

    try {
      const draft = normalizeStore(JSON.parse(raw) as ModuleStore);
      if (isGuestDraftMeaningful(draft)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the landing CTA from the existing browser-owned guest draft
        setGuestDraftStore(draft);
      }

      // A signed-out draft lives only in this browser, so the server had
      // nothing to resolve `viewerLanguage` from and the chrome started in the
      // visitor's browser language. The module, meanwhile, reads this same
      // draft and honours the workspace language pinned in it — so without
      // this the two halves of one screen disagree after every reload. Seeded
      // even from a draft that is not yet "meaningful": the language is
      // pinned before there is anything worth publishing.
      setDashboardLanguage(
        resolveGuestChromeLanguage({
          loggedIn,
          draftDashboardLanguage: draft.provider.dashboardLanguage,
          viewerLanguage,
        }),
      );
    } catch {
      // Malformed draft stays isolated; starting again will replace it safely.
    }
  }, [loggedIn, viewerLanguage]);

  // Returning from login with ?vertical=<id> jumps straight into setup for that
  // vertical. Configured users go to their dashboard instead, so they ignore it.
  const startInApp =
    loggedIn &&
    !effectiveConfigured &&
    (Boolean(initialVertical) || resumeGuestPublish);
  const [view, setView] = useState<View>(startInApp ? "app" : "home");
  const [selectedVertical, setSelectedVertical] = useState<
    VerticalId | undefined
  >(startInApp ? initialVertical : undefined);
  const [seedLandingSelection, setSeedLandingSelection] = useState(() =>
    shouldSeedBuilderFromLanding({
      hasSavedDraft: resumeGuestPublish,
      resumeGuestPublish,
      selectedVertical: startInApp ? initialVertical : undefined,
    }),
  );
  // Prefills the setup wizard so the page the visitor named on the landing page
  // is already there when setup opens.
  const [pageName, setPageName] = useState<string | undefined>(() =>
    startInApp ? normalizePageName(initialPageName) : undefined,
  );

  function openApp(
    vertical?: VerticalId,
    nextPageName?: string,
    seedSelection = true,
  ) {
    setSelectedVertical(vertical);
    setPageName(normalizePageName(nextPageName));
    setSeedLandingSelection(seedSelection);
    setView("app");
  }

  function backToHome() {
    setView("home");
    setSelectedVertical(undefined);
    setSeedLandingSelection(false);
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
      openApp(undefined, undefined, false);
      return;
    }

    if (hasGuestDraft) {
      openApp(
        guestDraftStore?.vertical,
        guestDraftStore?.provider.businessName,
        false,
      );
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
    openApp(vertical, nextPageName);
  }

  function requestGuestPublish() {
    router.push(buildGuestPublishLoginHref(lang));
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
        {!loggedIn ? (
          <GuestDraftBar lang={dashboardLanguage} onPublish={requestGuestPublish} />
        ) : null}
        <div className="mx-auto w-full max-w-[1600px] px-4 pt-6 sm:px-6 lg:px-8">
          <AdminHero lang={dashboardLanguage} />
        </div>
        <header
          className={`sticky top-0 z-50 bg-[var(--surface)]/95 backdrop-blur ${
            activeWorkflowVertical ? "" : "border-b border-[var(--line)]"
          }`}
        >
          <div className="mx-auto flex w-full max-w-[1600px] items-center px-4 py-3 sm:px-6 lg:px-8">
            {activeWorkflowVertical ? (
              <SelectedWorkflowHeader
                lang={dashboardLanguage}
                vertical={activeWorkflowVertical}
                onChooseAnother={backToHome}
                onSignOut={loggedIn ? logout : undefined}
                userEmail={email}
              />
            ) : (
              <button
                type="button"
                onClick={backToHome}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-lowest)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-highest)]"
              >
                {dashboardT.home.backToHome}
              </button>
            )}
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
          <HaabBookingModule
            injectedConfig={effectiveConfigured ? effectiveDashboardStore : undefined}
            userEmail={email}
            onSignOut={loggedIn ? logout : undefined}
            persistSetup={loggedIn && !effectiveConfigured}
            persistAdminChanges={loggedIn && effectiveConfigured}
            isGuestDraft={!loggedIn}
            resumeGuestPublish={loggedIn && resumeGuestPublish}
            onRequestPublish={requestGuestPublish}
            onStoreChange={(store) => {
              if (!loggedIn) {
                setGuestDraftStore(store);
              }
            }}
            onSetupPersisted={(store) => {
              setPersistedDashboardStore(store);
              router.replace("/");
              router.refresh();
            }}
            initialLanguage={effectiveConfigured ? undefined : lang}
            viewerLanguage={dashboardLanguage}
            initialVerticalId={
              effectiveConfigured || !seedLandingSelection ? undefined : selectedVertical
            }
            initialBusinessName={
              effectiveConfigured || !seedLandingSelection ? undefined : pageName
            }
            onDashboardLanguageChange={setDashboardLanguage}
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
        actions={{
          onStart,
          onSelectVertical,
          hasPage: effectiveConfigured,
          hasDraft: hasGuestDraft,
          loggedIn,
          // Returning here after signing in shows the dashboard panel for a
          // configured provider, or the workflow picker for a new one.
          loginHref: loginHref("/", lang),
          onOpenDashboard: () => openApp(),
        }}
      >
        <LandingPage
          featuredDemos={featuredDemos}
          showUseCases={!effectiveConfigured}
          afterHero={
            effectiveConfigured ? (
              <DashboardSection onOpen={() => openApp()} email={email} />
            ) : (
              <UseCasesSection onSelectVertical={onSelectVertical} />
            )
          }
        />
      </LandingActionsProvider>
    </>
  );
}

function GuestDraftBar({
  lang,
  onPublish,
}: {
  lang: LandingLang;
  onPublish: () => void;
}) {
  const t = landingTranslations[lang];

  return (
    <aside className="border-b border-[var(--line)] bg-[var(--teal-soft)] px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">
            {t.home.guestDraftTitle}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">{t.home.guestDraftBody}</p>
        </div>
        <button
          type="button"
          onClick={onPublish}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(26,115,232,0.2)] transition hover:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          {t.home.guestDraftPublish}
        </button>
      </div>
    </aside>
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
