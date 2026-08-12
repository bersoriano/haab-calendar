import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AvailabilityEditor } from "@/components/provider/AvailabilityEditor";
import { AvailabilitySettingsSection } from "@/components/provider/AvailabilitySettingsSection";
import { HeaderImageUploader } from "@/components/provider/HeaderImageUploader";
import { ServiceEditor } from "@/components/provider/ServiceEditor";
import { BookingHoldCountdownBar } from "@/components/ui/BookingHoldCountdownBar";
import { BookingStatusPill } from "@/components/ui/BookingStatusPill";
import { PrivateLinkCard } from "@/components/ui/PrivateLinkCard";
import { PublicProgressIndicator } from "@/components/ui/PublicProgressIndicator";
import { SummaryStatusTitle } from "@/components/ui/SummaryStatusTitle";
import { ManageBookingPanel } from "@/components/booking/ManageBookingPanel";
import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
import { createBlankServiceDraft, createEmptyStore } from "@/lib/store";
import type { BookingRecord } from "@/lib/types";
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

  it("explains what a running hold means and that the form survives a change", () => {
    const html = renderToStaticMarkup(
      <BookingHoldCountdownBar
        isExpired={false}
        remainingMs={9 * 60_000}
        remainingRatio={0.9}
        copy={getVerticalCopy("professional", "en")}
        lang="en"
      />,
    );

    expect(html).toContain("This time is yours for the next 10 minutes");
    // The reassurance now rides an info tooltip: still in the markup, so
    // assistive tech reads it, but hidden until the visitor asks for it.
    expect(html).toContain("Nobody else can book it while the timer runs");
    expect(html).toContain("Anything you have typed is kept.");
    expect(html).toContain('role="tooltip"');
    expect(html).toContain("What this hold means");
    // The step's action bar owns the only "Change" control; the only button
    // here is the tooltip's own trigger.
    expect(html).not.toContain("Change");
  });

  it("turns an expired hold into one-tap recovery instead of a dead end", () => {
    const html = renderToStaticMarkup(
      <BookingHoldCountdownBar
        isExpired
        remainingMs={0}
        remainingRatio={0}
        onRetryHold={() => undefined}
        onChooseAnother={() => undefined}
        copy={getVerticalCopy("professional", "en")}
        lang="en"
      />,
    );

    expect(html).toContain("The hold ran out");
    expect(html).toContain("Your details are saved.");
    expect(html).toContain("Hold this time again");
    expect(html).toContain("Choose another time");
    // The running-hold explanation must not linger once the hold is dead.
    expect(html).not.toContain("This time is yours for the next 10 minutes");
  });

  it("states the private link promise verbatim in both languages", () => {
    const english = renderToStaticMarkup(
      <PrivateLinkCard url="https://example.test/manage/abc" onCopy={() => undefined} />,
    );
    const spanish = renderToStaticMarkup(
      <PrivateLinkCard url="https://example.test/manage/abc" lang="es" />,
    );

    expect(english).toContain("Save this link");
    expect(english).toContain(
      "Save this link – you can reschedule or cancel anytime without an account",
    );
    expect(english).toContain("https://example.test/manage/abc");
    expect(english).toContain("Open private link");
    expect(spanish).toContain(
      "Guarde este enlace: puede reagendar o cancelar cuando quiera, sin crear una cuenta",
    );
  });

  it("shows booking status as a pill in the booking's own language", () => {
    expect(renderToStaticMarkup(<BookingStatusPill status="confirmed" />)).toContain(
      "Confirmed",
    );
    expect(
      renderToStaticMarkup(<BookingStatusPill status="rescheduled" lang="es" />),
    ).toContain("Actualizada");
    expect(renderToStaticMarkup(<BookingStatusPill status="cancelled" />)).toContain(
      "Cancelled",
    );
  });
});

const managedBooking: BookingRecord = {
  id: "booking-1234567890",
  serviceId: "service-1",
  serviceName: "Deep clean",
  bookingType: "appointment",
  dateKey: "2026-09-14",
  startTime: "10:00",
  endTime: "11:00",
  clientName: "Ana Ruiz",
  clientEmail: "ana@example.test",
  clientPhone: "555-0100",
  notes: "",
  clientNote: "",
  cost: "$80",
  status: "confirmed",
  createdAt: "2026-08-05T10:00:00.000Z",
  updatedAt: "2026-08-05T10:00:00.000Z",
  manageToken: "token-abc",
};

