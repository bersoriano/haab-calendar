"use client";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { adminPanelClass } from "@/components/provider/adminGlass";
import { AvailabilitySettingsSection } from "@/components/provider/AvailabilitySettingsSection";
import { ProviderInfoForm } from "@/components/provider/ProviderInfoForm";
import { ProviderIntegrationsSection } from "@/components/provider/ProviderIntegrationsSection";
import { ActionButton, SectionTitle } from "@/components/ui";
import type { ProviderEntitlements } from "@/lib/entitlements/resolve";
import type {
  Lang,
  ProviderInfo,
  VerticalId,
  WeeklyAvailability,
  WeekdayKey,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export type ProviderSettingsSurfaceProps = {
  /** Already resolved by the caller, which owns the vertical's role wording. */
  title: string;
  /** Same reason: "Public booking link for" reads differently per vertical. */
  publicUrlLabel: string;
  provider: ProviderInfo;
  availability: WeeklyAvailability;
  vertical?: VerticalId;
  lang: Lang;
  publicUrl: string;

  integratedMode: boolean;
  canPersist: boolean;
  isSaving: boolean;
  saveError?: string | null;
  saveMessage?: string | null;

  /** Resolved server-side. Presentation only — never the authorization. */
  entitlements?: ProviderEntitlements;
  demoEdit?: boolean;

  onProviderChange: <K extends keyof ProviderInfo>(key: K, value: ProviderInfo[K]) => void;
  onAvailabilityChange: (
    day: WeekdayKey,
    patch: Partial<WeeklyAvailability[WeekdayKey]>,
  ) => void;
  onSave: () => void | Promise<void>;
  onManageEvents: () => void;
  onResetStandaloneSetup?: () => void;
};

/**
 * The Settings tab: who the business is, when it is open, and what Haab can
 * connect to.
 *
 * Presentational. Every edit and every save goes back out through a callback,
 * so the module keeps owning persistence and this component stays testable
 * without a store, a client, or a network.
 */
export function ProviderSettingsSurface({
  title,
  publicUrlLabel,
  provider,
  availability,
  vertical,
  lang,
  publicUrl,
  integratedMode,
  canPersist,
  isSaving,
  saveError,
  saveMessage,
  entitlements,
  demoEdit = false,
  onProviderChange,
  onAvailabilityChange,
  onSave,
  onManageEvents,
  onResetStandaloneSetup,
}: ProviderSettingsSurfaceProps) {
  const t = bookingTranslations[lang];

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <div className={cn(adminPanelClass, "p-6")}>
        <SectionTitle
          title={title}
          action={
            integratedMode && canPersist ? (
              <ActionButton tone="primary" disabled={isSaving} onClick={onSave}>
                {isSaving ? t.common.saving : t.admin.saveChanges}
              </ActionButton>
            ) : undefined
          }
        />
        {saveError ? (
          <div className="mt-4 rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm font-medium text-[#be123c]">
            {saveError}
          </div>
        ) : null}
        {saveMessage ? (
          <div className="mt-4 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-medium text-[#15803d]">
            {saveMessage}
          </div>
        ) : null}
        <div className="mt-6">
          <ProviderInfoForm
            provider={provider}
            onChange={onProviderChange}
            disabled={isSaving}
            lang={lang}
          />
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">
          {publicUrlLabel}{" "}
          <span className="break-all font-medium text-[var(--ink)]">{publicUrl}</span>
        </p>
        {!integratedMode && onResetStandaloneSetup ? (
          <div className="mt-6">
            <ActionButton tone="danger" onClick={onResetStandaloneSetup}>
              {t.admin.resetStandaloneSetup}
            </ActionButton>
          </div>
        ) : null}
        {/* Integrations sit under the settings content rather than in their own
            tab: they are part of configuring the workspace, not a surface of
            their own. Their state is not saved with the profile. */}
        <ProviderIntegrationsSection
          entitlements={entitlements}
          integratedMode={integratedMode}
          demoEdit={demoEdit}
          lang={lang}
        />
      </div>

      <AvailabilitySettingsSection
        vertical={vertical}
        availability={availability}
        onChange={onAvailabilityChange}
        onManageEvents={onManageEvents}
        disabled={isSaving}
        lang={lang}
      />
    </div>
  );
}
