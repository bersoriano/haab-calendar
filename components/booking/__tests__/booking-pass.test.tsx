import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BookingPass } from "@/components/booking/BookingPass";
import type { BookingRecord } from "@/lib/types";
import { getVerticalCopy } from "@/lib/vertical-copy";

const booking: BookingRecord = {
  id: "booking-9f2b54969bf14",
  serviceId: "service-1",
  serviceName: "New patient consultation",
  bookingType: "appointment",
  dateKey: "2026-08-06",
  startTime: "16:30",
  endTime: "17:00",
  clientName: "Ana Test",
  clientEmail: "ana@example.test",
  clientPhone: "555-0100",
  notes: "",
  cost: "$95",
  status: "confirmed",
  createdAt: "2026-08-06T10:00:00.000Z",
  updatedAt: "2026-08-06T10:00:00.000Z",
  manageToken: "token",
};

function renderPass(overrides: Partial<BookingRecord> = {}, extra: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    <BookingPass
      booking={{ ...booking, ...overrides }}
      providerName="Rivera Family Medicine"
      serviceName="New patient consultation"
      dateLabel="Thursday, August 6, 2026"
      timeLabel="4:30 PM"
      isFullDay={false}
      durationLabel="30 min"
      clientFieldLabel="Patient"
      costLabel="$95"
      admitLabel="1 patient"
      reference="B54969BF14"
      issuedLabel="Aug 6"
      qrDataUrl="data:image/png;base64,AAA"
      onOpenQr={() => undefined}
      details={[
        { label: "Location", value: "245 West 29th Street, New York, NY" },
        { label: "Specialty", value: "Family medicine" },
        { label: "Contact", value: "+1 212 555 0142" },
        { label: "Patient email", value: "ana@example.test" },
        { label: "Description", value: "A first visit.", prose: true },
      ]}
      copy={getVerticalCopy("healthcare", "en")}
      lang="en"
      {...extra}
    />,
  );
}

describe("booking pass", () => {
  it("leads with the appointment time and the fields checked at the door", () => {
    const html = renderPass();

    expect(html).toContain("Appointment Receipt");
    expect(html).toContain("Rivera Family Medicine");
    // Date and time are a matched pair, both labelled and both at headline size.
    expect(html).toContain("Date");
    expect(html).toContain("Thursday, August 6, 2026");
    expect(html).toContain("Time");
    expect(html).toContain("4:30 PM");
    expect(html).toContain("30 min");
    // The end time is not something anyone needs off the receipt.
    expect(html).not.toContain("5:00 PM");
    expect(html).toContain("Patient");
    expect(html).toContain("Ana Test");
    expect(html).toContain("245 West 29th Street, New York, NY");
    expect(html).toContain("$95");
  });

  it("puts the reference, issue date, and QR on the tear-off stub", () => {
    const html = renderPass();
    const stub = html.slice(html.indexOf("1 patient"));

    expect(stub).toContain("B54969BF14");
    expect(stub).toContain("Aug 6");
    expect(stub).toContain("data:image/png;base64,AAA");
    // The calendar action lives above the pass now, promoted next to the
    // private link, so the stub carries the QR and the reference only.
    expect(stub).not.toContain("Add to calendar");
  });

  it("swaps the time for the full-day label when there is no clock time", () => {
    const html = renderPass(
      { startTime: undefined, endTime: undefined },
      { isFullDay: true, timeLabel: "", durationLabel: "Full day" },
    );

    expect(html).toContain("Full day");
    expect(html).not.toContain("Time<");
  });

  it("voids the pass when the booking is cancelled", () => {
    const html = renderPass({ status: "cancelled" });

    expect(html).toContain("line-through");
    expect(html).toContain("Cancelled");
    // A dead pass offers no calendar file and no QR to scan.
    expect(html).not.toContain("Add to calendar");
    expect(html).not.toContain("data:image/png;base64,AAA");
  });

  it("keeps the ticket voice in Spanish", () => {
    const html = renderToStaticMarkup(
      <BookingPass
        booking={booking}
        providerName="Rivera Family Medicine"
        serviceName="Consulta para pacientes nuevos"
        dateLabel="jueves, 6 de agosto de 2026"
        timeLabel="16:30"
        isFullDay={false}
        durationLabel="30 min"
        clientFieldLabel="Paciente"
        reference="B54969BF14"
        issuedLabel="6 ago"
        onOpenQr={() => undefined}
        details={[]}
        copy={getVerticalCopy("healthcare", "es")}
        lang="es"
      />,
    );

    expect(html).toContain("Confirmación de cita");
    expect(html).toContain("Fecha");
    expect(html).toContain("Horario");
    expect(html).toContain("Referencia");
    expect(html).toContain("Emitido");
  });

  it("renders every remaining field as a pass cell, not a separate block", () => {
    const html = renderPass();

    expect(html).toContain("Specialty");
    expect(html).toContain("Family medicine");
    expect(html).toContain("Contact");
    expect(html).toContain("+1 212 555 0142");
    expect(html).toContain("Patient email");
    expect(html).toContain("A first visit.");
    // No section headings: the ticket is one document.
    expect(html).not.toContain("Appointment details");
    expect(html).not.toContain("Customer details");
  });

  it("renders the pass alone when there are no further fields", () => {
    const html = renderPass({}, { details: [] });

    expect(html).toContain("4:30 PM");
    expect(html).not.toContain("Specialty");
  });
});

describe("what happens next", () => {
  it("sits with the provider and service names, above the booked facts", () => {
    const html = renderPass({}, { whatHappensNext: "Bring your ID and arrive early." });
    const beforeDate = html.slice(0, html.indexOf("Date"));

    expect(beforeDate).toContain("Bring your ID and arrive early.");
  });

  it("is left out of a cancelled pass", () => {
    const html = renderPass(
      { status: "cancelled" },
      { whatHappensNext: "Bring your ID and arrive early." },
    );

    expect(html).not.toContain("Bring your ID and arrive early.");
  });
});
