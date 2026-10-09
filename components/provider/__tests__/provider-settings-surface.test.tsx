import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { ProviderSettingsSurface } from "@/components/provider/ProviderSettingsSurface";
import { resolveEntitlements } from "@/lib/entitlements/resolve";
import type { ProviderInfo } from "@/lib/types";

const en = bookingTranslations.en.admin;
const es = bookingTranslations.es.admin;

const provider: ProviderInfo = {
  fullName: "Mariana Torres",
  businessName: "ACIS Sports",
  email: "owner@example.com",
  phoneNumber1: "+52 55 5555 0101",
  phoneNumber2: "",
  address1: "Av. de los Compositores",
  address2: "",
  timezone: "America/Mexico_City",
  language: "es",
  headerImageUrl: "https://example.invalid/banner.png",
  heroText: "Carreras para todas las ciudades",
  logoImageUrl: "https://example.invalid/logo.png",
  publicSlug: "acis-sports",
};

function render(
  props: Partial<Parameters<typeof ProviderSettingsSurface>[0]> = {},
) {
  return renderToStaticMarkup(
    <ProviderSettingsSurface
      title="Provider information"
      publicUrlLabel="Public booking link:"
      provider={provider}
      lang="en"
      publicUrl="https://haab.app/doctors/acis-sports"
      integratedMode
      canPersist
      isSaving={false}
      onProviderChange={() => undefined}
      onSave={() => undefined}
      {...props}
    />,
  );
}

describe("ProviderSettingsSurface", () => {
  it("renders the provider information form", () => {
    const html = render();

    expect(html).toContain("Provider information");
    expect(html).toContain(bookingTranslations.en.providerForm.businessName);
    expect(html).toContain(provider.businessName);
  });

  it("leaves availability and integrations to their own sections", () => {
    const html = render({
      entitlements: resolveEntitlements({
        providerId: "00000000-0000-4000-8000-000000000001",
        planTier: "premium",
        overrides: [],
      }),
    });

    expect(html).not.toContain(en.weekdays.monday);
    expect(html).not.toContain(en.weeklyAvailability);
    expect(html).not.toContain(en.integrationsTitle);
  });

  it("renders the public booking URL", () => {
    const html = render();

    expect(html).toContain("https://haab.app/doctors/acis-sports");
  });

  it("offers slug editing when custom URL access is active", () => {
    const html = render({
      entitlements: resolveEntitlements({
        providerId: "00000000-0000-4000-8000-000000000001",
        planTier: "premium",
        overrides: [],
      }),
      onSavePublicSlug: async () => undefined,
    });

    expect(html).toContain('name="publicSlug"');
    expect(html).toContain('value="acis-sports"');
  });

  it("offers the save action when the store can be written", () => {
    const html = render();

    expect(html).toContain(en.saveChanges);
  });

  it("withholds the save action when persistence is unavailable", () => {
    expect(render({ canPersist: false })).not.toContain(en.saveChanges);
    expect(render({ integratedMode: false })).not.toContain(en.saveChanges);
  });

  it("shows the busy label while saving", () => {
    const html = render({ isSaving: true });

    expect(html).toContain(bookingTranslations.en.common.saving);
  });

  it("renders a save failure", () => {
    const html = render({ saveError: "Could not save your settings." });

    expect(html).toContain("Could not save your settings.");
  });

  it("renders a save confirmation", () => {
    const html = render({ saveMessage: "Saved." });

    expect(html).toContain("Saved.");
  });

  it("offers the standalone reset only outside integrated mode", () => {
    const standalone = render({
      integratedMode: false,
      onResetStandaloneSetup: () => undefined,
    });

    expect(standalone).toContain(en.resetStandaloneSetup);
    expect(render()).not.toContain(en.resetStandaloneSetup);
  });

  it("keeps appearance fields out of settings", () => {
    const html = render();

    expect(html).not.toContain(bookingTranslations.en.providerForm.heroText);
    expect(html).not.toContain(provider.headerImageUrl as string);
    expect(html).not.toContain(en.publicThemeLabel);
    expect(html).not.toContain(en.clientLanguageLabel);
  });

  it("writes the whole surface in the owner's workspace language", () => {
    const html = render({
      lang: "es",
      title: "Información del organizador",
      publicUrlLabel: "Enlace público de reservas:",
    });

    expect(html).toContain(bookingTranslations.es.providerForm.businessName);
    expect(html).not.toContain(bookingTranslations.en.providerForm.businessName);
    expect(html).toContain(es.saveChanges);
  });
});
