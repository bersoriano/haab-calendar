"use client";

import { RadioCards } from "@/components/app-ui";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import {
  getPublicThemeStyle,
  getPublicThemeSwatch,
  PUBLIC_THEMES,
  type PublicTheme,
} from "@/lib/public-theme";
import type { Lang } from "@/lib/types";

/**
 * Picks the look of the owner's public booking page.
 *
 * Each option carries a swatch drawn from the theme's own palette rather than a
 * name alone — "Miami" means nothing until you see that it is dark with neon on
 * it, and a colour choice made from words is a choice made blind. The swatches
 * are the public page's colors on purpose; they are not dashboard styling.
 */
export function ThemeSettingsSection({
  lang,
  theme,
  onThemeChange,
  disabled = false,
}: {
  /** The owner's workspace language: the language this panel is written in. */
  lang: Lang;
  theme: PublicTheme;
  onThemeChange: (theme: PublicTheme) => void;
  disabled?: boolean;
}) {
  const t = bookingTranslations[lang];

  return (
    <div className="grid gap-3">
      <div>
        <h3 id="public-theme-label" className="text-sm font-semibold text-app-fg">
          {t.admin.publicThemeLabel}
        </h3>
        <p className="mt-1 text-sm text-app-fg-muted">{t.admin.publicThemeHelper}</p>
      </div>
      <RadioCards
        name="public-theme"
        ariaLabelledBy="public-theme-label"
        value={theme}
        onChange={onThemeChange}
        disabled={disabled}
        columns={2}
        options={PUBLIC_THEMES.map((option) => {
          const style = getPublicThemeStyle(option);

          return {
            value: option,
            label: t.admin.publicThemeNames[option],
            icon: (
              <span
                aria-hidden="true"
                className="block size-11 overflow-hidden rounded-lg ring-1 ring-app-border"
                style={{ background: style.base }}
              >
                <span
                  className="block h-full w-full"
                  style={{ background: [...style.layers].reverse().join(", ") }}
                />
              </span>
            ),
            description: (
              <span aria-hidden="true" className="flex gap-1 pt-0.5">
                {getPublicThemeSwatch(option).map((colour) => (
                  <span key={colour} className="h-2.5 w-6 rounded-full" style={{ background: colour }} />
                ))}
              </span>
            ),
          };
        })}
      />
    </div>
  );
}
