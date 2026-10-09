"use client";

import { useState, type FormEvent } from "react";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { adminFieldClass, adminPanelClass } from "@/components/provider/adminGlass";
import { ProviderInfoForm } from "@/components/provider/ProviderInfoForm";
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
  canPersist: boolean;
  isSaving: boolean;
  saveError?: string | null;
  saveMessage?: string | null;

  /** Resolved server-side. Presentation only — never the authorization. */
  entitlements?: ProviderEntitlements;

  onProviderChange: <K extends keyof ProviderInfo>(key: K, value: ProviderInfo[K]) => void;
  onSave: () => void | Promise<void>;
  onSavePublicSlug?: (slug: string) => Promise<void>;
  onResetStandaloneSetup?: () => void;
};

/**
 * The Settings section: who the business is and where its booking page
 * lives. Availability and integrations have their own sections.
 *
 * Presentational. Every edit and every save goes back out through a callback,
 * so the module keeps owning persistence and this component stays testable
 * without a store, a client, or a network.
 */
export function ProviderSettingsSurface({
  title,
  publicUrlLabel,
  provider,
  lang,
  publicUrl,
  integratedMode,
  canPersist,
  isSaving,
  saveError,
  saveMessage,
  entitlements,
  onProviderChange,
  onSave,
  onSavePublicSlug,
  onResetStandaloneSetup,
}: ProviderSettingsSurfaceProps) {
  const t = bookingTranslations[lang];

  return (
    <div className="max-w-3xl">
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
        {!integratedMode && onResetStandaloneSetup ? (
          <div className="mt-6">
            <ActionButton tone="danger" onClick={onResetStandaloneSetup}>
              {t.admin.resetStandaloneSetup}
            </ActionButton>
          </div>
        ) : null}
      </div>
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
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
