import { describe, expect, it } from "vitest";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { VERTICALS } from "@/config/verticals";
import { withAuthReturnLanguage } from "@/lib/auth-i18n";
import {
  applyVerticalToStore,
  createEmptyStore,
  seedSetupLanguage,
} from "@/lib/store";
import { getVerticalCopy } from "@/lib/vertical-copy";

describe("landing-to-admin language continuity", () => {
  it("carries Spanish through auth, healthcare setup, and admin copy", () => {
    const healthcare = VERTICALS.find((vertical) => vertical.id === "healthcare")!;
    const setupStore = applyVerticalToStore(
      seedSetupLanguage(createEmptyStore(), "es"),
      healthcare,
    );
    const lang = setupStore.provider.language;

    expect(withAuthReturnLanguage("/?vertical=healthcare", lang)).toBe(
      "/?vertical=healthcare&lang=es",
    );
    expect(getVerticalCopy(setupStore.vertical, lang).phrases.setupTitle).toBe(
      "Configure su página de citas para pacientes",
    );
    expect(bookingTranslations[lang].admin.tabDashboard).toBe("Panel");
  });

  it("does not replace a completed provider's saved language", () => {
    const completedProvider = {
      ...createEmptyStore(),
      setupComplete: true,
    };

    expect(seedSetupLanguage(completedProvider, "es").provider.language).toBe("en");
  });
});
