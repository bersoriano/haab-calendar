import { describe, it, expect } from "vitest";
import { buildIcsContent, escapeIcsText } from "@/lib/ics";
import type { BookingRecord, ProviderInfo } from "@/lib/types";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const provider: ProviderInfo = {
  fullName: "Dr. Alice",
  businessName: "Alice Wellness",
  email: "alice@wellness.example",
  phoneNumber1: "",
  phoneNumber2: "",
  address1: "",
  address2: "",
  publicSlug: "alice-wellness",
  language: "en",
  timezone: "America/New_York",
};

function makeAppointmentBooking(overrides: Partial<BookingRecord> = {}): BookingRecord {
  return {
    id: "bk_appt_1",
    serviceId: "svc_1",
    serviceName: "Consultation",
    bookingType: "appointment",
    dateKey: "2026-07-15",
    startTime: "10:00",
    endTime: "10:30",
    clientName: "Bob Smith",
    clientEmail: "bob@example.com",
    clientPhone: "555-1234",
    notes: "First visit",
    cost: "50",
    status: "confirmed",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    manageToken: "tok_abc",
    ...overrides,
  };
}

function makeFullDayBooking(overrides: Partial<BookingRecord> = {}): BookingRecord {
  return {
    id: "bk_full_1",
    serviceId: "svc_2",
    serviceName: "Full Day Workshop",
    bookingType: "full-day",
    dateKey: "2026-07-20",
    clientName: "Carol Jones",
    clientEmail: "carol@example.com",
    clientPhone: "555-5678",
    notes: "",
    cost: "200",
    status: "confirmed",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    manageToken: "tok_def",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// escapeIcsText
// ---------------------------------------------------------------------------

describe("escapeIcsText", () => {
  it("escapes commas", () => {
    expect(escapeIcsText("a,b")).toBe("a\\,b");
  });

  it("escapes semicolons", () => {
    expect(escapeIcsText("a;b")).toBe("a\\;b");
  });

  it("escapes newlines", () => {
    expect(escapeIcsText("line1\nline2")).toBe("line1\\nline2");
  });

  it("escapes backslashes first (to avoid double-escaping)", () => {
    expect(escapeIcsText("a\\b")).toBe("a\\\\b");
  });

  it("escapes multiple special chars in one string", () => {
    const result = escapeIcsText("hello, world; test\nnewline");
    expect(result).toBe("hello\\, world\\; test\\nnewline");
  });

  it("returns plain text unchanged", () => {
    expect(escapeIcsText("hello world")).toBe("hello world");
  });
});

// ---------------------------------------------------------------------------
// buildIcsContent — appointment booking
// ---------------------------------------------------------------------------

describe("buildIcsContent — appointment booking", () => {
  const ics = buildIcsContent(
    makeAppointmentBooking(),
    provider,
    "https://example.com/manage/tok_abc",
  );

  it("contains BEGIN:VCALENDAR", () => {
    expect(ics).toContain("BEGIN:VCALENDAR");
  });

  it("contains END:VCALENDAR", () => {
    expect(ics).toContain("END:VCALENDAR");
  });

  it("contains BEGIN:VEVENT / END:VEVENT", () => {
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
  });

  it("contains SUMMARY: with service name", () => {
    expect(ics).toContain("SUMMARY:Consultation");
  });

  // 10:00 in New York on a July date is 14:00 UTC. Emitting the instant rather
  // than a floating "10:00" is what stops the invite from landing at 10:00
  // wherever the client happens to open it.
  it("anchors DTSTART to the provider's zone as a UTC instant", () => {
    expect(ics).toContain("DTSTART:20260715T140000Z");
  });

  it("anchors DTEND to the provider's zone as a UTC instant", () => {
    expect(ics).toContain("DTEND:20260715T143000Z");
  });

  it("leaves times floating when the provider has no zone set", () => {
    const floating = buildIcsContent(
      makeAppointmentBooking(),
      { ...provider, timezone: "" },
      "https://example.com/manage/tok_abc",
    );

    expect(floating).toContain("DTSTART:20260715T100000");
    expect(floating).not.toContain("DTSTART:20260715T100000Z");
  });

  it("does NOT use VALUE=DATE for appointment", () => {
    expect(ics).not.toContain("VALUE=DATE");
  });

  it("contains ORGANIZER with provider email", () => {
    expect(ics).toContain("ORGANIZER:MAILTO:alice@wellness.example");
  });

  it("contains URL with manage URL", () => {
    expect(ics).toContain("URL:https://example.com/manage/tok_abc");
  });

  it("contains VERSION:2.0", () => {
    expect(ics).toContain("VERSION:2.0");
  });
});

// ---------------------------------------------------------------------------
// buildIcsContent — full-day booking
// ---------------------------------------------------------------------------

describe("buildIcsContent — full-day booking", () => {
  const ics = buildIcsContent(makeFullDayBooking(), provider, "");

  it("contains DTSTART;VALUE=DATE", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20260720");
  });

  it("contains DTEND;VALUE=DATE pointing to next day", () => {
    // next day after 2026-07-20 is 2026-07-21
    expect(ics).toContain("DTEND;VALUE=DATE:20260721");
  });

  it("does NOT include URL line when manageUrl is empty", () => {
    expect(ics).not.toContain("URL:");
  });

  it("contains SUMMARY: with service name", () => {
    expect(ics).toContain("SUMMARY:Full Day Workshop");
  });

  it("contains BEGIN:VCALENDAR", () => {
    expect(ics).toContain("BEGIN:VCALENDAR");
  });
});

// ---------------------------------------------------------------------------
// buildIcsContent — SUMMARY escaping
// ---------------------------------------------------------------------------

describe("buildIcsContent — SUMMARY escaping", () => {
  it("escapes commas in the service name", () => {
    const booking = makeAppointmentBooking({ serviceName: "Design, Review" });
    const ics = buildIcsContent(booking, provider, "");
    expect(ics).toContain("SUMMARY:Design\\, Review");
  });
});

describe("buildIcsContent — Spanish confirmation export", () => {
  const ics = buildIcsContent(
    makeAppointmentBooking({
      serviceName: "Consulta de seguimiento",
      notes: "Traer resultados",
    }),
    provider,
    "https://example.com/manage/tok_abc?lang=es",
    "es",
  );

  it("localizes attendee details and the manage instruction", () => {
    expect(ics).toContain("SUMMARY:Consulta de seguimiento");
    expect(ics).toContain("Cliente: Bob Smith");
    expect(ics).toContain("Teléfono: 555-1234");
    expect(ics).toContain("Notas: Traer resultados");
    expect(ics).toContain("Gestionar esta reserva:");
    expect(ics).toContain("Booking Module//ES");
  });
});

describe("party size in the calendar entry", () => {
  it("names the guest count above the notes", () => {
    const ics = buildIcsContent(
      makeAppointmentBooking({ serviceName: "Dinner table", partySize: 4 }),
      provider,
      "",
    );

    expect(ics).toContain("Guests: 4");
    expect(ics.indexOf("Guests: 4")).toBeLessThan(ics.indexOf("Notes:"));
  });

  it("says it in Spanish", () => {
    const ics = buildIcsContent(
      makeAppointmentBooking({ partySize: 2 }),
      provider,
      "",
      "es",
    );

    expect(ics).toContain("Comensales: 2");
  });

  it("leaves the line out when the booking has no party", () => {
    const ics = buildIcsContent(makeAppointmentBooking(), provider, "");

    expect(ics).not.toContain("Guests:");
  });
});
