import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SelectedWorkflowHeader } from "@/components/provider/SelectedWorkflowHeader";

describe("SelectedWorkflowHeader", () => {
  it("shows the selected healthcare workflow in Spanish", () => {
    const html = renderToStaticMarkup(
      <SelectedWorkflowHeader
        lang="es"
        onChooseAnother={() => undefined}
        vertical="healthcare"
      />,
    );

    expect(html).toContain("Flujo de trabajo seleccionado");
    expect(html).toContain("Salud");
    expect(html).toContain("Para médicos y especialistas");
    expect(html).toContain("Elegir otro flujo");
  });

  it("shows the selected events workflow in English", () => {
    const html = renderToStaticMarkup(
      <SelectedWorkflowHeader
        lang="en"
        onChooseAnother={() => undefined}
        vertical="events"
      />,
    );

    expect(html).toContain("Selected workflow");
    expect(html).toContain("Events");
    expect(html).toContain("For workshops, classes, and gatherings");
    expect(html).toContain("Choose another workflow");
  });
});
