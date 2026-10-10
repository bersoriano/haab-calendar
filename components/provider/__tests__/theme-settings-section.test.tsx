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
      // Native radios in one group: arrow keys move between themes.
      expect(html).toContain('role="radiogroup"');
      expect(html.match(/type="radio"/g)).toHaveLength(5);
      expect(html.match(/checked=""/g)).toHaveLength(1);
      expect(html).toMatch(/value="dark"[^>]*checked=""|checked=""[^>]*value="dark"/);
      expect(html).toMatch(/background:linear-gradient\(160deg,[^\"]+url\(&#x27;\/bkg2.jpg/);
    }
  });
});
