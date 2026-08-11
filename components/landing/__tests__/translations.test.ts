import { describe, expect, it } from "vitest";

import {
  normalizeLandingLang,
  translations,
} from "@/components/landing/translations";

function keyPaths(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      keyPaths(child, prefix ? `${prefix}.${key}` : key),
    );
  }

  return [prefix];
}

function strings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(strings);
  }

  return [];
}

describe("landing translations", () => {
  it("keeps identical English and Spanish key shapes", () => {
    expect(keyPaths(translations.es).sort()).toEqual(
      keyPaths(translations.en).sort(),
    );
  });

  it("contains no empty translated strings", () => {
    expect(strings(translations.es).every((value) => value.trim().length > 0)).toBe(true);
    expect(strings(translations.en).every((value) => value.trim().length > 0)).toBe(true);
  });

  it("covers home integration and authentication copy", () => {
    expect(translations.es.home.verticals.healthcare.label).toBe("Salud");
    expect(translations.es.home.goToDashboard).toBe("Ir a tu panel →");
    expect(translations.en.home.guestDraftTitle).toContain("Preview");
    expect(translations.es.home.guestDraftPublish).toContain("Publicar");
    expect(translations.es.useCases.title).toContain("Elige qué reservas");
    expect(translations.en.useCases.title).toContain("Pick what you book");
    expect(translations.en.useCases.note).not.toContain("blank");
    expect(translations.es.auth.signIn).toBe("Iniciar sesión");
    expect(translations.en.auth.publishPageTitle).toContain("publish");
    expect(translations.en.auth.draftSafe).toContain("safe");
    expect(translations.es.auth.draftSafe).toContain("seguro");
    expect(translations.es.auth.confirmationExpired).toContain("venció");
    expect(translations.es.home.verticals.events.tagline).toContain("carreras");
    expect(translations.en.home.verticals.events.tagline).toContain("races");
    expect(translations.en.auth.eventOrganizerPanelTitle).toBe("Organizer login");
    expect(translations.es.auth.eventOrganizerPanelTitle).toBe("Acceso para organizadores");
    expect(translations.en.auth.eventOrganizerPageBody).not.toMatch(/\bprovider\b/i);
    expect(translations.es.auth.eventOrganizerPageBody).not.toMatch(/\bproveedor\b/i);
  });

  it("defaults visitor-owned surfaces to Spanish", () => {
    expect(normalizeLandingLang(undefined)).toBe("es");
    expect(normalizeLandingLang("fr")).toBe("es");
    expect(normalizeLandingLang("en")).toBe("en");
  });
});
