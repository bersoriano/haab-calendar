import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminHero } from "@/components/provider/AdminHero";
import { AvailabilityEditor } from "@/components/provider/AvailabilityEditor";
import { BookingHoldCountdownBar } from "@/components/ui/BookingHoldCountdownBar";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { createEmptyStore } from "@/lib/store";
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
];

const SPANISH_MARKERS = [
  "Apartado de", // public.holdLabelFor — BookingHoldCountdownBar
  "Vencida", // public.expired — BookingHoldCountdownBar, expired state
  "Horarios bloqueados", // admin.blockedTimes — AvailabilityEditor, every day row
  "Lunes", // admin.weekdays.monday — AvailabilityEditor
  "Hasta", // admin.blockedTo — AvailabilityEditor, only on a day with a blocked window
  "sus reservas", // admin.heroTitle — AdminHero
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
  ].join("\n");
}

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
