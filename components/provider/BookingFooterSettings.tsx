"use client";

import { Field, Input } from "@/components/app-ui";
import { DEFAULT_BOOKING_FOOTER_TEXT, DEFAULT_BOOKING_FOOTER_URL, isBookingFooterUrl, normalizeBookingFooter } from "@/lib/booking-footer";
import { hasResolvedEntitlement, type ProviderEntitlements } from "@/lib/entitlements/resolve";
import type { Lang, ProviderInfo } from "@/lib/types";

const copy = {
  en: {
    text: "Footer text", url: "Footer link", help: "Premium accounts can customize the text and link on every public booking page. Blank fields restore Haab branding.",
    locked: "Premium is required to customize this footer. Without Premium access, public pages show Haab branding.",
    invalid: "Enter a complete http:// or https:// link without a username or password.", preview: "Preview",
  },
  es: {
    text: "Texto del pie de página", url: "Enlace del pie de página", help: "Las cuentas Premium pueden personalizar el texto y enlace de todas sus páginas públicas de reservas. Los campos vacíos restauran la marca de Haab.",
    locked: "Se requiere Premium para personalizar este pie de página. Sin acceso Premium, las páginas públicas muestran la marca de Haab.",
    invalid: "Introduce un enlace completo http:// o https:// sin usuario ni contraseña.", preview: "Vista previa",
  },
};

export function BookingFooterSettings({ provider, entitlements, lang, disabled, onChange }: {
  provider: ProviderInfo;
  entitlements?: ProviderEntitlements;
  lang: Lang;
  disabled: boolean;
  onChange: <K extends keyof ProviderInfo>(key: K, value: ProviderInfo[K]) => void;
}) {
  const t = copy[lang];
  const allowed = Boolean(entitlements && hasResolvedEntitlement(entitlements, "custom_booking_footer"));
  const footer = normalizeBookingFooter(allowed ? provider : undefined);
  const invalid = Boolean(provider.publicFooterUrl?.trim() && !isBookingFooterUrl(provider.publicFooterUrl.trim()));
  return (
    <div className="grid gap-4">
      <p className="text-sm text-app-fg-muted">{allowed ? t.help : t.locked}</p>
      <Field label={t.text}>
        <Input name="publicFooterText" value={provider.publicFooterText ?? DEFAULT_BOOKING_FOOTER_TEXT} maxLength={200} disabled={disabled || !allowed} onChange={(event) => onChange("publicFooterText", event.target.value)} />
      </Field>
      <Field label={t.url} error={allowed && invalid ? t.invalid : undefined}>
        <Input name="publicFooterUrl" type="url" value={provider.publicFooterUrl ?? DEFAULT_BOOKING_FOOTER_URL} maxLength={2048} disabled={disabled || !allowed} onChange={(event) => onChange("publicFooterUrl", event.target.value)} />
      </Field>
      <div className="rounded-lg bg-app-subtle p-4 text-sm text-app-fg-muted">
        <p className="mb-2 font-semibold">{t.preview}</p>
        <p className="break-words">{footer.text}{" "}<a className="underline underline-offset-4" href={footer.url}>{footer.label}</a>{footer.developerCredit ? <> and developed by <a className="underline underline-offset-4" href="https://brilliant.dev">brilliant.dev</a></> : null}</p>
      </div>
    </div>
  );
}
