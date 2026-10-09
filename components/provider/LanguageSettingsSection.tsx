import { adminFieldClass } from "@/components/provider/adminGlass";
import {
  bookingTranslations,
  fillTemplate,
} from "@/components/booking/i18n/translations";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The language the owner's *clients* read on the public booking page. Lives
 * in Appearance, with everything else that changes the public page.
 *
 * Every label is read from `lang` — the owner's workspace language — including
 * the labels *about* the client-facing setting, which is why `clientLanguage`
 * is a value and never a second source of interface language.
 */
export function ClientLanguageField({
  lang,
  clientLanguage,
  onChange,
  disabled = false,
}: {
  /** The owner's workspace language: the language this field is written in. */
  lang: Lang;
  /** The language the owner's clients see on their public page. */
  clientLanguage: Lang;
  onChange: (language: Lang) => void;
  disabled?: boolean;
}) {
  const t = bookingTranslations[lang];

  return (
    <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
      {t.admin.clientLanguageLabel}
      <select
        value={clientLanguage}
        onChange={(event) => onChange(event.target.value as Lang)}
        disabled={disabled}
        className={cn("min-h-12", adminFieldClass)}
      >
        <option value="en">{t.language.english}</option>
        <option value="es">{t.language.spanish}</option>
      </select>
      <span className="text-xs leading-5 text-[var(--muted)]">{t.admin.clientLanguageHint}</span>
      {/* Said back plainly, because the owner cannot see their own public
          page while editing it. */}
      <span className="text-xs font-semibold leading-5 text-[var(--ink)]">
        {fillTemplate(t.admin.clientsSeeNotice, {
          language: clientLanguage === "en" ? t.language.english : t.language.spanish,
        })}
      </span>
    </label>
  );
}

/**
 * The owner's own workspace language. An account preference, so it lives in
 * Settings, away from the public-page language it is so often confused with.
 */
export function DashboardLanguageField({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (language: Lang) => void;
}) {
  const t = bookingTranslations[lang];

  return (
    <div className="grid gap-2 text-sm font-medium text-[var(--ink)]">
      {t.admin.dashboardLanguageLabel}
      <LanguageSwitcher lang={lang} onChange={onChange} tone="inset" className="justify-self-start" />
    </div>
  );
}

/**
 * Both language controls together, for hosts and tests that want the pair in
 * one place. The dashboard renders them in separate sections.
 */
export function LanguageSettingsSection({
  lang,
  clientLanguage,
  onClientLanguageChange,
  onDashboardLanguageChange,
  disabled = false,
}: {
  lang: Lang;
  clientLanguage: Lang;
  onClientLanguageChange: (language: Lang) => void;
  onDashboardLanguageChange: (language: Lang) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-6 grid gap-6">
      <ClientLanguageField
        lang={lang}
        clientLanguage={clientLanguage}
        onChange={onClientLanguageChange}
        disabled={disabled}
      />
      <DashboardLanguageField lang={lang} onChange={onDashboardLanguageChange} />
    </div>
  );
}
