import { describe, expect, it } from "vitest";

import { normalizeLandingLang } from "@/components/landing/translations";
import { DEFAULT_LANGUAGE } from "@/lib/language/resolve";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { getVerticalPreset, VERTICALS } from "@/config/verticals";
import { withAuthReturnLanguage } from "@/lib/auth-i18n";
import {
  applyVerticalToStore,
  createEmptyStore,
  normalizeProvider,
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

describe("language defaults", () => {
  it("defaults the landing and auth surfaces to English", () => {
    expect(normalizeLandingLang(undefined)).toBe("en");
    expect(normalizeLandingLang(null)).toBe("en");
    expect(normalizeLandingLang("")).toBe("en");
    expect(normalizeLandingLang("fr")).toBe("en");
    expect(normalizeLandingLang("es")).toBe("es");
    expect(normalizeLandingLang("en")).toBe("en");
  });

  it("agrees with the shared default", () => {
    expect(normalizeLandingLang(undefined)).toBe(DEFAULT_LANGUAGE);
  });
});

describe("dashboard language", () => {
  it("is unset by default so the browser decides", () => {
    expect(normalizeProvider({}).dashboardLanguage).toBeUndefined();
  });

  it("round-trips a pinned value", () => {
    expect(normalizeProvider({ dashboardLanguage: "es" }).dashboardLanguage).toBe("es");
    expect(normalizeProvider({ dashboardLanguage: "en" }).dashboardLanguage).toBe("en");
  });

  it("drops an unsupported value rather than guessing", () => {
    expect(
      normalizeProvider({ dashboardLanguage: "fr" as never }).dashboardLanguage,
    ).toBeUndefined();
  });

  it("stays independent of the public page language", () => {
    const provider = normalizeProvider({ language: "es", dashboardLanguage: "en" });
    expect(provider.language).toBe("es");
    expect(provider.dashboardLanguage).toBe("en");
  });
});
