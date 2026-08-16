import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { ProviderAppearanceForm } from "@/components/provider/ProviderAppearanceForm";
import { ProviderInfoForm } from "@/components/provider/ProviderInfoForm";
import type { ProviderInfo } from "@/lib/types";

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

describe("appearance fields moved out of the provider form", () => {
  it("keeps business details in ProviderInfoForm", () => {
    const html = renderToStaticMarkup(
      <ProviderInfoForm provider={provider} onChange={() => undefined} lang="en" />,
    );

    expect(html).toContain(bookingTranslations.en.providerForm.businessName);
    expect(html).toContain(bookingTranslations.en.providerForm.fullName);
  });

  it("no longer renders the header image or header text there", () => {
    const html = renderToStaticMarkup(
      <ProviderInfoForm provider={provider} onChange={() => undefined} lang="en" />,
    );

    expect(html).not.toContain(bookingTranslations.en.providerForm.heroText);
    expect(html).not.toContain(provider.heroText as string);
    expect(html).not.toContain(provider.headerImageUrl as string);
  });

  it("renders them in the appearance form instead", () => {
    const html = renderToStaticMarkup(
      <ProviderAppearanceForm provider={provider} onChange={() => undefined} lang="en" />,
    );

    expect(html).toContain(bookingTranslations.en.providerForm.heroText);
    expect(html).toContain(provider.heroText as string);
    expect(html).toContain(provider.headerImageUrl as string);
  });

  it("writes the appearance panel in the owner's workspace language", () => {
    const html = renderToStaticMarkup(
      <ProviderAppearanceForm provider={provider} onChange={() => undefined} lang="es" />,
    );

    expect(html).toContain(bookingTranslations.es.providerForm.heroText);
    expect(html).not.toContain(bookingTranslations.en.providerForm.heroTextHint);
  });
});

describe("appearance tab label", () => {
  it("is translated in both workspace languages", () => {
    expect(bookingTranslations.en.admin.tabAppearance).toBe("Appearance");
    expect(bookingTranslations.es.admin.tabAppearance).toBe("Apariencia");
  });
});
