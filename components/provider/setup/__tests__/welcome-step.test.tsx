import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { WelcomeStep } from "@/components/provider/setup/WelcomeStep";

describe("WelcomeStep", () => {
  it("leads with one heading and the business types to start from", () => {
    const t = bookingTranslations.es.welcome;
    const html = renderToStaticMarkup(<WelcomeStep lang="es" onSelect={() => undefined} />);

    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain(`>${t.title}</h1>`);
    expect(html).toContain(t.body);
    // One card per business type, each a button that starts its setup.
    expect(html.match(/<button/g)?.length).toBeGreaterThanOrEqual(4);
    expect(html).toContain(t.getStarted);
  });

  it("keeps the feature checklist as a list", () => {
    const t = bookingTranslations.en.welcome;
    const html = renderToStaticMarkup(<WelcomeStep lang="en" onSelect={() => undefined} />);

    for (const feature of [t.featureCustomizable, t.featureNoCard, t.featureReady]) {
      expect(html).toContain(`</span>${feature}</li>`);
    }
  });

  it("sits on the plain app canvas, without the decorative washes", () => {
    const html = renderToStaticMarkup(<WelcomeStep lang="en" onSelect={() => undefined} />);

    expect(html).not.toContain("radial-gradient");
    expect(html).not.toContain("blur-3xl");
  });
});
