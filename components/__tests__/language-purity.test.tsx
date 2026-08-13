import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  bookingTranslations,
  fillTemplate,
} from "@/components/booking/i18n/translations";
import { AdminHero } from "@/components/provider/AdminHero";
import { AvailabilityEditor } from "@/components/provider/AvailabilityEditor";
import { LanguageSettingsSection } from "@/components/provider/LanguageSettingsSection";
import { ServiceEditor } from "@/components/provider/ServiceEditor";
import { BookingHoldCountdownBar } from "@/components/ui/BookingHoldCountdownBar";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { createBlankServiceDraft, createEmptyStore, normalizeProvider } from "@/lib/store";
import type { Lang } from "@/lib/types";
import { getVerticalCopy } from "@/lib/vertical-copy";

/**
 * Words that only ever appear in the app's own English interface text. Owner
 * content and proper nouns are deliberately excluded — an owner writing their
 * page in English on a Spanish interface is expected, not a defect.
 *
 * Every marker below is verified to actually render from one of the four
 * screens exercised by `renderScreens`, in only one language. A marker that
 * never renders proves nothing (see the audit in task-10-report.md) — several
 * markers from the original brief ("Booking hold", "Save changes", "Up to")
 * were inert against this component set and have been swapped for dictionary
 * values that are genuinely load-bearing, sourced from
 * components/booking/i18n/translations.ts.
 */
const ENGLISH_MARKERS = [
  "Blocked times", // admin.blockedTimes — AvailabilityEditor, every day row
  "Hold expired", // public.holdExpired — BookingHoldCountdownBar, expired state
  "Hold ending soon", // public.holdEndingSoon — BookingHoldCountdownBar, urgent state
  "booking operations", // admin.heroTitle — AdminHero
  "workspace", // admin.heroTitle — AdminHero
  "Monday", // admin.weekdays.monday — AvailabilityEditor
  "Add block", // admin.addBlock — AvailabilityEditor, every day row
  "The hold ran out", // public.holdExpiredTitle — BookingHoldCountdownBar, expired state
  "Language your clients see", // admin.clientLanguageLabel — LanguageSettingsSection
  "Your workspace language", // admin.dashboardLanguageLabel — LanguageSettingsSection
  "Price at this location", // admin.priceAtLocation — ServiceEditor, linked-address row
  "Same as base price", // admin.sameAsBasePrice — ServiceEditor, empty-cost placeholder
  "Court rental", // admin.serviceNamePlaceholder — ServiceEditor, no-hints fallback
  "Family medicine", // admin.medicalSpecialtyPlaceholder — ServiceEditor, healthcare only
  "Max 12 people", // admin.capacityPlaceholder — ServiceEditor, non-events only
  "123 Main St", // providerForm.address1Placeholder — ServiceEditor, add-an-address block
];

const SPANISH_MARKERS = [
  "Apartado de", // public.holdLabelFor — BookingHoldCountdownBar
  "Vencida", // public.expired — BookingHoldCountdownBar, expired state
  "Horarios bloqueados", // admin.blockedTimes — AvailabilityEditor, every day row
  "Lunes", // admin.weekdays.monday — AvailabilityEditor
  "Hasta", // admin.blockedTo — AvailabilityEditor, only on a day with a blocked window
  "sus reservas", // admin.heroTitle — AdminHero
  "Idioma que ven sus clientes", // admin.clientLanguageLabel — LanguageSettingsSection
  "Idioma de su espacio", // admin.dashboardLanguageLabel — LanguageSettingsSection
  "Precio en esta ubicación", // admin.priceAtLocation — ServiceEditor, linked-address row
  "Igual que el precio base", // admin.sameAsBasePrice — ServiceEditor, empty-cost placeholder
  "Renta de cancha", // admin.serviceNamePlaceholder — ServiceEditor, no-hints fallback
  "Medicina familiar", // admin.medicalSpecialtyPlaceholder — ServiceEditor, healthcare only
  "Máx. 12 personas", // admin.capacityPlaceholder — ServiceEditor, non-events only
  "Av. Principal 123", // providerForm.address1Placeholder — ServiceEditor, add-an-address block
];

