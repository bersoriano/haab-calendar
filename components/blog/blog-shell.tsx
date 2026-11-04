"use client";

import type { ReactNode } from "react";

import { logout } from "@/app/login/actions";
import {
  Footer,
  LandingActionsProvider,
  LandingDialogsProvider,
  StickyNav,
} from "@/components/landing/landing-ui";
import { LanguageProvider } from "@/components/landing/language-provider";
import { LandingScope } from "@/components/landing/primitives";
import type { Lang } from "@/lib/types";

/**
 * The landing chrome around a blog page, wired like the gallery's: nothing here
 * starts setup in place, because the landing page owns that flow.
 *
 * The text in `children` was rendered on the server in one language, so
 * switching language loads the page again rather than swapping words in place.
 */
export function BlogShell({
  children,
  lang,
  loggedIn,
  loginHref,
  path,
}: {
  children: ReactNode;
  lang: Lang;
  loggedIn: boolean;
  loginHref: string;
  path: string;
}) {
  return (
    <LanguageProvider
      initialLang={lang}
      languagePaths={{ en: `${path}?lang=en`, es: `${path}?lang=es` }}
    >
      <LandingActionsProvider
        actions={{
          onStart: () => {
            window.location.href = `/?lang=${lang}`;
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
        <LandingDialogsProvider>
          <LandingScope>
            <StickyNav alwaysShowCta anchorsGoHome showUseCases={false} />
            {children}
            <Footer anchorsGoHome showUseCases={false} />
          </LandingScope>
        </LandingDialogsProvider>
      </LandingActionsProvider>
    </LanguageProvider>
  );
}
