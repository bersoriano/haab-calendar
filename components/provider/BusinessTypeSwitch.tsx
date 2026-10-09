"use client";

import { useState } from "react";

import { fillTemplate } from "@/components/booking/i18n/translations";
import { HaabBookingModule } from "@/components/haab-booking-module";
import { translations as landingTranslations } from "@/components/landing/translations";
import { countLabel, dashboardCopy } from "@/components/provider/dashboard-copy";
import { Alert, Button, Card, CardBody, CardFooter, CardHeader, ConfirmDialog } from "@/components/app-ui";
import { getVerticalPreset } from "@/config/verticals";
import {
  businessTypeDraftKey,
  resolveDraftAction,
  seedBusinessTypeDraft,
} from "@/lib/business-type-switch";
import { allowLeavingWithoutWarning } from "@/lib/leave-guard";
import { normalizeStore } from "@/lib/store";
import type { Lang, ModuleStore, VerticalId } from "@/lib/types";

/**
 * The banner over the draft. Follows the wizard: going Back from its first
 * step clears the type and shows the picker, so the banner stops naming one.
 */
export function draftBannerText(lang: Lang, vertical: VerticalId | undefined) {
  const copy = dashboardCopy[lang].businessType;
  return vertical
    ? fillTemplate(copy.draftBanner, { type: landingTranslations[lang].home.verticals[vertical].label })
    : copy.draftBannerChoosing;
}

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
      // The draft started from the live page, unsaved edits included, so the
      // live dashboard's leave warning has nothing left to protect.
      allowLeavingWithoutWarning();
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
      <Card className="text-center">
        <CardBody className="grid justify-items-center gap-4 py-10">
          <p className="text-base font-semibold text-app-fg">{copy.pickTitle}</p>
          <Button onClick={onCancel}>{copy.back}</Button>
        </CardBody>
      </Card>
    );
  }

  if (phase === "ask") {
    return (
      <Card as="section" className="mx-auto max-w-xl">
        <CardHeader
          title={fillTemplate(copy.replaceDraftTitle, {
            from: draftVertical ? verticals[draftVertical].label : "",
          })}
          description={fillTemplate(copy.replaceDraftBody, { to: to ? verticals[to].label : "" })}
        />
        <CardFooter>
          <Button variant="secondary" onClick={() => setPhase("ready")}>
            {copy.keepDraft}
          </Button>
          <Button onClick={startOver}>{copy.startNew}</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
      <Alert
        tone="warning"
        actions={
          <Button variant="secondary" size="sm" onClick={cancelChange}>
            {copy.cancelChange}
          </Button>
        }
      >
        {draftBannerText(lang, draftVertical)}
      </Alert>

      <HaabBookingModule
        storageKey={key}
        persistSetup
        viewerLanguage={lang}
        initialLanguage={lang}
        publishLabel={copy.publishLabel}
        onVerticalChange={setDraftVertical}
        publishSetupOverride={(store) =>
          new Promise<ModuleStore | null>((resolve, reject) => {
            setPending({ store, resolve, reject });
          })
        }
      />

      <ConfirmDialog
        open={pending !== null}
        alert
        title={copy.confirmTitle}
        body={fillTemplate(copy.confirmBody, {
          services: countLabel(copy.servicesCount, liveStore.services.length),
        })}
        confirmLabel={copy.publishLabel}
        cancelLabel={copy.cancel}
        closeLabel={copy.cancel}
        tone="primary"
        pending={publishing}
        onConfirm={() => void replaceAndPublish()}
        onCancel={() => {
          pending?.resolve(null);
          setPending(null);
        }}
      />
    </div>
  );
}
