import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ServicePicker } from "@/components/booking/ServicePicker";
import type { Service } from "@/lib/types";
import { getVerticalCopy } from "@/lib/vertical-copy";

const services = [
  { id: "svc_1", name: "New patient consultation", cost: "$95" },
  { id: "svc_2", name: "Follow-up" },
] as Service[];

const render = (props: Partial<Parameters<typeof ServicePicker>[0]> = {}) =>
  renderToStaticMarkup(
    <ServicePicker
      services={services}
      value="svc_2"
      onChange={() => undefined}
      disabled={false}
      copy={getVerticalCopy("healthcare", "en")}
      lang="en"
      {...props}
    />,
  );

describe("ServicePicker", () => {
  it("titles the section with the vertical's word and selects the current service", () => {
    const html = render();

    expect(html).toContain("Selected medical service");
    expect(html).toMatch(/<option value="svc_2" selected="">Follow-up<\/option>/);
    expect(html).toContain("New patient consultation · $95");
  });

  it("speaks Spanish on Spanish pages", () => {
    expect(render({ copy: getVerticalCopy("events", "es"), lang: "es" })).toContain(
      "Evento seleccionado",
    );
  });

  it("locks the select while a change is being held", () => {
    expect(render({ disabled: true })).toMatch(/<select[^>]*disabled/);
  });
});
