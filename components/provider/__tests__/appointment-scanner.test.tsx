import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AppointmentScanner,
  AppointmentScanResult,
} from "@/components/provider/AppointmentScanner";
import type { BookingRecord } from "@/lib/types";

const booking: BookingRecord = {
  id: "booking-1",
  serviceId: "service-1",
  serviceName: "New patient consultation",
  bookingType: "appointment",
  dateKey: "2026-08-20",
  startTime: "09:00",
  endTime: "09:30",
  clientName: "Ana Rivera",
  clientEmail: "ana@example.com",
  clientPhone: "555-0100",
  notes: "Bring lab results",
  cost: "$95",
  status: "confirmed",
  createdAt: "2026-08-19T10:00:00.000Z",
  updatedAt: "2026-08-19T10:00:00.000Z",
  manageToken: "",
};

describe("appointment scanner", () => {
  it("offers camera scanning and image upload", () => {
    const html = renderToStaticMarkup(<AppointmentScanner lang="en" />);

    expect(html).toContain("<video");
    expect(html).toContain("Starting camera…");
    expect(html).toContain("Upload QR image");
    expect(html).toContain('accept="image/*"');
    // Focus lands on the hidden file input; its label shows the ring.
    expect(html).toMatch(/<label[^>]*has-\[:focus-visible\]:outline-2/);
  });

  it("sits in the page, not in a dialog", () => {
    const html = renderToStaticMarkup(<AppointmentScanner lang="es" />);

    expect(html).not.toContain("<dialog");
    // The shell's page heading already names the section.
    expect(html).not.toMatch(/<h[1-3]/);
    expect(html).toContain("Subir imagen QR");
  });

  it("shows facts admin needs to verify appointment", () => {
    const html = renderToStaticMarkup(<AppointmentScanResult booking={booking} lang="en" />);

    expect(html).toContain("Appointment found");
    expect(html).toContain("Ana Rivera");
    expect(html).toContain("New patient consultation");
    expect(html).toContain("ana@example.com");
    expect(html).toContain("555-0100");
    expect(html).toContain("Bring lab results");
    expect(html).toContain("Confirmed");
    expect(html).toContain("bg-app-success-soft");
  });

  it("uses Spanish scan-result labels", () => {
    const html = renderToStaticMarkup(<AppointmentScanResult booking={booking} lang="es" />);

    expect(html).toContain("Cita encontrada");
    expect(html).toContain("Confirmada");
  });
});