function renderManagePanel(overrides: Partial<BookingRecord> = {}, lang: "en" | "es" = "en") {
  return renderToStaticMarkup(
    <ManageBookingPanel
      booking={{ ...managedBooking, ...overrides }}
      providerName="Sparkle Studio"
      addresses={["12 Market Street"]}
      phones={["555-0199"]}
      costLabel="$80"
      manageUrl="https://example.test/manage/token-abc"
      copiedManageLink={false}
      onCopyManageLink={() => undefined}
      canReschedule
      onReschedule={() => undefined}
      onCancel={() => undefined}
      onAddToCalendar={() => undefined}
      onShowQr={() => undefined}
      noteDraft=""
      onNoteDraftChange={() => undefined}
      onSaveNote={() => undefined}
      isSavingNote={false}
      noteStatus="idle"
      savedNote=""
      bookAnotherAction={null}
      copy={getVerticalCopy("spaces", lang)}
      lang={lang}
      panelClass="panel"
      insetClass="inset"
    />,
  );
}

describe("private management page", () => {
  it("leads with status, then the booking, then what can be changed", () => {
    const html = renderManagePanel();

    expect(html).toContain("Your booking");
    expect(html).toContain("Confirmed");
    expect(html).toContain("You are booked in.");
    expect(html).toContain("Pick a new time");
    expect(html).toContain("Cancel booking");
    expect(html).toContain("Sparkle Studio");
    expect(html).toContain("12 Market Street");
  });

  it("offers the optional note and repeats the private-link promise", () => {
    const html = renderManagePanel({ clientNote: "Buzzer is broken" });

    expect(html).toContain("Note for the provider");
    expect(html).toContain("Save note");
    expect(html).toContain("Save this link");
    expect(html).toContain(
      "Save this link – you can reschedule or cancel anytime without an account",
    );
    expect(html).toContain("No account, no password");
  });

  it("shows an already-saved note back to the client", () => {
    const html = renderManagePanel({}, "en");
    expect(html).not.toContain("Your note");

    const withNote = renderToStaticMarkup(
      <ManageBookingPanel
        booking={managedBooking}
        providerName="Sparkle Studio"
        addresses={[]}
        phones={[]}
        costLabel=""
        manageUrl="https://example.test/manage/token-abc"
        copiedManageLink={false}
        onCopyManageLink={() => undefined}
        canReschedule
        onReschedule={() => undefined}
        onCancel={() => undefined}
        onAddToCalendar={() => undefined}
        onShowQr={() => undefined}
        noteDraft="Buzzer is broken"
        onNoteDraftChange={() => undefined}
        onSaveNote={() => undefined}
        isSavingNote={false}
        noteStatus="saved"
        savedNote="Buzzer is broken"
        bookAnotherAction={null}
        copy={getVerticalCopy("spaces", "en")}
        lang="en"
        panelClass="panel"
        insetClass="inset"
      />,
    );

    expect(withNote).toContain("Your note");
    expect(withNote).toContain("Buzzer is broken");
    expect(withNote).toContain("Note sent to the provider.");
  });

  it("drops the note box and keeps the record readable once cancelled", () => {
    const html = renderManagePanel({ status: "cancelled" }, "es");

    expect(html).toContain("Cancelada");
    expect(html).toContain("El horario quedó libre para otras personas.");
    expect(html).not.toContain("Nota para el proveedor");
  });
});

describe("owner language settings copy", () => {
  it("separates the client-facing setting from the owner's own workspace", () => {
    for (const lang of ["en", "es"] as const) {
      const { admin } = bookingTranslations[lang];
      expect(admin.clientLanguageLabel.length).toBeGreaterThan(0);
      expect(admin.dashboardLanguageLabel.length).toBeGreaterThan(0);
      expect(admin.clientLanguageLabel).not.toBe(admin.dashboardLanguageLabel);
      expect(admin.clientsSeeNotice).toContain("{language}");
    }
  });

  it("names the client language in the reader's own language", () => {
    expect(
      fillTemplate(bookingTranslations.en.admin.clientsSeeNotice, {
        language: bookingTranslations.en.language.spanish,
      }),
    ).toBe("Your clients see this page in Español.");

    expect(
      fillTemplate(bookingTranslations.es.admin.clientsSeeNotice, {
        language: bookingTranslations.es.language.english,
      }),
    ).toBe("Sus clientes ven esta página en English.");
  });
});
