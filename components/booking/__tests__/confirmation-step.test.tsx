import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RefinedBookingPass } from "@/components/booking/BookingPass";
import { BookingNotePanel } from "@/components/booking/BookingNotePanel";
import { BookingSuccessPanel } from "@/components/booking/BookingSuccessPanel";
import { SuccessActions } from "@/components/booking/SuccessActions";
import { PrivateLinkCard } from "@/components/ui/PrivateLinkCard";
import type { BookingRecord } from "@/lib/types";
import { getVerticalCopy } from "@/lib/vertical-copy";

const copy = getVerticalCopy("healthcare", "en");
const booking: BookingRecord = {
  id: "booking-9f2b54969bf14",
  serviceId: "s",
  serviceName: "New patient consultation",
  bookingType: "appointment",
  dateKey: "2026-10-01",
  startTime: "09:00",
  endTime: "09:30",
  clientName: "Jamie Rivera",
  clientEmail: "jamie@example.com",
  clientPhone: "+1 555 010 2030",
  notes: "",
  cost: "$95",
  status: "confirmed",
  createdAt: "2026-09-30T10:00:00.000Z",
  updatedAt: "2026-09-30T10:00:00.000Z",
  manageToken: "token",
};

function panel(props: Partial<Parameters<typeof BookingSuccessPanel>[0]> = {}, lang: "en" | "es" = "en") {
  return renderToStaticMarkup(
    <BookingSuccessPanel
      status="confirmed"
      clientName="Jamie Rivera"
      serviceName="New patient consultation"
      dateLabel="Thursday, October 1"
      timeLabel="9:00 AM"
      isEvents={false}
      statusLabel="Booking Confirmed"
      whatHappensNext="Bring your ID and arrive early."
      onAddToCalendar={() => undefined}
      onCopyLink={() => undefined}
      copy={getVerticalCopy("healthcare", lang)}
      lang={lang}
      {...props}
    />,
  );
}