function renderScreens(lang: "en" | "es") {
  const copy = getVerticalCopy("healthcare", lang);

  // A plain empty store never populates a blocked window, so the "From" /
  // "To" / "Remove" labels inside AvailabilityEditor never render. Add one
  // so that part of the screen is actually exercised too.
  const availability = createEmptyStore().availability;
  availability.monday.blockedWindows = [{ startTime: "12:00", endTime: "13:00" }];

  return [
    renderToStaticMarkup(<AdminHero lang={lang} />),
    renderToStaticMarkup(
      <AvailabilityEditor availability={availability} onChange={() => undefined} lang={lang} />,
    ),
    renderToStaticMarkup(
      <BookingHoldCountdownBar
        isExpired={false}
        remainingMs={120000}
        remainingRatio={0.2}
        copy={copy}
        lang={lang}
      />,
    ),
    // The countdown bar's expired state carries its own interface text
    // ("Hold expired" / "Vencida" / "The hold ran out") that never renders
    // while a hold is still running — render that state too.
    renderToStaticMarkup(
      <BookingHoldCountdownBar
        isExpired={true}
        remainingMs={0}
        remainingRatio={0}
        copy={copy}
        lang={lang}
      />,
    ),
    renderToStaticMarkup(<LanguageSwitcher lang={lang} onChange={() => undefined} />),
    // Composed with the hero above on purpose: the dashboard is one screen
    // assembled from two files, and that seam is where the two halves drifted
    // into different languages. `clientLanguage` is deliberately the *other*
    // language — this panel describes the client-facing setting but must be
    // written in the owner's workspace language, never in their clients'.
    renderToStaticMarkup(
      <LanguageSettingsSection
        lang={lang}
        clientLanguage={otherLanguage(lang)}
        onClientLanguageChange={() => undefined}
        onDashboardLanguageChange={() => undefined}
      />,
    ),
    // The per-location price field is the hunk that shipped an unconditional
    // English placeholder, and nothing rendered this component. It only appears
    // once the provider has an address AND the draft links to it, so the
    // fixture below sets both; `cost` stays empty so the placeholder falls
    // through to the interface string rather than to the owner's own number.
    renderToStaticMarkup(
      <ServiceEditor
        services={[]}
        serviceDraft={{ ...createBlankServiceDraft("healthcare"), linkedAddress1: true }}
        onDraftChange={() => undefined}
        editingServiceId={null}
        onUpsert={() => undefined}
        onReset={() => undefined}
        onEdit={() => undefined}
        onRemove={() => undefined}
        provider={normalizeProvider({ address1: "Av. Reforma 100" })}
        vertical="healthcare"
        copy={copy}
        lang={lang}
      />,
    ),
  ].join("\n");
}

function otherLanguage(lang: Lang): Lang {
  return lang === "es" ? "en" : "es";
}

/**
 * The Spanish vertical nouns are mixed gender — `reserva` (F), `cita` (F),
 * `registro` (M), `sesión` (F) — so a Spanish string that interpolates one and
 * then agrees with it is wrong for at least one vertical. Task 4 shipped
 * exactly that ("registro cancelada"). The test that closed it asserted only
 * that the `{booking}` placeholder was still present, which "{booking}
 * cancelado" would also satisfy while reading wrong for three of the five
 * nouns. This renders the component instead and reads the sentences back.
 */
const SPANISH_NOUN = String.raw`(?:reservas?|citas?|registros?|sesion(?:es)?|sesión)`;
const PARTICIPLE = String.raw`[a-záéíóúüñ]{3,}(?:ad|id)[oa]s?`;

/**
 * On screen: the noun standing directly next to an agreeing word, which is the
 * exact shape that shipped ("registro cancelada"). Kept tight because rendered
 * Spanish also carries *literal* nouns that agree correctly and must not trip
 * it — "Reserva temporal vencida" is right, because that `reserva` is the hold
 * itself and never varies.
 */
