import { adminFieldClass } from "@/components/provider/adminGlass";
import {
  bookingTranslations,
  fillTemplate,
} from "@/components/booking/i18n/translations";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The owner's two language controls, side by side because they are constantly
 * confused for each other: one sets what the owner's *clients* read on the
 * public booking page, the other sets the owner's own workspace.
 *
 * Extracted from the module so a test can render it beside the dashboard hero
 * and assert one composed screen speaks one language. Every label here is read
 * from `lang` — the owner's workspace language — including the labels *about*
 * the client-facing setting, which is why `clientLanguage` is a value and
 * never a second source of interface language.
 */
export function LanguageSettingsSection({
  lang,
  clientLanguage,
  onClientLanguageChange,
  onDashboardLanguageChange,
  disabled = false,
}: {
  /** The owner's workspace language: the language this panel is written in. */
  lang: Lang;
  /** The language the owner's clients see on their public page. */
  clientLanguage: Lang;
  onClientLanguageChange: (language: Lang) => void;
  onDashboardLanguageChange: (language: Lang) => void;
  disabled?: boolean;
}) {
  const t = bookingTranslations[lang];

  return (
    <div className="mt-6 grid gap-6">
      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
        {t.admin.clientLanguageLabel}
        <select
          value={clientLanguage}
          onChange={(event) => onClientLanguageChange(event.target.value as Lang)}
          disabled={disabled}
          className={cn("min-h-12", adminFieldClass)}
        >
          <option value="en">{t.language.english}</option>
          <option value="es">{t.language.spanish}</option>
        </select>
        <span className="text-xs leading-5 text-[var(--muted)]">
          {t.admin.clientLanguageHint}
        </span>
        {/* Said back plainly, because the owner cannot see their own
            public page while editing it. */}
        <span className="text-xs font-semibold leading-5 text-[var(--ink)]">
          {fillTemplate(t.admin.clientsSeeNotice, {
            language:
              clientLanguage === "en" ? t.language.english : t.language.spanish,
          })}
        </span>
      </label>

      <div className="grid gap-2 text-sm font-medium text-[var(--ink)]">
        {t.admin.dashboardLanguageLabel}
        <LanguageSwitcher
          lang={lang}
          onChange={onDashboardLanguageChange}
          tone="inset"
          className="self-start"
        />
      </div>
    </div>
  );
}
