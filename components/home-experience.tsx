"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HaabBookingModule } from "@/components/haab-booking-module";
import { AdminHero } from "@/components/provider/AdminHero";
import { SelectedWorkflowHeader } from "@/components/provider/SelectedWorkflowHeader";
import { logout } from "@/app/login/actions";
import { stopDemoEdit } from "@/app/super-admin/actions";
import { VERTICALS } from "@/config/verticals";
import type { Lang, ModuleStore, VerticalId } from "@/lib/types";
import {
  LandingActionsProvider,
  LandingPage,
  type LandingVertical,
} from "@/components/landing/landing-ui";
import {
  LanguageProvider,
  useLanguage,
} from "@/components/landing/language-provider";
import {
  translations as landingTranslations,
  type Lang as LandingLang,
} from "@/components/landing/translations";
import { withAuthReturnLanguage } from "@/lib/auth-i18n";
import type { ProviderEntitlements } from "@/lib/entitlements/resolve";
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

/** Set when the super admin is editing one of the public example pages. */
export type DemoEditBanner = {
  label: string;
  publicPath: string;
};

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
  /**
   * Server-resolved feature access, kept apart from the store: the store is
   * editable configuration that round-trips through the provider API, and this
   * is a read-only answer about what the account may use. Absent for guests,
   * for standalone mode, and whenever the resolve failed — the UI treats the
   * absence as "cannot tell", never as access.
   */
  providerEntitlements?: ProviderEntitlements;
  /** Server-controlled ability to expose public URLs and booking actions. */
  publicationStatus?: PublicationStatus;
  /** Whether the signed-in account can open the super-admin area. */
  isSuperAdmin?: boolean;
  /** Active demo-editing session; the dashboard edits that example page. */
  demoEdit?: DemoEditBanner;
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
  providerEntitlements,
  publicationStatus,
  isSuperAdmin,
  demoEdit,
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
  // A demo-editing session lands straight in the editor for that example page.
  const [view, setView] = useState<View>(
    startInApp || demoEdit ? "app" : "home",
  );
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
        <DemoEditBar demoEdit={demoEdit} />
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
            providerEntitlements={providerEntitlements}
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
      <DemoEditBar demoEdit={demoEdit} />
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

// Demo editing changes what every save in this session writes to, so the
// target stays on screen with a one-click way out.
function DemoEditBar({ demoEdit }: { demoEdit?: DemoEditBanner }) {
  if (!demoEdit) {
    return null;
  }

  return (
    <aside className="border-b border-violet-200 bg-violet-50 px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-violet-900">
          <span className="font-semibold">Editing demo page:</span>{" "}
          {demoEdit.label}
          <span className="ml-2 text-violet-700">{demoEdit.publicPath}</span>
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={demoEdit.publicPath}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-violet-800 hover:underline"
          >
            View live
          </Link>
          <form action={stopDemoEdit}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
            >
              Exit demo editing
            </button>
          </form>
        </div>
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
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {VERTICALS.map((v) => {
            const verticalCopy = t.home.verticals[v.id];

            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectVertical(v.id as LandingVertical)}
                className="flex flex-col gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-lowest)] p-6 text-left transition hover:border-[rgba(26,115,232,0.28)]"
              >
                <span className="text-lg font-semibold tracking-[-0.015em] text-[var(--ink)]">
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
