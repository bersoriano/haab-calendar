"use client";

import Link from "next/link";

import { DEMO_PAGES } from "@/lib/demo-pages";
import {
  DemoGrid,
  Footer,
  LandingActionsProvider,
  StickyNav,
  formatDemoCount,
} from "./landing-ui";
import { LanguageProvider, useLanguage } from "./language-provider";
import type { Lang } from "./translations";

function GalleryContent({ indexes }: { indexes: number[] }) {
  const { lang, t } = useLanguage();

  return (
    <>
      <StickyNav alwaysShowCta />
      <main className="flex-1 px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
            {t.gallery.eyebrow}
          </p>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            {t.gallery.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
            {formatDemoCount(t.gallery.body, DEMO_PAGES.length)}
          </p>
          <DemoGrid indexes={indexes} />
          <p className="mt-8 text-center text-xs text-[var(--muted)]">{t.gallery.note}</p>
          <p className="mt-6 text-center">
            <Link
              href={`/?lang=${lang}`}
              className="text-sm font-semibold text-[var(--primary)] hover:underline"
            >
              {t.gallery.back}
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

/**
 * The gallery reuses the landing chrome, so it needs the actions context the
 * nav and footer read. Nothing here starts setup in place: both entry points
 * hand the visitor back to the landing page, which owns that flow.
 */
export function DemoGalleryPage({
  indexes,
  initialLanguage,
  loggedIn,
  loginHref,
}: {
  indexes: number[];
  initialLanguage: Lang;
  loggedIn: boolean;
  loginHref: string;
}) {
  return (
    <LanguageProvider initialLang={initialLanguage}>
      <LandingActionsProvider
        actions={{
          onStart: () => {
            window.location.href = `/?lang=${initialLanguage}`;
          },
          onSelectVertical: (vertical) => {
            window.location.href = `/?lang=${initialLanguage}&vertical=${vertical}`;
          },
          loggedIn,
          loginHref,
        }}
      >
        <GalleryContent indexes={indexes} />
      </LandingActionsProvider>
    </LanguageProvider>
  );
}
