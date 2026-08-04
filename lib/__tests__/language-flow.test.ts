import { describe, expect, it } from "vitest";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { getVerticalPreset, VERTICALS } from "@/config/verticals";
import { withAuthReturnLanguage } from "@/lib/auth-i18n";
import {
  applyVerticalToStore,
  createEmptyStore,
  seedSetupLanguage,
} from "@/lib/store";
import { getVerticalCopy } from "@/lib/vertical-copy";
import { localizePublicExampleContent } from "@/lib/public-content-i18n";
import {
  parsePublicLanguage,
  withPublicLanguage,
} from "@/lib/public-language";

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

  it("seeds polished Spanish service content when setup starts in Spanish", () => {
    const healthcare = getVerticalPreset("healthcare", "es")!;
    const setupStore = applyVerticalToStore(
      seedSetupLanguage(createEmptyStore(), "es"),
      healthcare,
    );

    expect(healthcare.label).toBe("Salud");
    expect(setupStore.services[0].name).toBe("Consulta para pacientes nuevos");
    expect(setupStore.services[0].capacity).toBe("1 paciente");
  });

  it("localizes every authored field on a seeded public example", () => {
    const base = createEmptyStore();
    const result = localizePublicExampleContent(
      {
        ...base.provider,
        publicSlug: "dr-maya-rivera",
        businessName: "Rivera Family Medicine",
      },
      [
        {
          id: "svc-1",
          slug: "new-patient-consultation",
          name: "New patient consultation",
          bookingType: "appointment",
          durationMinutes: 30,
          description: "English description",
          medicalSpecialty: "Family medicine",
          capacity: "1 patient",
          notes: "English notes",
        },
      ],
      "es",
    );

    expect(result.provider.heroText).toContain("Atención primaria");
    expect(result.services[0]).toMatchObject({
      name: "Consulta para pacientes nuevos",
      medicalSpecialty: "Medicina familiar",
      capacity: "1 paciente",
    });
    expect(result.services[0].description).not.toContain("English");
    expect(result.services[0].notes).not.toContain("English");
  });

  it("keeps an explicit public language on clean routes and redirects", () => {
    expect(parsePublicLanguage("es")).toBe("es");
    expect(parsePublicLanguage("fr")).toBeUndefined();
    expect(withPublicLanguage("/doctors/dr-maya-rivera", "en")).toBe(
      "/doctors/dr-maya-rivera?lang=en",
    );
    expect(withPublicLanguage("/public/dr-maya-rivera?service=follow-up", "es")).toBe(
      "/public/dr-maya-rivera?service=follow-up&lang=es",
    );
  });
});
