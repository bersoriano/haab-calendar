# Public booking header redesign

**Date:** 2026-08-06
**Scope:** The identity band at the top of the dedicated public booking page.
**Out of scope:** The header banner image, the step progress indicator, and the
sticky/collapse behaviour on scroll.

## Problem

The public booking page opens with a row that holds the provider logo, the
provider name, and the language toggle. Three things are wrong with it.

**The provider name can print twice.** `renderPublicBranding` renders the logo
and an `<h1>` of the business name side by side. When the uploaded logo is
itself a wordmark — which it is for the one real provider on the system, ACIS
Sports — the page shows the same words twice in two typefaces. It reads as a
rendering fault rather than as branding.

**The band is not a band.** The row has no surface, no rule, and no shared
baseline, so the logo and the language toggle read as two unrelated objects
floating on the page background. They are already siblings in one flex row;
nothing makes them look like it.

**The header says nothing while it is the only thing on screen.** Advancing
from slot selection to the details step runs `advanceToDetailsStep`: scroll to
top, fade the flow to `opacity-0`, wait 220ms, then `await
beginClientDetailsStep()` — a network call that creates a server-side hold —
then fade back in. Faded content keeps its layout height, so for 220ms plus a
round trip the visitor sees a header and a tall void. `isCreatingHold` exists,
but anything it drives is inside the faded region and therefore invisible at
exactly the moment it matters.

The header is the only continuously mounted surface in the public flow. That
makes it the only surface with standing to cover the transition.

## Design

One band, three slots on a shared baseline grid.

```
┌─ header band ───────────────────────────────────────────────────┐
│                                                                  │
│  ┌────────┐  ACIS SPORTS                          [ EN │ ES ]    │
│  │  LOGO  │  Registrations · Times shown in GMT-6                │
│  └────────┘  └────────────── live slot ──────────────┘           │
│                                                                  │
└──────────────────────────────────────── hairline ────────────────┘
```

On narrow viewports the logo stacks above the lockup and the language toggle
stays pinned top-right.

```
┌─────────────────────────────┐
│ ┌──────┐         [ EN │ ES ] │
│ │ LOGO │                     │
│ └──────┘                     │
│ ACIS SPORTS                  │
│ Registrations · GMT-6        │
└──────────────────────────────┘
```

### The band

A bottom hairline and consistent padding, not a panel. The page already carries
a background image (`bkg2.jpg`) behind everything and, on providers who have
one, a banner immediately below. A card here would fight both. The hairline is
enough to make the three slots read as one band.

### The lockup

The logo caps at roughly 40px tall, down from `h-16 w-48`. Today the mark
out-scales the name; at 40px the name leads and the mark supports.

**When a logo exists, the visible `<h1>` is suppressed** and the provider name
is carried as `sr-only` text so the heading outline, assistive technology, and
SEO are unaffected. When no logo exists the `<h1>` renders as the visible mark.

This is a deliberate trade. It is correct for wordmark logos, which is the case
that currently looks broken. It is a real cost for icon-only logos: those pages
become visually nameless in the band, relying on the document title, the banner,
and the service cards to identify the provider. A `showNameBesideLogo` provider
setting would be right in all cases; it was considered and declined to keep this
change out of provider settings UI.

### The live slot

The second line of the lockup is an `aria-live="polite"` region styled as a mono
microlabel, matching the label idiom already used in `BookingPass` so the two
surfaces read as family.

| State | Condition | Content |
|---|---|---|
| idle | default | `{copy.Bookings} · Times shown in {tz}` |
| advancing | `isPublicFlowFadingOut \|\| isCreatingHold` | `Holding your spot…`, with motion |
| hold expiring | `bookingHoldRemainingMs` below threshold | countdown, amber |
| error | `bookingError` non-null | the error text, rose |

The `advancing` state is the point of the whole design. It fires during exactly
the window where the page is otherwise empty, on the one surface still mounted.

Copy comes from `getVerticalCopy(vertical, lang)`, which already yields
`Registrations` / `Registros`, `Appointments` / `Citas`, and so on per vertical
and language. No new strings are needed for the noun.

**No city in the idle line.** `address1` is a free-text full address that cannot
be reliably reduced to a city, and providers can be multi-city — ACIS runs races
in Mexico City, Guadalajara, and Monterrey. A single header city would be wrong
for them. Place already appears per service card, which is where it is correct.
Timezone stays, because which timezone the listed times are in is genuine
orientation for a booking page.

## Structure

`components/haab-booking-module.tsx` is ~6000 lines. The header is extracted to
a new `components/booking/PublicBookingHeader.tsx` rather than being edited in
place, consistent with the decomposition already underway in `components/booking/`.

Props: provider, `lang`, `copy`, `providerTimeZone`, and the flow state the live
slot reads (`isPublicFlowFadingOut`, `isCreatingHold`, `bookingError`, hold
remaining). The component owns no state; the module stays the single source of
truth for flow state.

Call sites:

- `components/haab-booking-module.tsx:5876-5881` — the row that renders the
  branding and the language chooser on the dedicated public page. Becomes a
  single `<PublicBookingHeader>` with the language chooser passed as a child or
  slot so `renderPublicLanguageChooser` is not duplicated.
- `components/haab-booking-module.tsx:860-886` — `renderPublicBranding` is
  removed once its only remaining caller is gone. Note that
  `haab-booking-module.tsx:3839` already passes `null` for it on dedicated
  public pages, so the embedded-surface path is unaffected by this change.

## Cases the header must handle

| Provider has | Band shows |
|---|---|
| logo + name | logo, `sr-only` name, live slot |
| logo only | logo, live slot |
| name only | `<h1>` name, live slot |
| neither | live slot alone |
| very long name | truncates on one line, full name in `title` |

The current `renderPublicBranding` returns `null` when there is neither a logo
nor a name. The new header does not: the live slot is still worth showing, and
the language toggle must remain reachable.

## Testing

The existing suite is `lib/`-only; there are no component tests. This change
adds the first ones, under `components/booking/__tests__/`:

- name is suppressed visually but present for assistive technology when a logo
  exists
- name renders visibly when no logo exists
- the band renders with neither logo nor name
- the live slot returns the vertical- and language-correct idle string
- the live slot switches to the advancing string when the flow is fading or a
  hold is being created
- the live slot surfaces `bookingError` when set

## Risks

The `advancing` state is driven by two booleans that already exist but were
never read outside the faded region. If either is left true on a failure path,
the header would be stuck reading `Holding your spot…`. The error state takes
precedence over `advancing` in the slot to bound that failure.
