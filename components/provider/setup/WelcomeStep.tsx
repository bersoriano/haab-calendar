import { Check } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/app-ui";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { VerticalPicker } from "@/components/provider/VerticalPicker";
import { getVerticals } from "@/config/verticals";
import type { Lang, VerticalId } from "@/lib/types";

/**
 * First-run setup before a business type is chosen: what this is, then one
 * card per type. Choosing a card selects it and starts setup.
 */
export function WelcomeStep({ lang, onSelect }: { lang: Lang; onSelect: (id: VerticalId) => void }) {
  const t = bookingTranslations[lang].welcome;

  return (
    // The negative margins cancel the guest builder's <main> padding
    // (px-4 py-6 sm:px-6 lg:px-8 in home-experience), so the canvas runs edge
    // to edge. A host with other padding gets a slight bleed, as before.
    <div className="-mx-4 -my-6 flex min-h-[calc(100vh-1px)] flex-col bg-app-canvas sm:-mx-6 lg:-mx-8">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="accent">{t.badge}</Badge>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-app-fg sm:text-4xl">
            {t.title}
          </h1>
          <p className="mt-4 text-pretty text-base text-app-fg-muted sm:text-lg">{t.body}</p>
        </div>

        <div className="mt-10 sm:mt-12">
          <VerticalPicker verticals={getVerticals(lang)} onSelect={onSelect} actionLabel={t.getStarted} />
        </div>

        <ul role="list" className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-app-fg-secondary">
          {[t.featureCustomizable, t.featureNoCard, t.featureReady].map((feature) => (
            <li key={feature} className="inline-flex items-center gap-2">
              <span className="grid size-5 place-items-center rounded-full bg-app-success-soft text-app-success-fg">
                <Check aria-hidden="true" size={12} weight="bold" />
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
