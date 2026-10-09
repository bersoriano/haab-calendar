"use client";

import { useId, useState } from "react";

import { fillTemplate } from "@/components/booking/i18n/translations";
import { HaabBookingModule } from "@/components/haab-booking-module";
import { translations as landingTranslations } from "@/components/landing/translations";
import { countLabel, dashboardCopy } from "@/components/provider/dashboard-copy";
import { ActionButton } from "@/components/ui/ActionButton";
import { Alert } from "@/components/ui/Alert";
import { getVerticalPreset } from "@/config/verticals";
import {
  businessTypeDraftKey,
  resolveDraftAction,
  seedBusinessTypeDraft,
} from "@/lib/business-type-switch";
import { normalizeStore } from "@/lib/store";
import type { Lang, ModuleStore, VerticalId } from "@/lib/types";

/** The slice of Web Storage the draft needs; injectable for tests. */
export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type Phase = "ready" | "ask" | "missing";

type PendingPublish = {
  store: ModuleStore;
  resolve: (store: ModuleStore | null) => void;
  reject: (error: Error) => void;
};

function readDraft(storage: DraftStorage, key: string): ModuleStore | null {
  try {
    const raw = storage.getItem(key);
    return raw ? normalizeStore(JSON.parse(raw) as ModuleStore) : null;
  } catch {
    return null;
  }
}

function writeSeed(
  storage: DraftStorage,
  key: string,
  liveStore: ModuleStore,
  to: VerticalId,
  lang: Lang,
) {
  const preset = getVerticalPreset(to, lang);
  if (!preset) return false;
  storage.setItem(key, JSON.stringify(seedBusinessTypeDraft(liveStore, preset)));
  return true;
}

/**
 * The business-type switch's setup step: the ordinary setup wizard, run on a
 * draft kept in this browser. The live page is untouched until "Replace and
 * publish", which posts the draft to /api/provider/business-type.
 */
export function BusinessTypeSwitch({
  lang,
  liveStore,
  to,
  storage,
  onCancel,
}: {
  lang: Lang;
  liveStore: ModuleStore;
  to?: VerticalId;
  storage: DraftStorage;
  /** Leaves the switch (back to Settings). */
  onCancel: () => void;
}) {
  const copy = dashboardCopy[lang].businessType;
  const verticals = landingTranslations[lang].home.verticals;
  const key = businessTypeDraftKey(liveStore.provider.publicSlug || "page");
  const confirmTitleId = useId();

  // Runs in the browser only (the dashboard mounts its content client-side),
  // and before the wizard mounts, so the wizard hydrates from the draft.
  const [phase, setPhase] = useState<Phase>(() => {
    const action = resolveDraftAction(readDraft(storage, key), to);
    if (action === "seed") {
      return to && writeSeed(storage, key, liveStore, to, lang) ? "ready" : "missing";
    }
    return action === "resume" ? "ready" : action;
  });
  const [draftVertical, setDraftVertical] = useState<VerticalId | undefined>(
    () => readDraft(storage, key)?.vertical,
  );
  const [pending, setPending] = useState<PendingPublish | null>(null);
  const [publishing, setPublishing] = useState(false);

  function cancelChange() {
    storage.removeItem(key);
    onCancel();
  }

  function startOver() {
    if (to && writeSeed(storage, key, liveStore, to, lang)) {
      setDraftVertical(to);
      setPhase("ready");
    }
  }

  async function replaceAndPublish() {
    if (!pending) return;
    setPublishing(true);

    try {
      const response = await fetch("/api/provider/business-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store: pending.store }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        store?: ModuleStore;
        userMessage?: string;
      };

      if (!response.ok || !payload.store) {
        pending.reject(new Error(payload.userMessage ?? "Could not change your business type."));
        setPending(null);
        return;
      }

      storage.removeItem(key);
      const params = new URLSearchParams({ switched: pending.store.vertical ?? "" });
      if (payload.userMessage) params.set("profile", "unsaved");
      pending.resolve(payload.store);
      // A full load: the whole dashboard reads the new type from the server.
      window.location.assign(`/dashboard?${params.toString()}`);
    } catch {
      pending.reject(new Error("Could not change your business type. Please try again."));
      setPending(null);
    } finally {
      setPublishing(false);
    }
  }

  if (phase === "missing") {
    return (
      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface-lowest)] p-6 text-center">
        <p className="text-lg font-semibold text-[var(--ink)]">{copy.pickTitle}</p>
        <ActionButton tone="primary" className="mt-4" onClick={onCancel}>
          {copy.back}
        </ActionButton>
      </section>
    );
  }

  if (phase === "ask") {
    return (
      <section className="mx-auto max-w-xl rounded-[28px] border border-[var(--line)] bg-[var(--surface-lowest)] p-6">
        <h2 className="text-xl font-semibold text-[var(--ink)]">
          {fillTemplate(copy.replaceDraftTitle, {
            from: draftVertical ? verticals[draftVertical].label : "",
          })}
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {fillTemplate(copy.replaceDraftBody, { to: to ? verticals[to].label : "" })}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <ActionButton tone="secondary" onClick={() => setPhase("ready")}>
            {copy.keepDraft}
          </ActionButton>
          <ActionButton tone="primary" onClick={startOver}>
            {copy.startNew}
          </ActionButton>
        </div>
      </section>
    );
  }

  const typeLabel = draftVertical ? verticals[draftVertical].label : "";

  return (
    <div className="grid gap-5">
      <Alert
        tone="warning"
        actions={
          <ActionButton tone="ghost" onClick={cancelChange}>
            {copy.cancelChange}
          </ActionButton>
        }
      >
        {fillTemplate(copy.draftBanner, { type: typeLabel })}
      </Alert>

      <HaabBookingModule
        storageKey={key}
        persistSetup
        viewerLanguage={lang}
        initialLanguage={lang}
        publishLabel={copy.publishLabel}
        publishSetupOverride={(store) =>
          new Promise<ModuleStore | null>((resolve, reject) => {
            setPending({ store, resolve, reject });
          })
        }
      />

      {pending ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(15,23,32,0.55)] px-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
            className="w-full max-w-md rounded-[28px] border border-[var(--line)] bg-[var(--surface-lowest)] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
          >
            <h2 id={confirmTitleId} className="text-xl font-semibold text-[var(--ink)]">
              {copy.confirmTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {fillTemplate(copy.confirmBody, {
                services: countLabel(copy.servicesCount, liveStore.services.length),
              })}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <ActionButton
                tone="ghost"
                disabled={publishing}
                onClick={() => {
                  pending.resolve(null);
                  setPending(null);
                }}
              >
                {copy.cancel}
              </ActionButton>
              <ActionButton tone="primary" disabled={publishing} onClick={() => void replaceAndPublish()}>
                {copy.publishLabel}
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
