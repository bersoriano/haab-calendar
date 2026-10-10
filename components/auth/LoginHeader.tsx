import Link from "next/link";

import { BrandMark, LanguageLinks, focusRing } from "@/components/app-ui";
import { translations, type Lang } from "@/components/landing/translations";
import { cn } from "@/lib/utils";

/**
 * The auth pages' bar. Signing in belongs to the app, so it uses the app's
 * bar rather than the landing page's band: mark and name on the left, the
 * language control and the way back on the right. The language control lives
 * here, not in the page body, so every auth page has it in one place.
 *
 * `languageHrefFor` lets a page that carries state in its query string
 * (login's `next` and `mode`) build the switch links itself; everything else
 * keeps the relative `?lang=` form, which preserves the current path.
 */
export function LoginHeader({
  lang,
  languageHrefFor,
}: {
  lang: Lang;
  languageHrefFor?: (lang: Lang) => string;
}) {
  const homeCopy = translations[lang].home;
  const navCopy = translations[lang].nav;
  const landingHref = `/?lang=${lang}`;

  return (
    <header className="sticky top-0 z-40 border-b border-app-border bg-app-surface">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Named by its visible text, plus where it goes: an aria-label that
            left out the visible "Haab Calendar" failed label-in-name. */}
        <Link
          href={landingHref}
          className={cn("flex min-h-11 shrink-0 items-center gap-2.5 rounded-md", focusRing)}
        >
          <BrandMark />
          <span className="text-sm font-bold text-app-fg max-[379px]:sr-only">{navCopy.brand}</span>
          <span className="sr-only">{`: ${homeCopy.backToHome.replace(/^←\s*/, "")}`}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <LanguageLinks lang={lang} hrefFor={languageHrefFor ?? ((option) => `?lang=${option}`)} />
          <Link
            href={landingHref}
            className={cn(
              "hidden min-h-11 items-center rounded-md px-1 text-sm font-semibold text-app-fg-secondary transition-colors hover:text-app-fg sm:inline-flex",
              focusRing,
            )}
          >
            {homeCopy.backToHome}
          </Link>
        </div>
      </div>
    </header>
  );
}
