import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ServiceCard } from "@/components/booking/ServiceCard";
import type { Service, VerticalId } from "@/lib/types";
import { getVerticalCopy } from "@/lib/vertical-copy";

const service: Service = {
  id: "s1",
  name: "New patient consultation",
  bookingType: "appointment",
  durationMinutes: 30,
  description: "A comprehensive first visit.",
  medicalSpecialty: "Family medicine",
  capacity: "1 patient",
  cost: "$95",
  notes: "Please bring a photo ID.",
};

function render(
  overrides: Partial<Service> = {},
  vertical: VerticalId = "healthcare",
  props: Partial<Parameters<typeof ServiceCard>[0]> = {},
  lang: "en" | "es" = "en",
) {
  return renderToStaticMarkup(
    <ServiceCard
      service={{ ...service, ...overrides }}
      index={0}
      vertical={vertical}
      copy={getVerticalCopy(vertical, lang)}
      lang={lang}
      onSelect={() => undefined}
      {...props}
    />,
  );
}

describe("ServiceCard", () => {
  it("is one button with no nested button", () => {
    const html = render();

    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain("Choose a time");
  });

  it("puts the price on the name's row, in the same type", () => {
    const html = render();
    const classOf = (text: string) =>
      html.match(new RegExp(`class="([^"]*)"[^>]*>${text}<`))?.[1] ?? "";
    const shared = (cls: string) =>
      cls.split(" ").filter((c) => c.startsWith("text-[") || c.startsWith("sm:text-[") || c.startsWith("font-"));

    expect(classOf("\\$95")).not.toBe("");
    expect(shared(classOf("\\$95")).sort()).toEqual(shared(classOf("New patient consultation")).sort());
    expect(classOf("\\$95")).toContain("shrink-0");
  });

  it("names the vertical's client word and the callout label", () => {
    const html = render();

    expect(html).toContain("1 patient");
    expect(html).toContain("Before your visit:");
    expect(html).toContain("Please bring a photo ID.");
  });

  it("hides every element whose data is missing", () => {
    const html = render({
      cost: undefined,
      notes: undefined,
      description: "",
      medicalSpecialty: undefined,
      capacity: undefined,
      durationMinutes: undefined,
    });

    expect(html).not.toContain("$95");
    expect(html).not.toContain("Before your visit");
    expect(html).not.toContain("Family medicine");
    expect(html).not.toContain("1 patient");
    expect(html).not.toContain(" min<");
    expect(html).not.toContain("<span class=\"block");
    expect(html).toContain("Appointment");
  });

  it("does not repeat 'Full day' for a full-day service outside events", () => {
    const html = render({ bookingType: "full-day", durationMinutes: undefined }, "spaces");

    expect(html.match(/Full Day/gi)).toHaveLength(1);
    expect(html).toContain("Choose a day");
  });

  it("asks events for a date and shows the occurrence", () => {
    const html = render(
      {
        bookingType: "full-day",
        occurrenceMode: "single",
        occurrenceDate: "2026-10-03",
        startTime: "09:00",
        endTime: "11:00",
        maxSpots: 18,
        notes: undefined,
      },
      "events",
      { seatsNote: { text: "3 spots left", tone: "scarce" } },
    );

    expect(html).toContain("Choose a date");
    expect(html).toContain("Up to 18 spots");
    expect(html).toContain("Full Day");
    expect(html).toContain("9:00 AM - 11:00 AM");
    expect(html).toContain("3 spots left");
  });

  it("renders its own contact line only when given one", () => {
    expect(render()).not.toContain("245 West");
    expect(
      render({}, "healthcare", {
        contact: { addresses: ["245 West 29th Street"], phones: ["+1 212 555 0142"] },
      }),
    ).toContain("245 West 29th Street");
  });

  it("speaks Spanish", () => {
    const html = render({}, "healthcare", {}, "es");

    expect(html).toContain("Seleccione un horario");
    expect(html).toContain("Antes de su consulta:");
  });
});
