import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BackPillButton } from "@/components/booking/BackPillButton";
import { bookingTranslations } from "@/components/booking/i18n/translations";

describe("BackPillButton", () => {
  it("renders a plain button with the given label", () => {
    const html = renderToStaticMarkup(
      <BackPillButton label={bookingTranslations.en.publicFlow.changeDateTime} onClick={() => undefined} />,
    );

    expect(html).toContain('type="button"');
    expect(html).toContain("Change date/time");
  });

  it("uses the Spanish label on Spanish pages", () => {
    const html = renderToStaticMarkup(
      <BackPillButton label={bookingTranslations.es.publicFlow.changeDateTime} onClick={() => undefined} />,
    );

    expect(html).toContain("Cambiar fecha/horario");
  });
});
