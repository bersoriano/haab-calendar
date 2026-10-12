import { describe, expect, it } from "vitest";

import {
  buildGuestPublishReturnPath,
  buildGuestPublishLoginHref,
  isGuestDraftMeaningful,
  isGuestPublishReturnPath,
  isGuestPublishResume,
  landingSelectionSeedsDraft,
  prepareGuestPreviewStore,
  restartDraftSetup,
  shouldSeedBuilderFromLanding,
} from "@/lib/guest-builder";
import { createEmptyStore } from "@/lib/store";
import type { ModuleStore } from "@/lib/types";

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

/**
 * A business type picked on the landing page reaches a browser that may
 * already hold a draft. The type's starter services and hours are for a page
 * that is starting: laid over a draft of the same type they erase the
 * services and hours its owner entered.
 */
describe("a business type picked on the landing page", () => {
  const finished: ModuleStore = {
    ...createEmptyStore(),
    vertical: "healthcare",
    setupComplete: true,
  };

  it("starts a browser with no draft on that type", () => {
    expect(landingSelectionSeedsDraft(createEmptyStore(), "healthcare")).toBe(true);
  });

  it("leaves a draft of the same type as its owner built it", () => {
    expect(landingSelectionSeedsDraft(finished, "healthcare")).toBe(false);
    const unfinished: ModuleStore = { ...finished, setupComplete: false };
    expect(landingSelectionSeedsDraft(unfinished, "healthcare")).toBe(false);
  });

  it("starts over when the type is a different one", () => {
    expect(landingSelectionSeedsDraft(finished, "restaurant")).toBe(true);
  });

  it("sends a finished draft back through setup for its new type", () => {
    const draft: ModuleStore = {
      ...finished,
      provider: { ...finished.provider, businessName: "Nav Draft Clinic" },
      bookings: [{ id: "b1" } as ModuleStore["bookings"][number]],
      bookingHolds: [{ id: "h1" } as ModuleStore["bookingHolds"][number]],
    };

    const restarted = restartDraftSetup(draft);

    // The starter services replace the ones these were booked against.
    expect(restarted.setupComplete).toBe(false);
    expect(restarted.bookings).toEqual([]);
    expect(restarted.bookingHolds).toEqual([]);
    // Who the business is does not change with its type.
    expect(restarted.provider.businessName).toBe("Nav Draft Clinic");
  });
});

