import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChangeBusinessTypeDialog } from "@/components/provider/ChangeBusinessTypeDialog";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { translations as landingTranslations } from "@/components/landing/translations";
import type { BookingRecord } from "@/lib/types";

const copy = dashboardCopy.en.businessType;
const verticals = landingTranslations.en.home.verticals;
const noop = () => undefined;

const upcoming: BookingRecord = {
  id: "b1",
  serviceId: "s1",
  serviceName: "Strategy session",
  bookingType: "appointment",
  dateKey: "2026-10-20",
  startTime: "10:00",
  endTime: "11:00",
  clientName: "Ana Ruiz",
  clientEmail: "ana@example.com",
  clientPhone: "",
  notes: "",
  cost: "",
  status: "confirmed",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  manageToken: "t",
};

function render(props: Partial<Parameters<typeof ChangeBusinessTypeDialog>[0]> = {}) {
  return renderToStaticMarkup(
    <ChangeBusinessTypeDialog
      lang="en"
      currentVertical="professional"
      slug="acme"
      summary={{ services: 3, openDays: 5, hasDailyLimit: true }}
      blocking={{ bookings: [], activeHolds: 0 }}
      onCancel={noop}
      onGoToBookings={noop}
      onContinue={noop}
      {...props}
    />,
  );
}

describe("ChangeBusinessTypeDialog", () => {
  it("is a labelled modal dialog", () => {
    const html = render();

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toMatch(/aria-labelledby="[^"]+"/);
  });

  it("offers every other business type, not the current one", () => {
    const html = render();

    expect(html).toContain(copy.pickTitle);
    for (const id of ["healthcare", "spaces", "events", "restaurant"] as const) {
      expect(html).toContain(verticals[id].label);
    }
    expect(html).not.toContain(verticals.professional.label);
  });

  it("explains what is replaced, what stays and where the link moves", () => {
    const html = render({ initialVertical: "healthcare" });

    expect(html).toContain(copy.replacedTitle);
    expect(html).toContain("Your 3 services");
    expect(html).toContain(copy.staysTitle);
    for (const item of copy.stays) {
      expect(html).toContain(item);
    }
    expect(html).toContain("/professionals/acme");
    expect(html).toContain("/doctors/acme");
    expect(html).toContain(copy.notCarried);
  });

  it("counts one service in the singular", () => {
    const html = render({
      initialVertical: "healthcare",
      summary: { services: 1, openDays: 5, hasDailyLimit: false },
    });

    expect(html).toContain("Your 1 service,");
  });

  it("asks for an acknowledgement before continuing", () => {
    const html = render({ initialVertical: "healthcare" });

    expect(html).toContain(copy.acknowledge);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Continue<\/button>/);
  });

  it("stops at upcoming bookings, listing them, before any type is picked", () => {
    const html = render({ blocking: { bookings: [upcoming], activeHolds: 0 } });

    expect(html).toContain(copy.blockedTitle);
    expect(html).toContain("You have 1 upcoming booking.");
    expect(html).toContain("Ana Ruiz");
    expect(html).toContain("Strategy session");
    expect(html).toContain(copy.goToBookings);
    expect(html).not.toContain(copy.pickTitle);
  });

  it("stops while someone is mid-booking", () => {
    const html = render({ blocking: { bookings: [], activeHolds: 2 } });

    expect(html).toContain(copy.blockedHolds);
    expect(html).not.toContain(copy.pickTitle);
  });

  it("speaks the owner's workspace language", () => {
    const html = render({ lang: "es", initialVertical: "spaces" });

    expect(html).toContain(dashboardCopy.es.businessType.replacedTitle);
    expect(html).not.toContain(copy.replacedTitle);
  });
});
