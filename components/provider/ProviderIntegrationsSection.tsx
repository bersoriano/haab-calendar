"use client";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { adminInsetClass } from "@/components/provider/adminGlass";
import { SectionTitle } from "@/components/ui";
import { hasResolvedEntitlement, type ProviderEntitlements } from "@/lib/entitlements/resolve";
import type { FeatureKey } from "@/lib/entitlements/catalog";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * What an integration's card is allowed to say about itself.
 *
 * `unavailable` is the answer whenever entitlements could not be resolved: an
 * unknown answer about paid access is a no, never a yes.
 */
export type IntegrationAvailability =
  | "available"
  | "premium_required"
  | "unavailable"
  | "publish_required";

type Integration = {
  key: "google_calendar";
  featureKey: FeatureKey;
};

const INTEGRATIONS: readonly Integration[] = [
  { key: "google_calendar", featureKey: "google_calendar_sync" },
];

export function resolveIntegrationAvailability(input: {
  entitlements?: ProviderEntitlements;
  integratedMode: boolean;
  featureKey: FeatureKey;
}): IntegrationAvailability {
  // A browser-owned draft has no provider to hold an entitlement, so there is
  // nothing to connect to yet.
  if (!input.integratedMode) {
    return "publish_required";
  }

  if (!input.entitlements) {
    return "unavailable";
  }

  return hasResolvedEntitlement(input.entitlements, input.featureKey)
    ? "available"
    : "premium_required";
}

/**
 * The integrations Haab can work with, and whether this provider may use them.
 *
 * Display only: eligibility comes from the resolved snapshot the server passed
 * down, and nothing here talks to Google or to Supabase. When a connection flow
 * is built it will re-authenticate the owner and re-resolve the entitlement
 * server-side — this card's answer is never the authorization.
 */
export function ProviderIntegrationsSection({
  entitlements,
  integratedMode,
  demoEdit = false,
  lang = "en",
}: {
  entitlements?: ProviderEntitlements;
  integratedMode: boolean;
  demoEdit?: boolean;
  lang?: Lang;
}) {
  const t = bookingTranslations[lang].admin;

  const statusLabels: Record<IntegrationAvailability, string> = {
    available: t.integrationAvailable,
    premium_required: t.integrationPremiumRequired,
    unavailable: t.integrationUnavailable,
    publish_required: t.integrationPublishRequired,
  };

  const statusTones: Record<IntegrationAvailability, string> = {
    available: "bg-emerald-100 text-emerald-800",
    premium_required: "bg-amber-100 text-amber-900",
    unavailable: "bg-slate-100 text-slate-700",
    publish_required: "bg-slate-100 text-slate-700",
  };

  return (
    <section className="mt-6 border-t border-[var(--line)] pt-6">
      <SectionTitle title={t.integrationsTitle} body={t.integrationsBody} />
      <ul className="mt-4 grid gap-3">
        {INTEGRATIONS.map((integration) => {
          const availability = resolveIntegrationAvailability({
            entitlements,
            integratedMode,
            featureKey: integration.featureKey,
          });

          return (
            <li key={integration.key} className={cn(adminInsetClass, "p-5")}>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold text-[var(--ink)]">
                  {t.googleCalendarName}
                </h4>
                {/* Text, not only colour: the status has to survive a screen
                    reader and a monochrome display. */}
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-1 text-[11px] font-semibold",
                    statusTones[availability],
                  )}
                >
                  {statusLabels[availability]}
                </span>
                {availability === "available" ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                    {t.integrationNotConnected}
                  </span>
                ) : null}
                {demoEdit ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                    {t.integrationReadOnly}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {t.googleCalendarDescription}
              </p>
              <button
                type="button"
                disabled
                className="mt-3 inline-flex min-h-11 items-center rounded-2xl border border-[var(--line)] bg-[var(--surface-lowest)] px-4 text-sm font-semibold text-[var(--muted)] disabled:cursor-not-allowed"
              >
                {t.comingSoon}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
