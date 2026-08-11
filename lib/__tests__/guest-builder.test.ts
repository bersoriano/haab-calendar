import { describe, expect, it } from "vitest";

import {
  buildGuestPublishReturnPath,
  buildGuestPublishLoginHref,
  isGuestDraftMeaningful,
  isGuestPublishReturnPath,
  isGuestPublishResume,
  prepareGuestPreviewStore,
  shouldSeedBuilderFromLanding,
} from "@/lib/guest-builder";
import { createEmptyStore } from "@/lib/store";

describe("guest booking-page builder", () => {
  it("ignores an untouched standalone store", () => {
    expect(isGuestDraftMeaningful(createEmptyStore())).toBe(false);
  });

  it("recognizes a selected workflow as a guest draft", () => {
    expect(
      isGuestDraftMeaningful({
        ...createEmptyStore(),
        vertical: "healthcare",
      }),
    ).toBe(true);
  });

  it("recognizes visitor-entered page content as a guest draft", () => {
    const store = createEmptyStore();
    store.provider.businessName = "Clínica Sol";

    expect(isGuestDraftMeaningful(store)).toBe(true);
  });

  it("builds a language-preserving publish return path", () => {
    expect(buildGuestPublishReturnPath("en")).toBe("/?resumePublish=1&lang=en");
    expect(buildGuestPublishReturnPath("es")).toBe("/?resumePublish=1&lang=es");
  });

  it("builds a signup-first login URL for publishing", () => {
    const url = new URL(buildGuestPublishLoginHref("en"), "https://haab.local");

    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("mode")).toBe("signup");
    expect(url.searchParams.get("lang")).toBe("en");
    expect(url.searchParams.get("next")).toBe("/?resumePublish=1&lang=en");
  });

  it("accepts only the explicit publish-resume flag", () => {
    expect(isGuestPublishResume("1")).toBe(true);
    expect(isGuestPublishResume("true")).toBe(false);
    expect(isGuestPublishResume(undefined)).toBe(false);
  });

  it("detects publish resume only from a safe relative return path", () => {
    expect(isGuestPublishReturnPath("/?resumePublish=1&lang=en")).toBe(true);
    expect(isGuestPublishReturnPath("/?resumePublish=0&lang=en")).toBe(false);
    expect(isGuestPublishReturnPath("not a path")).toBe(false);
  });

  it("prepares a local preview without creating a server publication", () => {
    const store = createEmptyStore();
    store.provider.businessName = "Clínica Sol";

    const preview = prepareGuestPreviewStore(store);

    expect(preview.setupComplete).toBe(true);
    expect(preview.provider.publicSlug).toBe("clinica-sol");
    expect(store.setupComplete).toBe(false);
  });

  it("does not reapply a vertical preset over a saved draft", () => {
    expect(
      shouldSeedBuilderFromLanding({
        hasSavedDraft: true,
        resumeGuestPublish: false,
        selectedVertical: "healthcare",
      }),
    ).toBe(false);
    expect(
      shouldSeedBuilderFromLanding({
        hasSavedDraft: false,
        resumeGuestPublish: false,
        selectedVertical: "healthcare",
      }),
    ).toBe(true);
    expect(
      shouldSeedBuilderFromLanding({
        hasSavedDraft: true,
        resumeGuestPublish: true,
        selectedVertical: "healthcare",
      }),
    ).toBe(false);
  });
});
