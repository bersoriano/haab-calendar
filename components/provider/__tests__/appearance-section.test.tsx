import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { AppearanceSection } from "@/components/provider/AppearanceSection";
import { createEmptyStore } from "@/lib/store";

const provider = { ...createEmptyStore().provider, businessName: "Rivera", heroText: "Welcome in" };

function render(chrome: "module" | "shell" = "shell", lang: "en" | "es" = "en") {
  return renderToStaticMarkup(
    <AppearanceSection provider={provider} onChange={() => undefined} disabled={false} lang={lang} chrome={chrome} />,
  );
}

describe("AppearanceSection", () => {
  it("holds branding, the theme and the clients' language", () => {
    const html = render();
    const en = bookingTranslations.en;
    expect(html).toContain(en.providerForm.logoImage);
    expect(html).toContain(en.providerForm.headerImage);
    expect(html).toContain("Welcome in");
    expect(html).toContain(en.admin.publicThemeLabel);
    expect(html).toContain(en.admin.clientLanguageLabel);
  });

  it("explains itself only where no shell names the page", () => {
    const body = bookingTranslations.en.admin.appearanceBody;
    expect(render("shell")).not.toContain(body);
    expect(render("module")).toContain(body);
  });

  it("speaks the workspace language", () => {
    expect(render("shell", "es")).toContain(bookingTranslations.es.admin.publicThemeLabel);
  });
});
