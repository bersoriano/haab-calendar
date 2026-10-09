"use client";

import { useState, type FormEvent } from "react";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { adminFieldClass, adminPanelClass } from "@/components/provider/adminGlass";
import { ProviderInfoForm } from "@/components/provider/ProviderInfoForm";
import { DashboardLanguageField } from "@/components/provider/LanguageSettingsSection";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { ActionButton, SectionTitle } from "@/components/ui";
import type { ProviderEntitlements } from "@/lib/entitlements/resolve";
import { canUseCustomProviderSlug } from "@/lib/public-url";
import type { Lang, ProviderInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ProviderSettingsSurfaceProps = {
  /** Already resolved by the caller, which owns the vertical's role wording. */
  title: string;
  /** Same reason: "Public booking link for" reads differently per vertical. */
  publicUrlLabel: string;
  provider: ProviderInfo;
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
}: ProviderSettingsSurfaceProps) {
  const t = bookingTranslations[lang];
  const shell = dashboardCopy[lang];

  return (
    <div className="grid max-w-3xl gap-6">
      <section className={cn(adminPanelClass, "p-5 sm:p-6")}>
        <SectionTitle title={title} />
        <div className="mt-6">
          <ProviderInfoForm
            provider={provider}
            onChange={onProviderChange}
            disabled={disabled}
            lang={lang}
          />
        </div>
      </section>

      <section className={cn(adminPanelClass, "p-5 sm:p-6")}>
        <SectionTitle title={shell.bookingLinkTitle} />
        <p className="mt-3 text-sm text-[var(--muted)]">{publicUrlLabel}</p>
        <p className="mt-2 break-all rounded-2xl bg-[var(--surface-soft)] px-3 py-2 font-mono text-sm text-[var(--ink)]">
          {publicUrl}
        </p>
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
      </section>

      {onDashboardLanguageChange ? (
        <section className={cn(adminPanelClass, "p-5 sm:p-6")}>
          <SectionTitle title={shell.workspaceLanguageTitle} />
          <div className="mt-4">
            <DashboardLanguageField lang={lang} onChange={onDashboardLanguageChange} />
          </div>
        </section>
      ) : null}

      {!integratedMode && onResetStandaloneSetup ? (
        <section className="rounded-[28px] border border-[var(--danger-line)] bg-[var(--danger-soft)]/60 p-5 sm:p-6">
          <SectionTitle title={shell.dangerZoneTitle} body={shell.dangerZoneBody} />
          <div className="mt-4">
            <ActionButton tone="danger" onClick={onResetStandaloneSetup}>
              {t.admin.resetStandaloneSetup}
            </ActionButton>
          </div>
        </section>
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
    <form className="mt-4 grid gap-2" onSubmit={submit}>
      <label htmlFor="public-slug" className="text-sm font-medium text-[var(--ink)]">
        {t.admin.publicSlugLabel}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--muted)]">{prefix}</span>
        <input
          id="public-slug"
          name="publicSlug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          disabled={saving}
          maxLength={48}
          className={cn("min-h-11 min-w-48 flex-1", adminFieldClass)}
        />
        <ActionButton type="submit" disabled={saving || slug.trim() === currentSlug}>
          {saving ? t.common.saving : t.admin.savePublicSlug}
        </ActionButton>
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-[var(--danger-strong)]">
          {error}
        </p>
      ) : null}
    </form>
  );
}
