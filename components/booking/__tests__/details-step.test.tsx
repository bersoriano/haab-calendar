import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppointmentAbout } from "@/components/booking/AppointmentAbout";
import {
  AppointmentSummary,
  CompactAppointmentSummary,
  MobileConfirmBar,
  type SummaryFooter,
} from "@/components/booking/AppointmentSummary";
import { DetailsForm } from "@/components/booking/DetailsForm";
import { getSummaryClientRows } from "@/lib/details-summary";
import type { Service } from "@/lib/types";
import { getVerticalCopy } from "@/lib/vertical-copy";

const copy = getVerticalCopy("healthcare", "en");
const empty = { clientName: "", clientEmail: "", clientPhone: "", partySize: "", notes: "" };
const labels = {
  name: "Full name",
  email: "Email",
  phone: "Phone number",
  partySize: "Guests",
  notes: "Notes",
};

const footer: SummaryFooter = {
  primaryLabel: "Confirm appointment",
  onPrimary: () => undefined,
  primaryDisabled: false,
  isExpired: false,
  heldText: "Held for you · 9:57 left",
  error: null,
  errorId: "booking-error",
  chooseAnotherLabel: "Choose another time",
  changeDateTimeLabel: "Change date/time",
  onChooseAnother: () => undefined,
};

const date = {
  tile: { month: "OCT", day: "1", weekday: "THU" },
  label: "Thursday, October 1, 2026",
  timeLine: "9:00 – 9:30 AM · 30 min",
  timeShort: "9:00 – 9:30 AM",
};

const service: Service = {
  id: "s",
  name: "New patient consultation",
  bookingType: "appointment",
  durationMinutes: 30,
  description: "A first visit.",
  medicalSpecialty: "Family medicine",
  capacity: "1 patient",
  cost: "$95",
  notes: "Bring a photo ID.",
};

function summary(
  overrides: Partial<Parameters<typeof AppointmentSummary>[0]> = {},
  rowValues = empty,
) {
  return renderToStaticMarkup(
    <AppointmentSummary
      title="Appointment summary"
      serviceName="New patient consultation"
      meta="Family medicine · Rivera Family Medicine"
      date={date}
      changeLabel="Change date/time"
      onChangeDateTime={() => undefined}
      clientTitle="Patient"
      rows={getSummaryClientRows({ values: rowValues, requiresPartySize: false, labels })}
      cost="$95"
      footer={footer}
      lang="en"
      {...overrides}
    />,
  );
}

describe("DetailsForm", () => {
  const render = (props = {}) =>
    renderToStaticMarkup(
      <DetailsForm
        values={empty}
        onChange={() => undefined}
        showPartySize={false}
        invalidRequired={false}
        errorId="booking-error"
        copy={copy}
        lang="en"
        {...props}
      />,
    );

  it("gives every input a real label and the right autocomplete", () => {
    const html = render();

    for (const field of ["clientName", "clientPhone", "clientEmail", "notes"]) {
      const id = html.match(new RegExp(`id="([^"]*-${field})"`))?.[1];
      expect(id, field).toBeTruthy();
      expect(html).toContain(`for="${id}"`);
    }
    expect(html).toContain('autoComplete="name"');
    expect(html).toContain('autoComplete="tel"');
    expect(html).toContain('inputMode="tel"');
    expect(html).toContain('autoComplete="email"');
  });

  it("marks notes optional and reassures in the page language", () => {
    const html = render();

    expect(html).toContain("(optional)");
    expect(html).toContain("No account, no password.");
    expect(renderToStaticMarkup(
      <DetailsForm values={empty} onChange={() => undefined} showPartySize={false}
        invalidRequired={false} errorId="e" copy={getVerticalCopy("healthcare", "es")} lang="es" />,
    )).toContain("Sin cuenta ni contraseña.");
  });

  it("asks for a party size only when the service seats guests", () => {
    expect(render()).not.toContain("inputMode=\"numeric\"");
    expect(render({ showPartySize: true })).toContain('inputMode="numeric"');
  });

  it("flags only the empty required fields once confirming was refused", () => {
    const html = render({
      invalidRequired: true,
      values: { ...empty, clientName: "Jamie" },
    });

    expect(html.match(/aria-invalid="true"/g)).toHaveLength(2);
    expect(html).toContain('aria-describedby="booking-error"');
    expect(render()).not.toContain("aria-invalid");
  });
});

describe("AppointmentSummary", () => {
  it("shows one row per field with the status the data implies", () => {
    const html = summary({}, { ...empty, clientName: "Jamie Rivera" });

    expect(html).toContain("Jamie Rivera");
    expect(html).toContain("Add your email");
    expect(html).toContain("Add your phone number");
    expect(html).toContain("No notes");
    expect(html).not.toContain("Not entered yet");
  });

  it("uses the vertical's client word and hides a missing price", () => {
    const html = summary({ clientTitle: "Guest", cost: null });

    expect(html).toContain("Guest");
    expect(html).not.toContain("Total");
  });

  it("renders the date block for a timed, a full-day and a no-date booking", () => {
    expect(summary()).toContain("9:00 – 9:30 AM · 30 min");
    expect(summary({ date: { ...date, timeLine: "Full day", timeShort: "Full day" } })).toContain(
      "Full day",
    );
    expect(summary({ date: null })).not.toContain("OCT");
  });

  it("hides the change link when there is no date to change", () => {
    expect(
      summary({ onChangeDateTime: null, footer: { ...footer, changeDateTimeLabel: null } }),
    ).not.toContain("Change date/time");
  });

  it("offers Change date/time right beside the confirm button", () => {
    const html = summary({ onChangeDateTime: null });
    const back = html.indexOf("Change date/time");

    expect(back).toBeGreaterThan(-1);
    expect(back).toBeLessThan(html.indexOf("Confirm appointment"));
  });

  it("puts the alert above the confirm button, never in a header", () => {
    const html = summary({ footer: { ...footer, error: "Patient name is required." } });

    expect(html).toContain('role="alert"');
    expect(html.indexOf('role="alert"')).toBeLessThan(html.indexOf("Confirm appointment"));
  });

  it("swaps the hold line for a way out once the hold has run out", () => {
    const html = summary({
      footer: { ...footer, isExpired: true, heldText: null, primaryLabel: "Hold this time again" },
    });

    expect(html).toContain("Hold this time again");
    expect(html).toContain("Choose another time");
    expect(html).not.toContain("Held for you");
    expect(html.indexOf("Change date/time")).toBe(html.lastIndexOf("Change date/time"));
  });
});