const NOUN_BESIDE_PARTICIPLE = new RegExp(
  String.raw`\b(${SPANISH_NOUN})\s+(${PARTICIPLE})\b`,
  "i",
);

/**
 * In the dictionary: the same thing with up to one word in between, which
 * catches the separated form ("su {booking} fue cancelado"). Safe to widen
 * here because it runs only over strings that actually interpolate the noun,
 * where no literal, fixed-gender noun is in play.
 */
const NOUN_AGREEING_PARTICIPLE = new RegExp(
  String.raw`\b(${SPANISH_NOUN})(?:\s+[a-záéíóúüñ]+)?\s+(${PARTICIPLE})\b`,
  "i",
);

const SPANISH_VERTICALS = ["healthcare", "professional", "spaces", "events"] as const;

/** Every Spanish dictionary string that interpolates a vertical noun. */
function templatedSpanishStrings(
  value: unknown,
  path = "",
): { path: string; template: string }[] {
  if (typeof value === "string") {
    return /\{Booking\}|\{booking\}/.test(value) ? [{ path, template: value }] : [];
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      templatedSpanishStrings(child, path ? `${path}.${key}` : key),
    );
  }
  return [];
}

function renderHoldStatesInSpanish(vertical: (typeof SPANISH_VERTICALS)[number]) {
  const copy = getVerticalCopy(vertical, "es");
  const states = [
    { isCancelled: true, isExpired: false },
    { isConfirmed: true, isExpired: false },
    { isExpired: true },
    { isExpired: false },
  ];

  return states
    .map((state) =>
      renderToStaticMarkup(
        <BookingHoldCountdownBar
          {...state}
          isExpired={state.isExpired}
          remainingMs={90000}
          remainingRatio={0.1}
          copy={copy}
          lang="es"
        />,
      ),
    )
    .join("\n");
}

/** Sentences only — tag names and class names are not Spanish. */
function visibleText(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");
}

describe("Spanish gender agreement", () => {
  it.each(SPANISH_VERTICALS)(
    "never agrees an adjective with the %s vertical's noun",
    (vertical) => {
      const text = visibleText(renderHoldStatesInSpanish(vertical));
      const match = text.match(NOUN_BESIDE_PARTICIPLE);

      expect(match?.[0] ?? null).toBeNull();
    },
  );

  it("carries no agreement in any templated Spanish string, for any vertical", () => {
    const offenders = templatedSpanishStrings(bookingTranslations.es).flatMap(
      ({ path, template }) =>
        SPANISH_VERTICALS.flatMap((vertical) => {
          const copy = getVerticalCopy(vertical, "es");
          const filled = fillTemplate(template, {
            booking: copy.booking,
            Booking: copy.Booking,
          });
          return NOUN_AGREEING_PARTICIPLE.test(filled) ? [`${path}: ${filled}`] : [];
        }),
    );

    expect(offenders).toEqual([]);
  });

  it("actually reaches the noun-bearing status copy it is guarding", () => {
    // A guard that never renders the strings it checks proves nothing. The
    // masculine `registro` is the one that broke, so pin that it is on screen.
    const text = visibleText(renderHoldStatesInSpanish("events"));

    expect(text).toContain("Se canceló su registro");
    expect(text).toContain("Se confirmó su registro");
    expect(text).toContain("Apartado de registro");
  });
});

describe("screen language purity", () => {
  it("leaves no English interface text on Spanish screens", () => {
    const html = renderScreens("es");
    const leaked = ENGLISH_MARKERS.filter((marker) => html.includes(marker));
    expect(leaked).toEqual([]);
  });

  it("leaves no Spanish interface text on English screens", () => {
    const html = renderScreens("en");
    // "English" and "Español" both appear in the switcher by design: each
    // option is named in its own language so a lost visitor can find theirs.
    const leaked = SPANISH_MARKERS.filter((marker) => html.includes(marker));
    expect(leaked).toEqual([]);
  });
});
