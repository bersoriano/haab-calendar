"use client";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { Field, Input } from "@/components/app-ui";
import { HeaderImageUploader } from "@/components/provider/HeaderImageUploader";
import type { Lang, ProviderInfo } from "@/lib/types";

/**
 * The parts of a provider that change how the public page looks rather than
 * what it says about the business. Split out of ProviderInfoForm so the
 * Appearance tab owns them and setup stays about business details.
 */
export function ProviderAppearanceForm({
  provider,
  onChange,
  disabled = false,
  lang = "en",
}: {
  provider: ProviderInfo;
  onChange: <K extends keyof ProviderInfo>(key: K, value: ProviderInfo[K]) => void;
  disabled?: boolean;
  lang?: Lang;
}) {
  const t = bookingTranslations[lang];

  return (
    <div className="grid gap-6">
      <HeaderImageUploader
        value={provider.headerImageUrl}
        onChange={(url) => onChange("headerImageUrl", url)}
        disabled={disabled}
        lang={lang}
      />
      <Field label={t.providerForm.heroText} description={t.providerForm.heroTextHint}>
        <Input
          disabled={disabled}
          value={provider.heroText ?? ""}
          onChange={(event) => onChange("heroText", event.target.value)}
          placeholder={provider.businessName || t.providerForm.heroTextPlaceholder}
        />
      </Field>
    </div>
  );
}
