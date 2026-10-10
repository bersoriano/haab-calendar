"use client";

import { APP_LANGUAGES, LanguageLinks, LanguageOptionLabel } from "@/components/app-ui/LanguageLinks";
import { SegmentedControl } from "@/components/app-ui/SegmentedControl";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { Lang } from "@/lib/types";

/**
 * EN/ES for signed-in surfaces. Same API as the public LanguageSwitcher:
 * links when the page builds the URLs (`hrefFor`), state otherwise. A server
 * component that builds links uses LanguageLinks directly.
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
  if (hrefFor) {
    return <LanguageLinks lang={lang} hrefFor={hrefFor} className={className} />;
  }

  return (
    <SegmentedControl
      ariaLabel={bookingTranslations[lang].language.chooseLanguage}
      value={lang}
      onChange={(next) => onChange?.(next)}
      options={APP_LANGUAGES.map((option) => ({
        value: option,
        label: <LanguageOptionLabel lang={lang} option={option} />,
      }))}
      className={className}
    />
  );
}
