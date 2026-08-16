"use client";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { adminFieldClass } from "@/components/provider/adminGlass";
import { HeaderImageUploader } from "@/components/provider/HeaderImageUploader";
import type { Lang, ProviderInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

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
    <div className="grid gap-4">
      <HeaderImageUploader
        value={provider.headerImageUrl}
        onChange={(url) => onChange("headerImageUrl", url)}
        disabled={disabled}
        lang={lang}
      />
      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
        {t.providerForm.heroText}
        <input
          disabled={disabled}
          value={provider.heroText ?? ""}
          onChange={(event) => onChange("heroText", event.target.value)}
          placeholder={provider.businessName || t.providerForm.heroTextPlaceholder}
          className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
        />
        <span className="text-xs leading-5 text-[var(--muted)]">
          {t.providerForm.heroTextHint}
        </span>
      </label>
    </div>
  );
}
