import Link from "next/link";
import { translations, type Lang } from "@/components/landing/translations";

export function LoginHeader({ lang }: { lang: Lang }) {
  const homeCopy = translations[lang].home;
  const landingHref = `/?lang=${lang}`;

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-[1120px] items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <Link
          href={landingHref}
          aria-label={`${homeCopy.backToHome} — Haab Calendar`}
          className="inline-flex min-h-11 items-center gap-3 rounded-full pr-3 text-[var(--ink)] transition hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--primary),var(--teal))] text-sm font-bold text-white shadow-[0_10px_24px_rgba(26,115,232,0.24)]"
          >
            H
          </span>
          <span className="text-sm font-semibold sm:text-base">Haab Calendar</span>
        </Link>
        <Link
          href={landingHref}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          {homeCopy.backToHome}
        </Link>
      </div>
    </header>
  );
}
