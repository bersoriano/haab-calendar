import type { Lang, ModuleStore } from "./types";
import { slugify } from "./utils";

export function isGuestDraftMeaningful(store: ModuleStore) {
  return Boolean(
    store.vertical ||
      store.provider.businessName.trim() ||
      store.provider.fullName.trim() ||
      store.services.length,
  );
}

export function buildGuestPublishReturnPath(lang: Lang) {
  const params = new URLSearchParams({
    resumePublish: "1",
    lang,
  });

  return `/?${params.toString()}`;
}

export function buildGuestPublishLoginHref(lang: Lang) {
  const params = new URLSearchParams({
    mode: "signup",
    lang,
    next: buildGuestPublishReturnPath(lang),
  });

  return `/login?${params.toString()}`;
}

export function isGuestPublishResume(value?: string) {
  return value === "1";
}

export function isGuestPublishReturnPath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return false;
  }

  try {
    return isGuestPublishResume(
      new URL(path, "https://haab.local").searchParams.get("resumePublish") ?? undefined,
    );
  } catch {
    return false;
  }
}

export function prepareGuestPreviewStore(store: ModuleStore): ModuleStore {
  return {
    ...store,
    provider: {
      ...store.provider,
      publicSlug:
        store.provider.publicSlug ||
        slugify(store.provider.businessName || store.provider.fullName || "haab-calendar"),
    },
    setupComplete: true,
  };
}

export function shouldSeedBuilderFromLanding({
  hasSavedDraft,
  resumeGuestPublish,
  selectedVertical,
}: {
  hasSavedDraft: boolean;
  resumeGuestPublish: boolean;
  selectedVertical?: ModuleStore["vertical"];
}) {
  return Boolean(selectedVertical && !hasSavedDraft && !resumeGuestPublish);
}