describe("BookingSuccessPanel", () => {
  it("is a focusable status region that says it worked first", () => {
    const html = panel();

    expect(html).toContain('role="status"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain("Booking Confirmed");
    expect(html).toContain("You&#x27;re booked, Jamie.");
    expect(html).toContain("New patient consultation");
    expect(html).toContain("Thursday, October 1 at 9:00 AM");
  });

  it("greets by first name only, and drops the greeting with no name", () => {
    expect(panel({ clientName: "Test Patient" })).toContain("You&#x27;re booked, Test.");
    const anonymous = panel({ clientName: "  " });

    expect(anonymous).toContain("You&#x27;re booked.");
    expect(anonymous).not.toContain("booked, ");
  });

  it("says 'in' for events", () => {
    expect(panel({ isEvents: true })).toContain("You&#x27;re in, Jamie.");
    expect(panel({ isEvents: true, clientName: "" })).toContain("You&#x27;re in.");
  });

  it("states a full-day booking by its day, with no clock time", () => {
    const html = panel({ timeLabel: null });

    expect(html).toContain("on Thursday, October 1");
    expect(html).not.toContain(" at ");
  });

  it("offers the calendar and the private link, with a copied state", () => {
    expect(panel()).toContain("Add to calendar");
    expect(panel()).toContain("Copy private link");
    expect(panel({ copied: true })).toContain("Copied");
    expect(panel({ copied: true })).not.toContain("Copy private link");
  });

  it("leaves out the link button when there is no link, and the callout when empty", () => {
    const html = panel({ onCopyLink: undefined, whatHappensNext: "  " });

    expect(html).not.toContain("Copy private link");
    expect(html).not.toContain("What happens next");
    expect(panel()).toContain("What happens next");
    expect(panel()).toContain("Bring your ID and arrive early.");
  });

  it("does not greet or offer anything once cancelled", () => {
    const html = panel({ status: "cancelled", statusLabel: "Booking Cancelled" });

    expect(html).toContain("Booking Cancelled");
    expect(html).toContain("Your appointment was cancelled.");
    expect(html).not.toContain("booked");
    expect(html).not.toContain("Add to calendar");
    expect(html).not.toContain("What happens next");
    expect(html).toContain("line-through");
  });

  it("speaks Spanish", () => {
    const html = panel({}, "es");

    expect(html).toContain("Todo listo, Jamie.");
    expect(html).toContain("Copiar enlace privado");
    expect(html).toContain("Qué sigue");
  });
});

describe("RefinedBookingPass", () => {
  const pass = (
    over: Partial<Parameters<typeof RefinedBookingPass>[0]> = {},
    bookingOver: Partial<BookingRecord> = {},
  ) =>
    renderToStaticMarkup(
      <RefinedBookingPass
        booking={{ ...booking, ...bookingOver }}
        providerName="Rivera Family Medicine"
        serviceName="New patient consultation"
        typeBadge={{ label: "Appointment", tone: "primary" }}
        dateLabel="Thu, October 1, 2026"
        timeLabel="9:00 AM"
        isFullDay={false}
        durationLabel="30 min"
        clientFieldLabel="Patient"
        addresses={["245 West 29th Street, New York, NY"]}
        providerPhones={["+1 212 555 0142"]}
        category={{ label: "Specialty", value: "Family medicine" }}
        description="A first visit."
        bringLabel="Bring with you"
        notes="Bring a photo ID."
        costLabel="$95"
        admitLabel="1 patient"
        reference="B54969BF14"
        issuedLabel="Sep 30"
        qrDataUrl="data:image/png;base64,AAA"
        onOpenQr={() => undefined}
        onDownloadIcs={() => undefined}
        copy={copy}
        lang="en"
        {...over}
      />,
    );

  it("carries the header, the moment, the people and the prose", () => {
    const html = pass();

    for (const text of [
      "Rivera Family Medicine",
      "Appointment",
      "Thu, October 1, 2026",
      "9:00 AM",
      "30 min",
      "Patient",
      "Jamie Rivera",
      "jamie@example.com",
      "Where",
      "245 West 29th Street",
      "Family medicine",
      "About",
      "A first visit.",
      "Bring with you",
      "Bring a photo ID.",
      "$95",
    ]) {
      expect(html, text).toContain(text);
    }
    expect(html).toContain('href="tel:+12125550142"');
  });

  it("puts the QR, capacity, reference and the ics button on the stub", () => {
    const html = pass();

    expect(html).toContain("Show at check-in");
    expect(html).toContain("data:image/png;base64,AAA");
    expect(html).toContain("1 patient");
    expect(html).toContain("B54969BF14");
    expect(html).toContain("Sep 30");
    expect(html).toContain("Download .ics");
  });

  it("no longer carries the confirmation badge unless asked for it", () => {
    expect(pass()).not.toContain("Booking Confirmed");
    expect(pass({ confirmationLabel: "Booking Confirmed" })).toContain("Booking Confirmed");
  });

  it("shows a full-day booking as WHEN / Full day without a duplicate pill", () => {
    const html = pass({ isFullDay: true, timeLabel: "", durationLabel: "Full day" });

    expect(html).toContain("When");
    expect(html.match(/Full day/g)).toHaveLength(1);
  });

  it("hides what it does not have", () => {
    const html = pass({
      category: undefined,
      description: undefined,
      notes: undefined,
      costLabel: undefined,
      admitLabel: undefined,
      addresses: [],
      providerPhones: [],
    });

    for (const text of ["Specialty", "About", "Bring with you", "Total", "Where", "1 patient"]) {
      expect(html, text).not.toContain(text);
    }
  });

  it("uses the vertical's heading over the notes and shows the client's own", () => {
    const html = pass(
      { bringLabel: "Before you arrive", clientNotes: { label: "Patient notes", value: "Allergic." } },
      { notes: "Allergic." },
    );

    expect(html).toContain("Before you arrive");
    expect(html).toContain("Patient notes");
    expect(html).toContain("Allergic.");
  });

  it("voids a cancelled pass: struck through, rose, stamped, nothing to scan", () => {
    const html = pass({}, { status: "cancelled" });

    expect(html).toContain("line-through");
    expect(html).toContain("#e11d48");
    expect(html).toContain("Cancelled");
    expect(html).not.toContain("Download .ics");
    expect(html).not.toContain("data:image/png;base64,AAA");
  });
});

describe("PrivateLinkCard (refined)", () => {
  const url =
    "https://haab-calendar.vercel.app/doctors/dr-maya-rivera/manage/CFjeaQWERTYUIOPBkV";
  const html = renderToStaticMarkup(
    <PrivateLinkCard variant="refined" url={url} onCopy={() => undefined} bookingNoun="appointment" />,
  );

  it("names the link and says it once, with the vertical's noun", () => {
    expect(html).toContain("Your private link");
    expect(html).toContain("manage the appointment");
    expect(html).toContain("Copy link");
    expect(html).not.toContain(">Open<");
  });

  it("shortens in the middle, never to a bare protocol, and keeps the full url", () => {
    expect(html).toContain("…/dr-maya-rivera/manage/CFje…PBkV");
    expect(html).not.toMatch(/>https?:\/?</);
    // Copy uses the full address, even though the visible version is shortened.
    expect(html).toContain(`<span class="sr-only">${url}</span>`);
  });

  it("has no Open private link action in either card layout", () => {
    const classic = renderToStaticMarkup(<PrivateLinkCard url={url} onCopy={() => undefined} />);
    expect(classic).not.toContain("Open private link");
    expect(classic).not.toContain(`href="${url}"`);
  });
});

describe("BookingNotePanel", () => {
  const note = (savedNote = "", noteDraft = savedNote, status = "idle" as const) =>
    renderToStaticMarkup(
      <BookingNotePanel
        noteDraft={noteDraft}
        onNoteDraftChange={() => undefined}
        onSaveNote={() => undefined}
        isSavingNote={false}
        noteStatus={status}
        savedNote={savedNote}
      />,
    );

  it("lets the client add a note from the confirmation view", () => {
    const html = note("", "Please use the side entrance.");
    expect(html).toContain("Note for the provider");
    expect(html).toContain("Please use the side entrance.");
    expect(html).toContain("Save note");
    expect(html).not.toContain('disabled=""');
  });

  it("shows saved note after opening the link", () => {
    const html = note("Please use the side entrance.");
    expect(html).toContain("Your note");
    expect(html).toContain("Please use the side entrance.");
    expect(html).toContain('disabled=""');
  });
});

describe("SuccessActions", () => {
  const actions = (props: Partial<Parameters<typeof SuccessActions>[0]> = {}) =>
    renderToStaticMarkup(
      <SuccessActions
        canReschedule
        isCancelled={false}
        cancelLabel="Cancel appointment"
        onReschedule={() => undefined}
        onCancel={() => undefined}
        onBookAnother={() => undefined}
        {...props}
      />,
    );

  it("offers the three actions under the question", () => {
    const html = actions();

    for (const text of ["Need to change something?", "Reschedule", "Cancel appointment", "Book another"]) {
      expect(html, text).toContain(text);
    }
    expect(html).not.toContain('disabled=""');
  });

  it("uses a theme surface behind the question", () => {
    expect(actions()).toContain("bg-[var(--panel-tint-75)]");
  });

  it("hides Reschedule for services that cannot be moved", () => {
    expect(actions({ canReschedule: false })).not.toContain("Reschedule");
  });

  it("disables the two changes once cancelled and lets booking again lead", () => {
    const html = actions({ isCancelled: true });

    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html).toContain("Book another");
    expect(html).toContain("var(--primary)");
  });

  it("links back to the booking page for a manage-token visitor", () => {
    const html = actions({ bookAnotherHref: "/doctors/dr-maya-rivera" });

    expect(html).toContain('href="/doctors/dr-maya-rivera"');
    expect(html).toContain("Book another");
  });
});
