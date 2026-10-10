"use client";

import { Card, CardBody, CardHeader } from "@/components/app-ui";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { LogoImageUploader } from "@/components/provider/HeaderImageUploader";
import { ClientLanguageField } from "@/components/provider/LanguageSettingsSection";
import { ProviderAppearanceForm } from "@/components/provider/ProviderAppearanceForm";
import { ThemeSettingsSection } from "@/components/provider/ThemeSettingsSection";
import type { Lang, ProviderInfo } from "@/lib/types";

/**
 * Everything that changes how the public page looks or which language it
 * speaks: branding on one side, the theme and the clients' language on the
 * other. Kept apart from Settings, which is business data. Presentational —
 * every edit goes back out through `onChange`.
 */
export function AppearanceSection({
  provider,
  onChange,
  disabled,
  lang,
  chrome,
}: {
  provider: ProviderInfo;
  onChange: <K extends keyof ProviderInfo>(key: K, value: ProviderInfo[K]) => void;
  disabled: boolean;
  lang: Lang;
  /** In the shell the page header already says what this section is for. */
  chrome: "module" | "shell";
}) {
  const t = bookingTranslations[lang];

  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <Card as="section">
        <CardHeader
          title={t.admin.appearanceTitle}
          description={chrome === "module" ? t.admin.appearanceBody : undefined}
        />
        <CardBody className="grid gap-6">
          <LogoImageUploader
            value={provider.logoImageUrl}
            onChange={(url) => onChange("logoImageUrl", url)}
            disabled={disabled}
            lang={lang}
          />
          <div className="border-t border-app-border pt-6">
            <ProviderAppearanceForm provider={provider} onChange={onChange} disabled={disabled} lang={lang} />
          </div>
        </CardBody>
      </Card>

      <Card as="section">
        <CardBody className="grid gap-6">
          <ThemeSettingsSection
            lang={lang}
            theme={provider.publicTheme ?? "default"}
            onThemeChange={(next) => onChange("publicTheme", next)}
            disabled={disabled}
          />
          <div className="border-t border-app-border pt-6">
            <ClientLanguageField
              lang={lang}
              clientLanguage={provider.language ?? "en"}
              onChange={(next) => onChange("language", next)}
              disabled={disabled}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
