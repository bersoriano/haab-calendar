import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { CancelBookingDialog } from "@/components/provider/CancelBookingDialog";
import { RescheduleBookingDialog, type RescheduleDay } from "@/components/provider/RescheduleBookingDialog";
import { getVerticalCopy } from "@/lib/vertical-copy";

const noop = () => undefined;
const es = bookingTranslations.es;

describe("CancelBookingDialog", () => {
  const copy = getVerticalCopy("healthcare", "es");
  const html = renderToStaticMarkup(
    <CancelBookingDialog
      open
      lang="es"
      copy={copy}
      serviceName="Consulta"
      clientName="Ana Ruiz"
      whenLabel="12 oct · 10:00"
      pending={false}
      onConfirm={noop}
      onKeep={noop}
    />,
  );

  it("is a native dialog titled by the vertical's cancel wording", () => {
    expect(html).toMatch(/^<dialog/);
    expect(html).toContain(copy.cancelBooking);
  });

  it("describes which booking it cancels", () => {
    const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(describedBy).toBeTruthy();
    expect(html).toMatch(new RegExp(`id="${describedBy}"[\\s\\S]*Consulta · Ana Ruiz · 12 oct · 10:00`));
  });

  it("speaks the workspace language on both actions", () => {
    expect(html).toContain(`>${copy.phrases.keepBookingButton}<`);
    expect(html).toContain(`>${es.manage.confirmCancellation}<`);
  });

  it("shows a failure inside the dialog", () => {
    const failed = renderToStaticMarkup(
      <CancelBookingDialog
        open
        lang="es"
        copy={copy}
        serviceName="Consulta"
        clientName="Ana"
        whenLabel="hoy"
        pending={false}
        error="No se pudo cancelar."
        onConfirm={noop}
        onKeep={noop}
      />,
    );
    expect(failed).toContain('role="alert"');
    expect(failed).toContain("No se pudo cancelar.");
  });
});

function day(dateKey: string, overrides: Partial<RescheduleDay> = {}): RescheduleDay {
  return { dateKey, dayOfMonth: Number(dateKey.slice(-2)), inMonth: true, available: false, selected: false, ...overrides };
}

function reschedule(overrides: Partial<Parameters<typeof RescheduleBookingDialog>[0]> = {}) {
  return renderToStaticMarkup(
    <RescheduleBookingDialog
      open
      lang="en"
      copy={getVerticalCopy("healthcare", "en")}
      serviceName="Checkup"
      clientName="Ana Ruiz"
      appointment
      windowLabel="Oct 9 - Nov 5"
      weekdayLabels={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}
      weeks={[[day("2026-10-11"), day("2026-10-12", { available: true, selected: true }), day("2026-10-13", { available: true })]]}
      selectedDateLabel="Oct 12"
      slots={[
        { value: "09:00", label: "9:00 AM", selected: false },
        { value: "09:30", label: "9:30 AM", selected: true },
      ]}
      pending={false}
      canSave
      onToday={noop}
      onSelectDay={noop}
      onSelectSlot={noop}
      onSave={noop}
      onClose={noop}
      {...overrides}
    />,
  );
}

describe("RescheduleBookingDialog", () => {
  it("marks the chosen day and slot and disables closed days", () => {
    const html = reschedule();
    expect(html).toMatch(/data-date="2026-10-12"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-date="2026-10-12"/);
    expect(html).toMatch(/<button[^>]*data-date="2026-10-11"[^>]*disabled=""/);
    expect(html).toMatch(/<button[^>]*aria-pressed="true"[^>]*>9:30 AM<\/button>/);
  });

  it("only saves once there is something to save", () => {
    const blocked = reschedule({ canSave: false });
    expect(blocked).toMatch(/<button[^>]*disabled=""[^>]*>[^<]*Save new time/);
  });

  it("explains a full-day move instead of offering slots", () => {
    const html = reschedule({ appointment: false, slots: [] });
    expect(html).toContain(bookingTranslations.en.manage.newDayFreeReplaceHelper);
    expect(html).not.toContain("9:30 AM");
  });

  it("says when a day has no free slots", () => {
    expect(reschedule({ slots: [] })).toContain(bookingTranslations.en.manage.noSlotsOnDateHelper);
  });
});
