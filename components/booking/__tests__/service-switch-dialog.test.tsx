import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ServiceSwitchDialog } from "@/components/booking/ServiceSwitchDialog";

describe("ServiceSwitchDialog", () => {
  it("explains that continuing changes date and time while cancel keeps current service", () => {
    const html = renderToStaticMarkup(
      <ServiceSwitchDialog serviceName="Follow-up" lang="en" onConfirm={() => undefined} onCancel={() => undefined} />,
    );

    expect(html).toContain('role="alertdialog"');
    expect(html).toContain("Follow-up");
    expect(html).toContain("date and time");
    expect(html).toContain("Cancel");
    expect(html).toContain("Choose a new date and time");
  });

  it("uses Spanish copy when booking page is in Spanish", () => {
    const html = renderToStaticMarkup(
      <ServiceSwitchDialog serviceName="Consulta" lang="es" onConfirm={() => undefined} onCancel={() => undefined} />,
    );

    expect(html).toContain("Consulta");
    expect(html).toContain("Elegir nueva fecha y hora");
    expect(html).toContain("Cancelar");
  });
});
