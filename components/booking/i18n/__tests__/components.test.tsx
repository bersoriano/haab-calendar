import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AvailabilityEditor } from "@/components/provider/AvailabilityEditor";
import { HeaderImageUploader } from "@/components/provider/HeaderImageUploader";
import { BookingHoldCountdownBar } from "@/components/ui/BookingHoldCountdownBar";
import { PublicProgressIndicator } from "@/components/ui/PublicProgressIndicator";
import { SummaryStatusTitle } from "@/components/ui/SummaryStatusTitle";
import { createEmptyStore } from "@/lib/store";
import { getVerticalCopy } from "@/lib/vertical-copy";

describe("shared booking components", () => {
  it("renders the availability editor controls in Spanish", () => {
    const html = renderToStaticMarkup(
      <AvailabilityEditor
        availability={createEmptyStore().availability}
        onChange={() => undefined}
        lang="es"
      />,
    );

    expect(html).toContain("Lunes");
    expect(html).toContain("Horarios bloqueados");
    expect(html).toContain("Agregar bloqueo");
  });

  it("renders header-image controls in Spanish", () => {
    const html = renderToStaticMarkup(
      <HeaderImageUploader onChange={() => undefined} lang="es" />,
    );

    expect(html).toContain("Imagen de encabezado");
    expect(html).toContain("Aún no hay imagen de encabezado");
    expect(html).toContain("Subir imagen");
  });

  it("renders public progress, status, and hold states in Spanish", () => {
    const progress = renderToStaticMarkup(
      <PublicProgressIndicator
        currentStep={3}
        isDedicatedPublicPage
        lang="es"
      />,
    );
    const summary = renderToStaticMarkup(
      <SummaryStatusTitle status="updated" lang="es" />,
    );
    const hold = renderToStaticMarkup(
      <BookingHoldCountdownBar
        isExpired
        remainingMs={0}
        remainingRatio={0}
        copy={getVerticalCopy("healthcare", "es")}
        lang="es"
      />,
    );

    expect(progress).toContain('aria-label="Progreso de la reserva"');
    expect(progress).toContain("Fecha y horario");
    expect(progress).toContain("Paso actual:");
    expect(summary).toContain("Resumen de la reserva - Actualizada");
    expect(hold).toContain("Reserva temporal vencida");
    expect(hold).toContain("Vencida");
  });

  it("preserves vertical-specific English hold wording", () => {
    const html = renderToStaticMarkup(
      <BookingHoldCountdownBar
        isConfirmed
        isExpired={false}
        remainingMs={60_000}
        remainingRatio={0.5}
        copy={getVerticalCopy("healthcare", "en")}
      />,
    );

    expect(html).toContain("Appointment hold");
    expect(html).toContain("Appointment secured");
    expect(html).toContain(
      "Your appointment is confirmed and the temporary hold is complete.",
    );
  });
});
