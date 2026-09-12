import Link from "next/link";
import { translations, type Lang } from "@/components/landing/translations";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

/**
 * The auth surfaces' nav. It mirrors the landing page's StickyNav — same band,
 * same brand mark, same language control — so moving from the marketing page
 * into /login does not read as crossing into a different product. The switcher
 * lives here rather than in the page body for the same reason: one place on
 * every surface.
 *
 * `hrefFor` lets a page that carries state in its query string (login's `next`
 * and `mode`) build the switch links itself; everything else keeps the
 * relative `?lang=` form, which preserves the current path.
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
    <header className="sticky top-0 z-40 w-full border-b border-[rgba(193,198,214,0.72)] bg-[rgba(248,249,252,0.86)] shadow-[0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-2xl">
      <div className="mx-auto flex min-h-[72px] w-full max-w-[1344px] items-center justify-between gap-3 px-4 py-3 sm:min-h-[80px] sm:gap-4 sm:px-8 sm:py-4">
        <Link
          href={landingHref}
          aria-label={`${homeCopy.backToHome} — ${navCopy.brand}`}
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]"
        >
          <span
            aria-hidden="true"
            className="grid h-9 w-9 place-items-center rounded-2xl bg-[var(--primary-container)] text-sm font-bold text-white shadow-[0_8px_22px_rgba(26,115,232,0.26)] sm:h-10 sm:w-10"
          >
            H
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ink)] max-[379px]:sr-only sm:text-base">
            {navCopy.brand}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-5">
          <LanguageSwitcher
            lang={lang}
            hrefFor={languageHrefFor ?? ((option) => `?lang=${option}`)}
          />
          <Link
            href={landingHref}
            className="hidden min-h-11 items-center rounded-md px-1 py-2 text-sm font-semibold text-[var(--ink)] transition hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] sm:inline-flex"
          >
            {homeCopy.backToHome}
          </Link>
        </div>
      </div>
    </header>
  );
}
