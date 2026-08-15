import Link from "next/link";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

const LANGUAGES = ["en", "es"] as const;

/**
 * The one language control. Two tones because the public page puts it both on
 * the page background and inside an already-layered header band; the geometry,
 * labels, and active treatment stay identical so it reads as the same control
 * everywhere. `hrefFor` renders anchors for server-only surfaces (the login
 * page) with no visual difference from the stateful version.
 */
export function LanguageSwitcher({
  lang,
  onChange,
  hrefFor,
  tone = "floating",
  className = "",
}: {
  lang: Lang;
  onChange?: (lang: Lang) => void;
  hrefFor?: (lang: Lang) => string;
  tone?: "floating" | "inset";
  className?: string;
}) {
  const t = bookingTranslations[lang];
  const isInset = tone === "inset";

  return (
    <div
      role="group"
      aria-label={t.language.chooseLanguage}
      className={cn(
        "inline-flex rounded-full p-1",
        isInset
          ? "border border-[rgba(15,23,42,0.07)] bg-[rgba(15,23,42,0.05)] shadow-[inset_0_1px_2px_rgba(15,23,42,0.07)]"
          : "border border-[var(--line)] bg-[var(--panel-glass-72)] shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl",
        className,
      )}
    >
      {LANGUAGES.map((language) => {
        const active = lang === language;
        const label =
          language === "en" ? t.language.english : t.language.spanish;
        const actionLabel =
          language === "en"
            ? t.language.switchToEnglish
            : t.language.switchToSpanish;
        const classes = cn(
          "min-h-9 rounded-full px-2.5 text-xs font-semibold transition sm:min-h-10 sm:px-4 sm:text-sm",
          active
            ? isInset
              ? "bg-[var(--surface-lowest)] text-[var(--ink)] shadow-[0_1px_2px_rgba(15,23,42,0.14),0_4px_10px_rgba(15,23,42,0.08)]"
              : "bg-[var(--primary)] text-white shadow-[0_8px_18px_rgba(26,115,232,0.24)]"
            : "text-[var(--muted)] hover:bg-[var(--panel-glass-72)] hover:text-[var(--ink)]",
        );

        if (hrefFor) {
          return (
            <Link
              key={language}
              href={hrefFor(language)}
              aria-label={actionLabel}
              aria-current={active ? "page" : undefined}
              className={cn(classes, "inline-flex items-center justify-center")}
            >
              {label}
            </Link>
          );
        }

        return (
          <button
            key={language}
            type="button"
            aria-label={actionLabel}
            aria-pressed={active}
            onClick={() => onChange?.(language)}
            className={classes}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
