import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ThemeSettingsSection } from "@/components/provider/ThemeSettingsSection";

describe("ThemeSettingsSection", () => {
  it("offers a selected dark option in both workspace languages", () => {
    for (const [lang, label] of [["en", "Dark"], ["es", "Oscuro"]] as const) {
      const html = renderToStaticMarkup(
        <ThemeSettingsSection lang={lang} theme="dark" onThemeChange={() => undefined} />,
      );

      expect(html).toContain(label);
      expect(html).toContain('role="radio" aria-checked="true"');
      expect(html.match(/role="radio"/g)).toHaveLength(5);
      expect(html).toMatch(/background:linear-gradient\(160deg,[^\"]+url\(&#x27;\/bkg2.jpg/);
    }
  });
});
