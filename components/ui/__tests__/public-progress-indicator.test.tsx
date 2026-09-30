import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublicProgressIndicator } from "@/components/ui/PublicProgressIndicator";

const render = (props: Partial<Parameters<typeof PublicProgressIndicator>[0]> = {}) =>
  renderToStaticMarkup(
    <PublicProgressIndicator currentStep={3} isDedicatedPublicPage lang="en" {...props} />,
  );

describe("PublicProgressIndicator", () => {
  it("shows four steps with the service done when there are several services", () => {
    const html = render({ showServiceStep: true, serviceLabel: "Medical service" });

    expect(html.match(/<li /g)).toHaveLength(4);
    expect(html).toContain("Medical service");
    expect(html).toContain("Step 3 of 4");
  });

  it("drops the service step for a single-service provider", () => {
    const html = render();

    expect(html.match(/<li /g)).toHaveLength(3);
    expect(html).toContain("Step 2 of 3");
  });

  it("says which step on a phone, in the page language", () => {
    expect(render({ showServiceStep: true, lang: "es" })).toContain("Paso 3 de 4");
    expect(render({ showServiceStep: true, currentStep: 2 })).toContain("Step 2 of 4");
  });

  it("never makes the service step a way back", () => {
    const html = render({ showServiceStep: true, onStepSelect: () => undefined });

    // date and time is the only finished step that can be tapped
    expect(html.match(/<button/g)).toHaveLength(1);
  });

  it("leaves the embedded surface at three steps and no phone bar", () => {
    const html = render({ isDedicatedPublicPage: false, showServiceStep: true });

    expect(html.match(/<li /g)).toHaveLength(3);
    expect(html).not.toContain("Step 2 of 3");
    expect(html).not.toContain("sm:hidden");
  });
});
