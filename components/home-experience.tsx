"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HaabBookingModule } from "@/components/haab-booking-module";
import { AccountStatusBar } from "@/components/provider/AccountStatusBar";
import { DraftSaveBar } from "@/components/provider/DraftSaveBar";
import { SetupHeader } from "@/components/provider/SetupHeader";
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
import { translations, type Lang as LandingLang } from "@/components/landing/translations";
import { withAuthReturnLanguage } from "@/lib/auth-i18n";
import type { PublicationStatus } from "@/lib/supabase/publication";
import { DEFAULT_STORAGE_KEY } from "@/lib/constants";
import { draftSaveMode, publishDraft } from "@/lib/draft-workspace";
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
  const [persistedDashboardStore, setPersistedDashboardStore] = useState<
    ModuleStore | undefined
  >();
  const effectiveDashboardStore = persistedDashboardStore ?? dashboardStore;
  const effectiveConfigured = configured || Boolean(effectiveDashboardStore?.setupComplete);
  // The page while it lives only in this browser, as the module last reported
  // it: a guest's, or a signed-in account's that has not published yet.
  const [draftStore, setDraftStore] = useState<ModuleStore>();
  const hasGuestDraft = Boolean(
    !loggedIn && draftStore && isGuestDraftMeaningful(draftStore),
  );
  const [isPublishingDraft, setIsPublishingDraft] = useState(false);
  const [draftPublishError, setDraftPublishError] = useState<string | null>(null);

  useEffect(() => {
    if (loggedIn) return;

    const raw = window.localStorage.getItem(DEFAULT_STORAGE_KEY);
    if (!raw) return;

    try {
      const draft = normalizeStore(JSON.parse(raw) as ModuleStore);
      if (isGuestDraftMeaningful(draft)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the landing CTA from the existing browser-owned guest draft
        setDraftStore(draft);
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

  // Signed out, a ?vertical= from another page (the gallery's first step, the
  // online booking page for doctors) is this page's own first step answered
  // elsewhere: open setup for it, exactly as choosing it here would. The
  // server cannot do this for a guest the way startInApp does for an account:
  // a guest's draft lives in this browser, so the builder opens after
  // hydration, and landingSelectionSeedsDraft keeps an existing draft's work.
  const openedFromLink = useRef(false);
  useEffect(() => {
    if (loggedIn || !initialVertical || openedFromLink.current) return;
    openedFromLink.current = true;
    openApp(initialVertical, initialPageName);
    // Once, on arrival: the link's answer, not a setting to keep re-applying.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        draftStore?.vertical,
        draftStore?.provider.businessName,
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

  // A signed-in account with a finished draft and no page: publishing is one
  // save away, and the dashboard then loads the page fresh from the server.
  async function publishAccountDraft() {
    if (!draftStore || isPublishingDraft) {
      return;
    }

    setIsPublishingDraft(true);
    setDraftPublishError(null);
    const result = await publishDraft(draftStore);

    if (!result.ok) {
      setIsPublishingDraft(false);
      setDraftPublishError(
        (result.reason === "refused" && result.message) ||
          translations[dashboardLanguage].home.accountDraftPublishFailed,
      );
      return;
    }

    router.push("/dashboard");
  }

  // Coming back from sign-up to publish a guest draft, setup's last step does
  // the publishing and offers its own retry: a second button would race it.
  const saveMode =
    loggedIn && resumeGuestPublish
      ? null
      : draftSaveMode({
          loggedIn,
          configured: effectiveConfigured,
          draftFinished: Boolean(draftStore?.setupComplete),
        });

  if (view === "app") {
    const activeWorkflowVertical =
      selectedVertical ?? effectiveDashboardStore?.vertical;

    return (
      <div className="flex min-h-full flex-col">
        <AccountStatusBar
          isSuperAdmin={isSuperAdmin}
          publicationStatus={publicationStatus}
        />
        <SetupHeader
          lang={dashboardLanguage}
          vertical={activeWorkflowVertical}
          userEmail={email}
          onChooseAnother={backToHome}
          onBackToHome={backToHome}
          onSignOut={loggedIn ? logout : undefined}
        />
        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
          <HaabBookingModule
            injectedConfig={effectiveConfigured ? effectiveDashboardStore : undefined}
            persistSetup={loggedIn && !effectiveConfigured}
            persistAdminChanges={loggedIn && effectiveConfigured}
            isGuestDraft={!loggedIn}
            resumeGuestPublish={loggedIn && resumeGuestPublish}
            onRequestPublish={requestGuestPublish}
            onStoreChange={(store) => {
              if (!effectiveConfigured) {
                setDraftStore(store);
              }
            }}
            // Publishing keeps the Done step on screen; "Go to dashboard" is
            // what takes the owner to /dashboard, freshly loaded.
            onSetupPersisted={(store) => setPersistedDashboardStore(store)}
            onOpenDashboard={() => router.push("/dashboard")}
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
        {/* After the content, so it sticks to the bottom of the screen. */}
        {saveMode ? (
          <DraftSaveBar
            lang={dashboardLanguage}
            mode={saveMode}
            onPublish={saveMode === "guest" ? requestGuestPublish : () => void publishAccountDraft()}
            publishing={isPublishingDraft}
            error={draftPublishError}
          />
        ) : null}
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
          onOpenDashboard: () => router.push("/dashboard"),
          accountEmail: email,
          onSignOut: loggedIn ? logout : undefined,
        }}
      >
        <LandingPage
          featuredDemos={featuredDemos}
          showUseCases={!effectiveConfigured}
          afterHero={
            effectiveConfigured ? (
              <DashboardSection onOpen={() => router.push("/dashboard")} email={email} />
            ) : (
              <UseCasesSection onSelectVertical={onSelectVertical} />
            )
          }
        />
      </LandingActionsProvider>
    </>
  );
}
