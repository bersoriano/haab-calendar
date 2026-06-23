"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HaabBookingModule } from "@/components/haab-booking-module";
import { logout } from "@/app/login/actions";
import { VERTICALS } from "@/config/verticals";
import type { VerticalId } from "@/lib/types";
import {
  LandingActionsProvider,
  LandingPage,
  type LandingVertical,
} from "@/components/landing/landing-ui";
import {
  LanguageProvider,
  useLanguage,
} from "@/components/landing/language-provider";

type View = "home" | "app";

type HomeExperienceProps = {
  loggedIn: boolean;
  /** True when the signed-in user has finished provider setup. */
  configured: boolean;
  email?: string;
  /** Pre-selected vertical, e.g. after returning from login via ?vertical=. */
  initialVertical?: LandingVertical;
};

function loginHref(next: string) {
  return `/login?next=${encodeURIComponent(next)}`;
}

export function HomeExperience(props: HomeExperienceProps) {
  return (
    <LanguageProvider>
      <HomeExperienceInner {...props} />
    </LanguageProvider>
  );
}

function HomeExperienceInner({
  loggedIn,
  configured,
  email,
  initialVertical,
}: HomeExperienceProps) {
  const router = useRouter();
  // Returning from login with ?vertical=<id> jumps straight into setup for that
  // vertical. Configured users go to their dashboard instead, so they ignore it.
  const startInApp = loggedIn && !configured && Boolean(initialVertical);
  const [view, setView] = useState<View>(startInApp ? "app" : "home");
  const [selectedVertical, setSelectedVertical] = useState<
    VerticalId | undefined
  >(startInApp ? initialVertical : undefined);

  function openApp(vertical?: VerticalId) {
    setSelectedVertical(vertical);
    setView("app");
  }

  function backToHome() {
    setView("home");
    setSelectedVertical(undefined);
    // Drop any ?vertical= param so a refresh lands back on the landing page.
    router.replace("/");
  }

  // Generic "create your page" CTA.
  function onStart() {
    if (configured || loggedIn) {
      openApp();
      return;
    }
    router.push(loginHref("/"));
  }

  function onSelectVertical(vertical: LandingVertical) {
    if (loggedIn) {
      openApp(vertical);
      return;
    }
    router.push(loginHref(`/?vertical=${vertical}`));
  }

  if (view === "app") {
    return (
      <div className="flex min-h-full flex-col">
        <div className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--surface)] backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1600px] items-center px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={backToHome}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-lowest)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-highest)]"
            >
              ← Back to home
            </button>
          </div>
        </div>
        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
          <HaabBookingModule
            userEmail={email}
            onSignOut={logout}
            initialVerticalId={configured ? undefined : selectedVertical}
          />
        </main>
      </div>
    );
  }

  return (
    <LandingActionsProvider actions={{ onStart, onSelectVertical }}>
      <LandingPage
        afterHero={
          configured ? (
            <DashboardPanel onOpen={() => openApp()} email={email} />
          ) : (
            <VerticalsPanel onSelectVertical={onSelectVertical} />
          )
        }
      />
    </LandingActionsProvider>
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
  return (
    <section className="px-5 py-14 sm:px-8">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-5 rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-8 text-center shadow-[0_18px_46px_rgba(15,23,42,0.06)] sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
          {email ? `Signed in as ${email}` : "You're signed in"}
        </p>
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          Your booking page is ready
        </h2>
        <p className="max-w-xl text-base leading-7 text-[var(--muted)]">
          Manage availability, services, and incoming bookings from your
          dashboard.
        </p>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(26,115,232,0.28)] transition hover:shadow-[0_18px_40px_rgba(26,115,232,0.34)] active:translate-y-px"
        >
          Go to your dashboard →
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
    <section id="verticals" className="px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-[1280px]">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
            {t.useCases.eyebrow}
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            {t.useCases.title}
          </h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VERTICALS.map((v, i) => (
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
                {v.label.charAt(0)}
              </span>
              <span className="text-lg font-semibold text-[var(--ink)]">
                {v.label}
              </span>
              <span className="text-[15px] leading-7 text-[var(--muted)]">
                {v.tagline}
              </span>
              <span className="mt-auto text-sm font-semibold text-[var(--primary)]">
                Start with {v.label} →
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
