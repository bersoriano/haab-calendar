"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { bookingTranslations } from "@/components/booking/i18n/translations";
// Same "haab-lang" string as the cookie, but this page still only reads and
// writes it via localStorage, not the cookie the proxy/server resolve —
// Task 6 moves this page onto the server-resolved language.
import { LANGUAGE_COOKIE as LANDING_LANGUAGE_STORAGE_KEY } from "@/lib/language/resolve";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function NotFoundPage() {
  const [lang, setLang] = useState<Lang>("en");
  const t = bookingTranslations[lang];

  useEffect(() => {
    const queryLanguage = new URLSearchParams(window.location.search).get("lang");
    const savedLanguage = window.localStorage.getItem(LANDING_LANGUAGE_STORAGE_KEY);
    const preferredLanguage =
      queryLanguage === "en" || queryLanguage === "es"
        ? queryLanguage
        : savedLanguage === "en" || savedLanguage === "es"
          ? savedLanguage
          : "en";

    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the visitor's language after hydration
    setLang(preferredLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem(LANDING_LANGUAGE_STORAGE_KEY, lang);
  }, [lang]);

  function chooseLanguage(nextLanguage: Lang) {
    setLang(nextLanguage);
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#eef2f5] px-5 py-10">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/bkg2.jpg')] bg-cover bg-center opacity-70"
      />
      <section className="relative w-full max-w-xl rounded-[34px] border border-white/80 bg-[rgba(255,255,255,0.82)] p-6 text-center shadow-[0_32px_90px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:p-10">
        <div
          role="group"
          aria-label={t.language.chooseLanguage}
          className="mx-auto mb-10 inline-flex rounded-full border border-[var(--line)] bg-white/80 p-1"
        >
          {(["en", "es"] as const).map((language) => (
            <button
              key={language}
              type="button"
              aria-pressed={lang === language}
              onClick={() => chooseLanguage(language)}
              className={cn(
                "min-h-10 rounded-full px-4 text-sm font-semibold transition",
                lang === language
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]",
              )}
            >
              {language === "en" ? t.language.english : t.language.spanish}
            </button>
          ))}
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
          {t.notFound.eyebrow}
        </p>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-4xl">
          {t.notFound.title}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[var(--muted)]">
          {t.notFound.body}
        </p>
        <Link
          href={`/?lang=${lang}`}
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(26,115,232,0.24)] transition hover:opacity-90"
        >
          {t.notFound.goHome}
        </Link>
      </section>
    </main>
  );
}
