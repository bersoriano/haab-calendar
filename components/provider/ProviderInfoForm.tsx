"use client";

import type { Lang, ProviderInfo } from "@/lib/types";
import { Field, Input } from "@/components/app-ui";
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
      <Field label={t.providerForm.fullName}>
        <Input
          disabled={disabled}
          value={provider.fullName}
          onChange={(event) => onChange("fullName", event.target.value)}
          placeholder={t.providerForm.fullNamePlaceholder}
        />
      </Field>
      <Field label={t.providerForm.businessName}>
        <Input
          disabled={disabled}
          value={provider.businessName}
          onChange={(event) => onChange("businessName", event.target.value)}
          placeholder={t.providerForm.businessNamePlaceholder}
        />
      </Field>
      <Field label={t.providerForm.confirmationEmail}>
        <Input
          disabled={disabled}
          value={provider.email}
          onChange={(event) => onChange("email", event.target.value)}
          placeholder={t.providerForm.emailPlaceholder}
          type="email"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.providerForm.phoneNumber1}>
          <Input
            disabled={disabled}
            value={provider.phoneNumber1}
            onChange={(event) => onChange("phoneNumber1", event.target.value)}
            placeholder={t.providerForm.phone1Placeholder}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>
        <Field label={t.providerForm.phoneNumber2}>
          <Input
            disabled={disabled}
            value={provider.phoneNumber2}
            onChange={(event) => onChange("phoneNumber2", event.target.value)}
            placeholder={t.providerForm.phone2Placeholder}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.providerForm.address1}>
          <Input
            disabled={disabled}
            value={provider.address1}
            onChange={(event) => onChange("address1", event.target.value)}
            placeholder={t.providerForm.address1Placeholder}
            autoComplete="street-address"
          />
        </Field>
        <Field label={t.providerForm.address2}>
          <Input
            disabled={disabled}
            value={provider.address2}
            onChange={(event) => onChange("address2", event.target.value)}
            placeholder={t.providerForm.address2Placeholder}
            autoComplete="street-address"
          />
        </Field>
      </div>
      <TimeZoneField
        value={provider.timezone}
        onChange={(zone) => onChange("timezone", zone)}
        disabled={disabled}
        lang={lang}
      />
    </div>
  );
}
