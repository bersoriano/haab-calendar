"use client";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import { lpBody } from "./primitives";

const LANGUAGES = ["en", "es"] as const;

/**
 * The landing's EN/ES segmented pill. The shared LanguageSwitcher belongs to the
 * login and booking surfaces, so the landing gets its own control; it reuses
 * the same aria labels so assistive tech hears the same thing everywhere.
 */
export function LangPill({
  lang,
  onChange,
  className,
}: {
  lang: Lang;
  onChange: (lang: Lang) => void;
  className?: string;
}) {
  const t = bookingTranslations[lang];

  return (
    <div
      role="group"
      aria-label={t.language.chooseLanguage}
      className={cn(
        lpBody,
        "inline-flex gap-0.5 rounded-full border border-[#d6e3e0] bg-white/80 p-[3px] sm:p-1",
        className,
      )}
    >
      {LANGUAGES.map((language) => {
        const active = lang === language;

        return (
          <button
            key={language}
            type="button"
            aria-label={
              language === "en" ? t.language.switchToEnglish : t.language.switchToSpanish
            }
            aria-pressed={active}
            onClick={() => onChange(language)}
            className={cn(
              "min-h-8 rounded-full px-2.5 text-[12px] font-bold uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-teal-600)] sm:min-h-9 sm:px-3.5 sm:text-[13.5px]",
              active
                ? "bg-[var(--lp-ink)] text-white"
                : "text-[var(--lp-muted)] hover:text-[var(--lp-ink)]",
            )}
          >
            {language}
          </button>
        );
      })}
    </div>
  );
}
