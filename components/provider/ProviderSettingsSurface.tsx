"use client";

import { useState, type FormEvent } from "react";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  FormSection,
  Input,
} from "@/components/app-ui";
import { ProviderInfoForm } from "@/components/provider/ProviderInfoForm";
import { BookingRetentionSettings } from "@/components/provider/BookingRetentionSettings";
import { DashboardLanguageField } from "@/components/provider/LanguageSettingsSection";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import type { ProviderEntitlements } from "@/lib/entitlements/resolve";
import { canUseCustomProviderSlug } from "@/lib/public-url";
import type { Lang, ProviderInfo } from "@/lib/types";

export type ProviderSettingsSurfaceProps = {
  /** Already resolved by the caller, which owns the vertical's role wording. */
  title: string;
  /** Same reason: "Public booking link for" reads differently per vertical. */
  publicUrlLabel: string;
  provider: ProviderInfo;
  /** Last server-confirmed preference; never the pending form value. */
  savedKeepBookingHistoryOneYear?: boolean;
  lang: Lang;
  publicUrl: string;

  integratedMode: boolean;
  /** The store can be written; gates the custom-URL editor. */
  canPersist: boolean;
  /** A save is in flight; fields stay read-only until it lands. */
  disabled: boolean;

  /** Resolved server-side. Presentation only — never the authorization. */
  entitlements?: ProviderEntitlements;

  onProviderChange: <K extends keyof ProviderInfo>(key: K, value: ProviderInfo[K]) => void;
  onSavePublicSlug?: (slug: string) => Promise<void>;
  onResetStandaloneSetup?: () => void;
  /** Present where the owner can change their own workspace language here. */
  onDashboardLanguageChange?: (language: Lang) => void;
  /**
   * The page's current business type and a way to start changing it. Absent
   * where a switch is not available (embedded hosts, demo editing).
   */
  businessType?: { label: string; tagline: string; onChange: () => void };
};

/**
 * The Settings section: who the business is and where its booking page
 * lives. Availability and integrations have their own sections.
 *
 * Presentational. Every edit goes back out through a callback and the
 * dashboard's save bar persists it, so the module keeps owning persistence and
 * this component stays testable without a store, a client, or a network.
 */
export function ProviderSettingsSurface({
  title,
  publicUrlLabel,
  provider,
  savedKeepBookingHistoryOneYear = false,
  lang,
  publicUrl,
  integratedMode,
  canPersist,
  disabled,
  entitlements,
  onProviderChange,
  onSavePublicSlug,
  onResetStandaloneSetup,
  onDashboardLanguageChange,
  businessType,
}: ProviderSettingsSurfaceProps) {
  const t = bookingTranslations[lang];
  const shell = dashboardCopy[lang];
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="grid max-w-5xl gap-6">
      <Card>
        <div className="divide-y divide-app-border px-4 py-6 sm:px-6">
          <FormSection title={title}>
            <ProviderInfoForm provider={provider} onChange={onProviderChange} disabled={disabled} lang={lang} />
          </FormSection>

          <FormSection title={shell.bookingLinkTitle} description={publicUrlLabel}>
            <Input readOnly value={publicUrl} aria-label={shell.bookingLinkTitle} className="font-mono" />
            {integratedMode && canPersist && entitlements &&
            canUseCustomProviderSlug(entitlements) && onSavePublicSlug ? (
              <PublicSlugEditor
                key={provider.publicSlug}
                currentSlug={provider.publicSlug}
                publicUrl={publicUrl}
                lang={lang}
                onSave={onSavePublicSlug}
              />
            ) : null}
          </FormSection>

          {onDashboardLanguageChange ? (
            <FormSection title={shell.workspaceLanguageTitle}>
              <DashboardLanguageField lang={lang} onChange={onDashboardLanguageChange} />
            </FormSection>
          ) : null}

          {integratedMode && canPersist ? (
            <FormSection title={shell.retentionTitle}>
              <BookingRetentionSettings
                lang={lang}
                enabled={provider.keepBookingHistoryOneYear === true}
                savedEnabled={savedKeepBookingHistoryOneYear}
                entitlements={entitlements}
                disabled={disabled}
                onChange={(enabled) => onProviderChange("keepBookingHistoryOneYear", enabled)}
              />
            </FormSection>
          ) : null}

          {businessType ? (
            <FormSection title={shell.businessType.cardTitle} description={shell.businessType.cardBody}>
              <div className="flex flex-col gap-4 rounded-lg bg-app-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-app-fg">{businessType.label}</p>
                  <p className="mt-0.5 text-sm text-app-fg-muted">{businessType.tagline}</p>
                </div>
                <Button variant="secondary" onClick={businessType.onChange}>
                  {shell.businessType.change}
                </Button>
              </div>
            </FormSection>
          ) : null}
        </div>
      </Card>

      {!integratedMode && onResetStandaloneSetup ? (
        <Card as="section" className="ring-app-danger-ring">
          <CardHeader title={shell.dangerZoneTitle} description={shell.dangerZoneBody} />
          <CardBody>
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              {t.admin.resetStandaloneSetup}
            </Button>
          </CardBody>
          <ConfirmDialog
            open={confirmReset}
            title={shell.resetSetupTitle}
            body={shell.resetSetupBody}
            confirmLabel={t.admin.resetStandaloneSetup}
            cancelLabel={shell.keepSetup}
            closeLabel={shell.closeDialog}
            tone="danger"
            onConfirm={() => {
              setConfirmReset(false);
              onResetStandaloneSetup();
            }}
            onCancel={() => setConfirmReset(false)}
          />
        </Card>
      ) : null}
    </div>
  );
}

function PublicSlugEditor({
  currentSlug,
  publicUrl,
  lang,
  onSave,
}: {
  currentSlug: string;
  publicUrl: string;
  lang: Lang;
  onSave: (slug: string) => Promise<void>;
}) {
  const t = bookingTranslations[lang];
  const [slug, setSlug] = useState(currentSlug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefix = publicUrl.slice(0, publicUrl.lastIndexOf("/") + 1);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(slug);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.admin.couldNotSavePublicSlug);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-2" onSubmit={submit}>
      <label htmlFor="public-slug" className="text-sm font-medium text-app-fg">
        {t.admin.publicSlugLabel}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="public-slug"
          name="publicSlug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          disabled={saving}
          maxLength={48}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "public-slug-error" : undefined}
          leadingAddon={<span className="max-w-[40vw] truncate">{prefix}</span>}
          className="min-w-0 flex-1"
        />
        <Button type="submit" loading={saving} disabled={slug.trim() === currentSlug}>
          {saving ? t.common.saving : t.admin.savePublicSlug}
        </Button>
      </div>
      {error ? (
        <p id="public-slug-error" role="alert" className="text-sm font-medium text-app-danger-fg">
          {error}
        </p>
      ) : null}
    </form>
  );
}