describe("CompactAppointmentSummary and MobileConfirmBar", () => {
  it("shows the short time and the price, without the length", () => {
    const html = renderToStaticMarkup(
      <CompactAppointmentSummary
        title="Appointment summary"
        serviceName="New patient consultation"
        date={date}
        changeLabel="Change date/time"
        onChangeDateTime={() => undefined}
        cost="$95"
      />,
    );

    expect(html).toContain("9:00 – 9:30 AM");
    expect(html).not.toContain("30 min");
    expect(html).toContain("$95");
  });

  it("carries the total, the alert and the hold line above the change and confirm buttons", () => {
    const html = renderToStaticMarkup(
      <MobileConfirmBar
        total="$95"
        totalLabel="Total"
        footer={{ ...footer, error: "Something is missing." }}
      />,
    );

    expect(html).toContain("$95");
    expect(html).toContain("Held for you · 9:57 left");
    expect(html).toContain('role="alert"');
    expect(html.match(/<button/g)).toHaveLength(2);
    expect(html.indexOf("Change date/time")).toBeLessThan(html.indexOf("Confirm appointment"));
    expect(html).toContain("safe-area-inset-bottom");
  });

  it("keeps only the confirm button for a fixed-date event or an expired hold", () => {
    for (const bar of [
      { ...footer, changeDateTimeLabel: null },
      { ...footer, isExpired: true, heldText: null },
    ]) {
      const html = renderToStaticMarkup(<MobileConfirmBar total="$95" totalLabel="Total" footer={bar} />);
      expect(html).not.toContain("Change date/time");
    }
  });

  it("drops the total when there is no price", () => {
    expect(
      renderToStaticMarkup(<MobileConfirmBar total={null} totalLabel="Total" footer={footer} />),
    ).not.toContain("Total");
  });
});

describe("AppointmentAbout", () => {
  const render = (overrides: Partial<Service> = {}, props = {}) =>
    renderToStaticMarkup(
      <AppointmentAbout
        service={{ ...service, ...overrides }}
        vertical="healthcare"
        isEvent={false}
        isSingle={false}
        singleDateLabel=""
        addresses={["245 West 29th Street"]}
        phones={["+1 212 555 0142"]}
        copy={copy}
        lang="en"
        {...props}
      />,
    );

  it("lays out the four facts, the callout and a tel: link", () => {
    const html = render();

    for (const word of ["Appointment", "Family medicine", "30 min", "1 patient"]) {
      expect(html).toContain(word);
    }
    expect(html).toContain("Before your visit:");
    expect(html).toContain('href="tel:+12125550142"');
  });

  it("hides what the service does not have", () => {
    const html = render(
      { notes: undefined, medicalSpecialty: undefined, capacity: undefined },
      { addresses: [], phones: [] },
    );

    expect(html).not.toContain("Before your visit");
    expect(html).not.toContain("Specialty");
    expect(html).not.toContain("Capacity");
    expect(html).not.toContain("Location");
    expect(html).not.toContain("tel:");
  });

  it("folds away in the compact summary and stays open in the full one", () => {
    const folded = render({}, { collapsible: true });
    expect(folded).toContain("<details");
    expect(folded).not.toMatch(/<details[^>]*open/);
    expect(render()).not.toContain("<details");
  });

  it("sits under the client rows and above the total in the summary", () => {
    const html = summary({ about: <p>About section</p> });
    expect(html.indexOf("About section")).toBeGreaterThan(html.indexOf("Patient"));
    expect(html.indexOf("About section")).toBeLessThan(html.indexOf("$95"));
  });

  it("closes the compact summary card on a phone", () => {
    const html = renderToStaticMarkup(
      <CompactAppointmentSummary
        title="Appointment summary"
        serviceName="New patient consultation"
        date={date}
        changeLabel="Change date/time"
        onChangeDateTime={() => undefined}
        about={<p>About section</p>}
        cost="$95"
      />,
    );
    expect(html.indexOf("About section")).toBeGreaterThan(html.indexOf("$95"));
  });

  it("names a fixed-date event by when, not by length", () => {
    const html = render({ bookingType: "full-day", occurrenceMode: "single" }, {
      isEvent: true,
      isSingle: true,
      singleDateLabel: "Saturday, October 3",
      vertical: "events",
    });

    expect(html).toContain("When");
    expect(html).toContain("Saturday, October 3");
    expect(html).not.toContain("Length");
  });
});
