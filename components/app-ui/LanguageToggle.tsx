"use client";

import { SegmentedControl } from "@/components/app-ui/SegmentedControl";
import { segmentStyles } from "@/components/app-ui/styles";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

const LANGUAGES: Lang[] = ["en", "es"];

/**
 * EN/ES for signed-in surfaces. Same API as the public LanguageSwitcher:
 * links when the page builds the URLs (`hrefFor`), state otherwise.
 */
export function LanguageToggle({
  lang,
  onChange,
  hrefFor,
  className,
}: {
  lang: Lang;
  onChange?: (lang: Lang) => void;
  hrefFor?: (lang: Lang) => string;
  className?: string;
}) {
  const t = bookingTranslations[lang].language;
  const label = t.chooseLanguage;
  // Short codes on screen, the language's own name for screen readers.
  const optionLabel = (option: Lang) => (
    <>
      <span aria-hidden="true">{option.toUpperCase()}</span>
      <span className="sr-only">{option === "en" ? t.english : t.spanish}</span>
    </>
  );

  if (hrefFor) {
    return (
      <div role="group" aria-label={label} className={cn("inline-flex gap-1 rounded-lg bg-app-subtle p-1", className)}>
        {LANGUAGES.map((option) => (
          <a
            key={option}
            href={hrefFor(option)}
            hrefLang={option}
            lang={option}
            aria-current={option === lang ? "true" : undefined}
            className={segmentStyles(option === lang)}
          >
            {optionLabel(option)}
          </a>
        ))}
      </div>
    );
  }

  return (
    <SegmentedControl
      ariaLabel={label}
      value={lang}
      onChange={(next) => onChange?.(next)}
      options={LANGUAGES.map((option) => ({ value: option, label: optionLabel(option) }))}
      className={className}
    />
  );
}
