import { bookingTranslations } from "@/components/booking/i18n/translations";
import { getPublicThemeStyle, PUBLIC_THEMES, type PublicTheme } from "@/lib/public-theme";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Picks the look of the owner's public booking page.
 *
 * Each option carries a swatch drawn from the theme's own palette rather than a
 * name alone — "Miami" means nothing until you see that it is dark with neon on
 * it, and a colour choice made from words is a choice made blind.
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
    <div className="mt-6 grid gap-3">
      <p className="text-sm font-medium text-[var(--ink)]">{t.admin.publicThemeLabel}</p>
      <p className="text-sm leading-6 text-[var(--muted)]">{t.admin.publicThemeHelper}</p>
      <div
        role="radiogroup"
        aria-label={t.admin.publicThemeLabel}
        className="grid gap-3 sm:grid-cols-2"
      >
        {PUBLIC_THEMES.map((option) => {
          const style = getPublicThemeStyle(option);
          const active = option === theme;
          const swatch = [
            style.tokens["--primary"] ?? "#005bbf",
            style.tokens["--accent"] ?? "#1a73e8",
            style.tokens["--action-teal"] ?? "#00bfa5",
          ];

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onThemeChange(option)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3 text-left transition disabled:opacity-45",
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--line)] bg-[var(--surface-lowest)] hover:border-[var(--accent)]",
              )}
            >
              <span
                aria-hidden="true"
                className="h-11 w-11 shrink-0 overflow-hidden rounded-xl ring-1 ring-[rgba(15,23,42,0.12)]"
                style={{ background: style.base }}
              >
                <span
                  className="block h-full w-full"
                  style={{ background: style.layers[0] }}
                />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--ink)]">
                  {t.admin.publicThemeNames[option]}
                </span>
                <span aria-hidden="true" className="mt-1.5 flex gap-1">
                  {swatch.map((colour) => (
                    <span
                      key={colour}
                      className="h-2.5 w-6 rounded-full"
                      style={{ background: colour }}
                    />
                  ))}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
