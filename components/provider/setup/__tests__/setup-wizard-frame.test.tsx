import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SetupWizardFrame } from "@/components/provider/setup/SetupWizardFrame";

const STEPS = ["Your details", "Services", "Hours", "Publish"] as const;

function render(props: Partial<Parameters<typeof SetupWizardFrame>[0]> = {}) {
  return renderToStaticMarkup(
    <SetupWizardFrame
      lang="en"
      title="Set up your booking page"
      body="Add your details and weekly hours, then publish."
      steps={STEPS}
      step={2}
      stepTitle="Your services"
      stepDescription="What clients can book."
      back={{ label: "Back", onClick: () => undefined }}
      next={{ label: "Continue", onClick: () => undefined }}
      {...props}
    >
      <p>step body</p>
    </SetupWizardFrame>,
  );
}

describe("SetupWizardFrame", () => {
  it("titles the wizard below the host's own page heading, and each step below that", () => {
    const html = render();

    // The dashboard (Change business type) already has an h1; never add a second.
    expect(html).not.toContain("<h1");
    expect(html).toMatch(/<h2[^>]*>Set up your booking page<\/h2>/);
    expect(html).toMatch(/<h3[^>]*>Your services<\/h3>/);
    expect(html).toContain("<p>step body</p>");
  });

  it("marks only the current step, and says where you are on a phone", () => {
    const html = render({ step: 3 });

    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toMatch(/<li[^>]*aria-current="step"[^>]*>[\s\S]*?Hours/);
    expect(html).toContain("Step 3 of 4");
    expect(html).toContain('aria-label="Setup progress"');
  });

  it("shows finished steps as done and later ones as numbers", () => {
    const html = render({ step: 3 });
    const items = html.match(/<li[\s\S]*?<\/li>/g) ?? [];

    expect(items).toHaveLength(4);
    expect(items[0]).toContain("<svg");
    expect(items[3]).toMatch(/>4</);
  });

  it("puts Back and Continue in the card footer, with Continue's progress", () => {
    const html = render({ next: { label: "Saving…", onClick: () => undefined, loading: true } });

    expect(html).toMatch(/<button[^>]*>Back<\/button>/);
    expect(html).toMatch(/<button[^>]*aria-busy="true"[^>]*>[\s\S]*?Saving…<\/button>/);
  });

  it("leaves out an action the step does not offer", () => {
    const html = render({ step: 4, back: undefined, next: undefined });

    expect(html).not.toContain(">Back<");
    expect(html).not.toContain(">Continue<");
  });

  it("shows a refused step as an alert inside the card", () => {
    const html = render({ error: "Add at least one service." });

    expect(html).toMatch(/role="alert"[\s\S]*Add at least one service\./);
    expect(html.indexOf("Add at least one service.")).toBeLessThan(html.indexOf(">Back<"));
  });

  it("keeps a step's eyebrow out of its heading's name", () => {
    const html = render({ stepEyebrow: "Ready", stepTitle: "Your page is ready" });

    expect(html).toMatch(/<h3[^>]*>Your page is ready<\/h3>/);
    expect(html.indexOf(">Ready<")).toBeLessThan(html.indexOf("<h3"));
  });

  it("lays a step out without its own card when the content brings cards", () => {
    const html = render({ bare: true });
    const section = html.match(/<section[^>]*>/)?.[0] ?? "";

    // One card level: the step is a plain section; its content's cards are the only cards.
    expect(section).not.toContain("ring-app-border");
    expect(html).toMatch(/<h3[^>]*>Your services<\/h3>/);
    expect(html).toContain("<p>step body</p>");
    expect(html).toMatch(/<button[^>]*>Back<\/button>/);
    expect(html).toMatch(/<button[^>]*>Continue<\/button>/);
  });

  it("speaks Spanish when the page does", () => {
    expect(render({ lang: "es", step: 1 })).toContain("Paso 1 de 4");
  });
});
