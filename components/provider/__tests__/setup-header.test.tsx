import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SetupHeader } from "@/components/provider/SetupHeader";

const noop = () => undefined;

describe("SetupHeader", () => {
  it("shows the selected healthcare workflow in Spanish", () => {
    const html = renderToStaticMarkup(
      <SetupHeader lang="es" vertical="healthcare" onChooseAnother={noop} onBackToHome={noop} />,
    );

    expect(html).toContain("Flujo de trabajo seleccionado");
    expect(html).toContain("Salud");
    expect(html).toContain("Para médicos y especialistas");
    expect(html).toContain("Elegir otro flujo");
    expect(html).not.toContain("Choose another workflow");
  });

  it("shows the selected events workflow in English with the account controls", () => {
    const html = renderToStaticMarkup(
      <SetupHeader
        lang="en"
        vertical="events"
        onChooseAnother={noop}
        onBackToHome={noop}
        onSignOut={noop}
        userEmail="manager@example.com"
      />,
    );

    expect(html).toContain("Selected workflow");
    expect(html).toContain("Events");
    expect(html).toContain("For races, workshops, classes, and gatherings");
    expect(html).toContain("Choose another workflow");
    expect(html).toContain("manager@example.com");
    expect(html).toContain("Sign out");
    expect(html).toContain('type="submit"');
  });

  it("is one header row, with no sign-out for a guest", () => {
    const html = renderToStaticMarkup(
      <SetupHeader lang="en" vertical="spaces" onChooseAnother={noop} onBackToHome={noop} />,
    );

    expect(html.match(/<header/g)).toHaveLength(1);
    expect(html).not.toContain("Sign out");
  });

  it("offers the way home before a workflow is chosen", () => {
    const html = renderToStaticMarkup(
      <SetupHeader lang="en" onChooseAnother={noop} onBackToHome={noop} />,
    );

    expect(html).toContain("Back to home");
    expect(html).not.toContain("Choose another workflow");
  });
});
