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
    expect(translations.es.useCases.body).toContain("Selecciona un flujo");
    expect(translations.en.useCases.body).toContain("Select a workflow");
    expect(translations.en.useCases.note).not.toContain("blank");
    expect(translations.es.auth.signIn).toBe("Iniciar sesión");
    expect(translations.es.auth.confirmationExpired).toContain("venció");
  });

  it("defaults visitor-owned surfaces to Spanish", () => {
    expect(normalizeLandingLang(undefined)).toBe("es");
    expect(normalizeLandingLang("fr")).toBe("es");
    expect(normalizeLandingLang("en")).toBe("en");
  });
});
