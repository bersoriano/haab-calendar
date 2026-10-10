import { segmentStyles } from "@/components/app-ui/styles";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

export const APP_LANGUAGES: Lang[] = ["en", "es"];

/** Short codes on screen, the language's own name for screen readers. */
export function LanguageOptionLabel({ lang, option }: { lang: Lang; option: Lang }) {
  const t = bookingTranslations[lang].language;

  return (
    <>
      <span aria-hidden="true">{option.toUpperCase()}</span>
      <span className="sr-only">{option === "en" ? t.english : t.spanish}</span>
    </>
  );
}

/**
 * EN/ES as links the page builds. Server-safe on purpose: a server component
 * can hand it `hrefFor`, which it could not pass to a client component.
 */
export function LanguageLinks({
  lang,
  hrefFor,
  className,
}: {
  lang: Lang;
  hrefFor: (lang: Lang) => string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={bookingTranslations[lang].language.chooseLanguage}
      className={cn("inline-flex gap-1 rounded-lg bg-app-subtle p-1", className)}
    >
      {APP_LANGUAGES.map((option) => (
        <a
          key={option}
          href={hrefFor(option)}
          hrefLang={option}
          lang={option}
          aria-current={option === lang ? "true" : undefined}
          className={segmentStyles(option === lang)}
        >
          <LanguageOptionLabel lang={lang} option={option} />
        </a>
      ))}
    </div>
  );
}
