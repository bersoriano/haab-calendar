"use client";

import type { Lang, ProviderInfo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminFieldClass } from "@/components/provider/adminGlass";
import { HeaderImageUploader } from "@/components/provider/HeaderImageUploader";
import { TimeZoneField } from "@/components/provider/TimeZoneField";
import { bookingTranslations } from "@/components/booking/i18n/translations";

export function ProviderInfoForm({
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
      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
        {t.providerForm.fullName}
        <input
          disabled={disabled}
          value={provider.fullName}
          onChange={(event) => onChange("fullName", event.target.value)}
          placeholder={t.providerForm.fullNamePlaceholder}
          className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
        {t.providerForm.businessName}
        <input
          disabled={disabled}
          value={provider.businessName}
          onChange={(event) => onChange("businessName", event.target.value)}
          placeholder={t.providerForm.businessNamePlaceholder}
          className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
        {t.providerForm.confirmationEmail}
        <input
          disabled={disabled}
          value={provider.email}
          onChange={(event) => onChange("email", event.target.value)}
          placeholder={t.providerForm.emailPlaceholder}
          type="email"
          className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
          {t.providerForm.phoneNumber1}
          <input
            disabled={disabled}
            value={provider.phoneNumber1}
            onChange={(event) => onChange("phoneNumber1", event.target.value)}
            placeholder={t.providerForm.phone1Placeholder}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
          {t.providerForm.phoneNumber2}
          <input
            disabled={disabled}
            value={provider.phoneNumber2}
            onChange={(event) => onChange("phoneNumber2", event.target.value)}
            placeholder={t.providerForm.phone2Placeholder}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
          {t.providerForm.address1}
          <input
            disabled={disabled}
            value={provider.address1}
            onChange={(event) => onChange("address1", event.target.value)}
            placeholder={t.providerForm.address1Placeholder}
            autoComplete="street-address"
            className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
          {t.providerForm.address2}
          <input
            disabled={disabled}
            value={provider.address2}
            onChange={(event) => onChange("address2", event.target.value)}
            placeholder={t.providerForm.address2Placeholder}
            autoComplete="street-address"
            className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
          />
        </label>
      </div>
      <TimeZoneField
        value={provider.timezone}
        onChange={(zone) => onChange("timezone", zone)}
        disabled={disabled}
        lang={lang}
      />
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
