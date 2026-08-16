import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { ProviderIntegrationsSection } from "@/components/provider/ProviderIntegrationsSection";
import { resolveEntitlements } from "@/lib/entitlements/resolve";

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-08-15T12:00:00.000Z");

const en = bookingTranslations.en.admin;
const es = bookingTranslations.es.admin;

function entitlements(
  planTier: string,
  overrides: Parameters<typeof resolveEntitlements>[0]["overrides"] = [],
) {
  return resolveEntitlements({ providerId: PROVIDER, planTier, overrides, now: NOW });
}

const ACTIVE_GRANT = [
  { featureKey: "google_calendar_sync", enabled: true, expiresAt: null },
];
const ACTIVE_REVOKE = [
  { featureKey: "google_calendar_sync", enabled: false, expiresAt: null },
];
const EXPIRED_GRANT = [
  {
    featureKey: "google_calendar_sync",
    enabled: true,
    expiresAt: "2026-08-01T00:00:00.000Z",
  },
];
const EXPIRED_REVOKE = [
  {
    featureKey: "google_calendar_sync",
    enabled: false,
    expiresAt: "2026-08-01T00:00:00.000Z",
  },
];

function render(props: Partial<Parameters<typeof ProviderIntegrationsSection>[0]> = {}) {
  return renderToStaticMarkup(
    <ProviderIntegrationsSection
      integratedMode
      lang="en"
      entitlements={entitlements("premium")}
      {...props}
    />,
  );
}

describe("ProviderIntegrationsSection", () => {
  it("names the integration and explains what connecting would do", () => {
    const html = render();

    expect(html).toContain(en.integrationsTitle);
    expect(html).toContain(en.googleCalendarName);
    expect(html).toContain(en.googleCalendarDescription);
  });

  it("reports available and not connected for a premium plan", () => {
    const html = render();

    expect(html).toContain(en.integrationAvailable);
    expect(html).toContain(en.integrationNotConnected);
    expect(html).not.toContain(en.integrationPremiumRequired);
  });

  it("reports premium required for a free plan with no override", () => {
    const html = render({ entitlements: entitlements("free") });

    expect(html).toContain(en.integrationPremiumRequired);
    expect(html).not.toContain(en.integrationAvailable);
  });

  it("honours an active grant on a free plan", () => {
    const html = render({ entitlements: entitlements("free", ACTIVE_GRANT) });

    expect(html).toContain(en.integrationAvailable);
    expect(html).toContain(en.integrationNotConnected);
  });

  it("honours an active revoke on a premium plan", () => {
    const html = render({ entitlements: entitlements("premium", ACTIVE_REVOKE) });

    expect(html).toContain(en.integrationPremiumRequired);
  });

  it("lets an expired grant fall back to the free plan's answer", () => {
    const html = render({ entitlements: entitlements("free", EXPIRED_GRANT) });

    expect(html).toContain(en.integrationPremiumRequired);
  });

  it("lets an expired revoke fall back to the premium plan's answer", () => {
    const html = render({ entitlements: entitlements("premium", EXPIRED_REVOKE) });

    expect(html).toContain(en.integrationAvailable);
  });

  it("fails closed when no entitlement snapshot arrived", () => {
    const html = render({ entitlements: undefined });

    expect(html).toContain(en.integrationUnavailable);
    expect(html).not.toContain(en.integrationAvailable);
    expect(html).not.toContain(en.integrationNotConnected);
  });

  it("tells a standalone owner to publish first, without claiming access", () => {
    const html = render({ integratedMode: false, entitlements: undefined });

    expect(html).toContain(en.integrationPublishRequired);
    // ">Available<" rather than the bare word: the publish-required copy
    // legitimately contains it.
    expect(html).not.toContain(`>${en.integrationAvailable}<`);
    expect(html).not.toContain(en.integrationNotConnected);
  });

  it("is read-only while a demo page is being edited", () => {
    const html = render({ demoEdit: true });

    expect(html).toContain(en.integrationReadOnly);
  });

  it("offers no working connect action yet", () => {
    const html = render();

    // A control may exist, but it must be disabled: nothing here talks to Google.
    expect(html).not.toMatch(/<a[^>]+href="[^"]*google/i);
    const buttons = html.match(/<button[^>]*>/g) ?? [];
    for (const button of buttons) {
      expect(button).toContain("disabled");
    }
  });

  it("states the status in words rather than colour alone", () => {
    const free = render({ entitlements: entitlements("free") });
    const premium = render();

    // The same markup with a different class would leave a screen reader with
    // nothing to read, so each state must differ in text.
    expect(free).toContain(en.integrationPremiumRequired);
    expect(premium).toContain(en.integrationAvailable);
    expect(free).not.toBe(premium);
  });

  it("follows the owner's workspace language", () => {
    const html = render({ lang: "es" });

    expect(html).toContain(es.integrationsTitle);
    expect(html).toContain(es.integrationAvailable);
    expect(html).not.toContain(en.integrationsBody);
  });
});
