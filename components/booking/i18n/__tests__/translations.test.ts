import { describe, it, expect } from "vitest";
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
    const { admin, providerForm, public: publicCopy, publicFlow } =
      bookingTranslations.es;

    expect(admin.weekdays.monday).toBe("Lunes");
    expect(admin.blockedTimes).toBe("Horarios bloqueados");
    expect(admin.saveChanges).toBe("Guardar cambios");
    expect(providerForm.uploadImage).toBe("Subir imagen");
    expect(publicCopy.expired).toBe("Vencida");
    expect(publicFlow.progressLabel).toBe("Progreso de la reserva");
    expect(publicFlow.statusUpdated).toBe("Actualizada");
  });
});
