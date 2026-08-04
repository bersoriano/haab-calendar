import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AvailabilityEditor } from "@/components/provider/AvailabilityEditor";
import { AvailabilitySettingsSection } from "@/components/provider/AvailabilitySettingsSection";
import { HeaderImageUploader } from "@/components/provider/HeaderImageUploader";
import { ServiceEditor } from "@/components/provider/ServiceEditor";
import { BookingHoldCountdownBar } from "@/components/ui/BookingHoldCountdownBar";
import { PublicProgressIndicator } from "@/components/ui/PublicProgressIndicator";
import { SummaryStatusTitle } from "@/components/ui/SummaryStatusTitle";
import { createBlankServiceDraft, createEmptyStore } from "@/lib/store";
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

  it("replaces weekly availability with event scheduling guidance", () => {
    const store = createEmptyStore();
    const html = renderToStaticMarkup(
      <AvailabilitySettingsSection
        vertical="events"
        availability={store.availability}
        onChange={() => undefined}
        onManageEvents={() => undefined}
        lang="en"
      />,
    );

    expect(html).toContain("Event scheduling");
    expect(html).toContain("Weekly availability does not apply to events.");
    expect(html).toContain("Manage events");
    expect(html).not.toContain(">Monday<");
  });

  it("keeps weekly availability settings for non-event verticals", () => {
    const store = createEmptyStore();
    const html = renderToStaticMarkup(
      <AvailabilitySettingsSection
        vertical="professional"
        availability={store.availability}
        onChange={() => undefined}
        onManageEvents={() => undefined}
        lang="en"
      />,
    );

    expect(html).toContain("Weekly availability");
    expect(html).toContain("Monday");
    expect(html).not.toContain("Manage events");
  });

  it("offers only single and weekly scheduling for events", () => {
    const store = createEmptyStore();
    const eventDraft = {
      ...createBlankServiceDraft("events"),
      customAddress: "123 Main Street",
      customPhone: "+1 555 123 4567",
    };
    const html = renderToStaticMarkup(
      <ServiceEditor
        services={[]}
        serviceDraft={eventDraft}
        onDraftChange={() => undefined}
        editingServiceId={null}
        onUpsert={() => undefined}
        onReset={() => undefined}
        onEdit={() => undefined}
        onRemove={() => undefined}
        copy={getVerticalCopy("events", "en")}
        provider={store.provider}
        vertical="events"
        lang="en"
      />,
    );

    expect(html).toContain(">Single<");
    expect(html).toContain(">Weekly<");
    expect(html).not.toContain(">Periodic<");
    expect(html).toContain("organizer profile");
    expect(html).not.toMatch(/\bprovider profile\b/i);
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

  it("renders the warning action and offline recovery guidance in both languages", () => {
    const english = renderToStaticMarkup(
      <BookingHoldCountdownBar
        isExpired={false}
        remainingMs={90_000}
        remainingRatio={0.15}
        canExtend
        isOnline={false}
        copy={getVerticalCopy("professional", "en")}
        lang="en"
      />,
    );
    const spanish = renderToStaticMarkup(
      <BookingHoldCountdownBar
        isExpired={false}
        remainingMs={90_000}
        remainingRatio={0.15}
        canExtend
        copy={getVerticalCopy("professional", "es")}
        lang="es"
      />,
    );

    expect(english).toContain("Still interested?");
    expect(english).toContain("You’re offline");
    expect(english).toContain("Add 5 minutes");
    expect(spanish).toContain("¿Aún le interesa?");
    expect(spanish).toContain("Agregar 5 minutos");
  });
});
