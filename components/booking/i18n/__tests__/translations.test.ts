import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { bookingTranslations } from "@/components/booking/i18n/translations";

function keyPaths(obj: unknown, prefix = ""): string[] {
  if (obj && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      keyPaths(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

describe("bookingTranslations", () => {
  it("has identical key shapes for en and es", () => {
    const en = keyPaths(bookingTranslations.en).sort();
    const es = keyPaths(bookingTranslations.es).sort();
    expect(es).toEqual(en);
  });

  it("has no empty Spanish strings", () => {
    const flatten = (o: Record<string, unknown>): string[] =>
      Object.values(o).flatMap((v) =>
        typeof v === "string" ? [v] : flatten(v as Record<string, unknown>),
      );
    expect(flatten(bookingTranslations.es).every((s) => s.trim().length > 0)).toBe(true);
  });

  it("covers the shared provider and public-flow components in Spanish", () => {
    const { admin, providerForm, public: publicCopy, publicFlow, setup } =
      bookingTranslations.es;

    expect(admin.weekdays.monday).toBe("Lunes");
    expect(admin.blockedTimes).toBe("Horarios bloqueados");
    expect(admin.saveChanges).toBe("Guardar cambios");
    expect(admin.eventSchedulingTitle).toBe("Programación de eventos");
    expect(admin.manageEvents).toBe("Gestionar eventos");
    expect(providerForm.uploadImage).toBe("Subir imagen");
    expect(providerForm.logoImage).toBe("Logotipo de la página pública");
    expect(providerForm.logoImageSizeError).toContain("1 MB");
    expect(publicCopy.expired).toBe("Vencida");
    expect(publicFlow.progressLabel).toBe("Progreso de la reserva");
    expect(publicFlow.statusUpdated).toBe("Actualizada");
    expect(setup.stepProvider).toBe("Mis Datos");
    expect(setup.stepServices).toBe("Servicios");
    expect(setup.stepPreview).toBe("Vista previa");
    expect(setup.createAccountToPublish).toContain("Publicar");
    expect(setup.retryPublishing).toContain("Reintentar");
    expect(setup.publicBookingPage).toBe("Página pública de reservas");
    expect(setup.yourServices).toBe("Tus servicios");
    expect(bookingTranslations.en.setup.previewNotPublished).toContain("not published");
    expect(bookingTranslations.en.setup.stepProvider).toBe("My Data");
  });

  it("uses physician terminology for the healthcare vertical in both languages", () => {
    expect(bookingTranslations.en.healthcareRole.dataTitle).toBe("Physician Data");
    expect(bookingTranslations.es.healthcareRole.dataTitle).toBe("Datos del Médico");
    expect(bookingTranslations.en.healthcareRole.informationTitle).toBe("Physician information");
    expect(bookingTranslations.es.healthcareRole.informationTitle).toBe("Información del Médico");
    expect(Object.values(bookingTranslations.en.healthcareRole).join(" ")).not.toMatch(/\bprovider\b/i);
    expect(Object.values(bookingTranslations.es.healthcareRole).join(" ")).not.toMatch(/\bproveedor\b/i);
  });

  it("uses organizer terminology for the events vertical in both languages", () => {
    expect(bookingTranslations.en.eventOrganizerRole.informationTitle).toBe(
      "Organizer information",
    );
    expect(bookingTranslations.es.eventOrganizerRole.informationTitle).toBe(
      "Información del organizador",
    );
    expect(bookingTranslations.en.eventOrganizerRole.contactLabel).toBe(
      "Contact organizer",
    );
    expect(bookingTranslations.es.eventOrganizerRole.contactLabel).toBe(
      "Contactar al organizador",
    );
    expect(
      Object.values(bookingTranslations.en.eventOrganizerRole).join(" "),
    ).not.toMatch(/\bprovider\b/i);
    expect(
      Object.values(bookingTranslations.es.eventOrganizerRole).join(" "),
    ).not.toMatch(/\bproveedor\b/i);
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" || entry.name === "node_modules"
        ? []
        : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("no inline English branches", () => {
  it("has no component that composes English inline and Spanish from the dictionary", () => {
    const files = ["components", "app", "lib"].flatMap(sourceFiles);

    const offenders = files.filter((file) =>
      /lang === "en"\s*\?/.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });

  it("carries the templated hold copy in both languages", () => {
    for (const lang of ["en", "es"] as const) {
      const { public: publicCopy, admin } = bookingTranslations[lang];
      expect(publicCopy.holdCancelledFor).toContain("{Booking}");
      expect(publicCopy.holdSecuredFor).toContain("{Booking}");
      expect(publicCopy.holdConfirmedFor).toContain("{booking}");
      expect(admin.publicBookingLinkFor).toContain("{booking}");
    }
    // holdLabelFor and holdCountdownLabel put the noun sentence-initial in
    // English ("Booking hold") but mid-sentence in Spanish ("Apartado de
    // reserva"), so the placeholder casing differs by language on purpose.
    expect(bookingTranslations.en.public.holdLabelFor).toContain("{Booking}");
    expect(bookingTranslations.es.public.holdLabelFor).toContain("{booking}");
    expect(bookingTranslations.en.public.holdCountdownLabel).toContain("{Booking}");
    expect(bookingTranslations.es.public.holdCountdownLabel).toContain("{booking}");
  });
});
