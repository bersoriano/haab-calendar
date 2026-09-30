"use client";

import Link from "next/link";

import { DEMO_PAGES } from "@/lib/demo-pages";
import { cn } from "@/lib/utils";
import {
  DemoGrid,
  Footer,
  LandingActionsProvider,
  StickyNav,
  formatDemoCount,
} from "./landing-ui";
import { LanguageProvider, useLanguage } from "./language-provider";
import { LandingScope, SectionHeading, lpBody, lpButtonClass } from "./primitives";
import type { Lang } from "./translations";

function GalleryContent({ indexes }: { indexes: number[] }) {
  const { lang, t } = useLanguage();

  return (
    <LandingScope>
      <StickyNav alwaysShowCta anchorsGoHome showUseCases={false} />
      <main className={cn(lpBody, "flex-1 bg-white px-5 pb-[72px] pt-14 sm:px-8 lg:pb-[120px] lg:pt-20")}>
        <div className="mx-auto max-w-[1200px]">
          <SectionHeading
            as="h1"
            eyebrow={t.gallery.eyebrow}
            title={t.gallery.title}
            body={formatDemoCount(t.gallery.body, DEMO_PAGES.length)}
          />
          <DemoGrid indexes={indexes} />
          <div className="mt-10 flex flex-col items-center gap-4 text-center lg:mt-14">
            <p className="text-[13.5px] text-[var(--lp-muted)] sm:text-[14.5px]">{t.gallery.note}</p>
            <Link
              href={`/?lang=${lang}`}
              className={lpButtonClass({ variant: "outline-ink", size: "card" })}
            >
              {t.gallery.back}
            </Link>
          </div>
        </div>
      </main>
      <Footer anchorsGoHome showUseCases={false} />
    </LandingScope>
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
