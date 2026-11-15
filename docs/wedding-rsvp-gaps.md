# Wedding RSVPs: what the demo shows and what is missing

Status: notes written 2026-11-08, alongside the `weddings` demo
(`/events/boda-valeria-y-diego`). Every item below except 10 is now addressed by
the invitation-only RSVP work (PRs #83–#88, design in
`docs/superpowers/specs/2026-11-08-wedding-rsvp-design.md`), and the demo
shows it. Still open: the guest list editor does not queue edits offline (it
shows the saved list read-only), and the English toggle does not translate the
Spanish demo's own text.

## The scenario

A wedding planner wants Haab to manage attendance for a wedding they organize.
The model was a real Mexican wedding invitation page (Spanish, couple story,
photo gallery, parents' blessing, "the day we imagined" captions, and an RSVP
section where guests find their invitation by the phone number the couple has
on file, by WhatsApp or SMS code). That page gives no times, venue address,
dress code, registry, lodging or FAQ. The demo uses invented names, places and
numbers, not the real couple's.

## How the demo maps it onto today's product

The demo is a provider on the **events** vertical, owned by a fictional
planner (Mariana Salgado), published as "Boda de Valeria & Diego".

| Wedding need | Demo uses | Works? |
| --- | --- | --- |
| Several moments over a weekend | Three single-date events: welcome dinner (Fri), ceremony and reception (Sat), tornaboda brunch (Sun) | Yes |
| Venue capacity per moment | `max_spots` per event: 90 / 180 / 70 | Yes |
| Headcount | Each confirmation takes one seat; the page shows seats left | Yes, one seat per RSVP |
| Dietary needs | `traveler_fields: ["diet"]` | Yes, free text |
| Shuttle from the hotel | `traveler_fields: ["hotel_pickup"]` | Yes, but labelled "Recogida en hotel" |
| Dress code, adults only, venue notes | Service `notes` ("Antes de llegar") | Yes, as plain text |
| "Let us know if plans change" | `cancellation_policy` plus the guest's private link | Yes, but labelled "Política de cancelación" |
| Guests are not charged | `cost: "Sin costo"` | Yes, but the summary still says "Precio" |
| Two locations (Cuernavaca, Xochitepec) | `address_1` / `address_2` linked per event | Yes |
| Dates stay in the future | Saturday from `inWeeks(10, 6)`; Friday and Sunday derived from it | Yes |

Verified against a local Supabase stack: the page renders at phone and desktop
widths, and the ceremony RSVP reaches the details step with the diet and hotel
fields and a 10-minute seat hold.

## What is missing, by how much it hurts

### 1. Party size and plus-ones (high)

Events take one seat per confirmation. `partySize` only exists for restaurant
slot capacity (`capacity_scope = 'slot'`), and there it counts tables, not
people. A couple must RSVP twice, each with their own name, phone and email, and
nothing stops one guest from taking eight seats with eight bookings.

Needed: a party size on event bookings that takes that many seats from
`max_spots`, capped per invitation (see 2).

### 2. Guest list and invitation gating (high)

Anyone with the link can RSVP. A wedding is invite-only, and each invitation
has a fixed number of seats ("this invitation is for 2"). The model page gates
the RSVP behind a phone lookup and personal links.

Needed: an invitation (household) record the planner imports or types in, with
name, phone and allotted seats; a personal link per invitation; and an option
to make an event page invitation-only. The existing private manage link
(`booking-tokens`) is the nearest building block. `provider_clients` (added
2026-11-03) might hold the household list.

### 3. "Will not attend" answers (high)

A booking can only say yes. The planner needs three states per invited guest:
attending, declined and no answer, so they can chase the silent ones.

Needed: a decline response that records the guest without taking a seat, plus a
"no answer yet" view, which only makes sense once 2 exists.

### 4. One RSVP for the whole weekend (medium)

Each moment is its own four-step booking. A guest attending all three goes
through the flow three times. Needed: a multi-event RSVP that asks once and lets
the guest tick which moments they attend.

### 5. Wedding vocabulary (medium)

The page speaks of "evento", "registro", "Reserve su lugar", "Precio",
"Política de cancelación" and "Recogida en hotel". The tours word set
(`Vocabulary = "tours"`) shows the pattern: add `"weddings"` to the
`providers_vocabulary_known` check and to `lib/vertical-copy.ts`, with words
such as invitados, confirmar asistencia, cambio de planes and transporte. The
summary should hide "Precio" when an event costs nothing.

### 6. RSVP deadline and reminders (medium)

Bookings stay open until the event starts. Caterers need a final count weeks
before. Needed: a per-event "RSVPs close on" date, separate from the booking
window, and a reminder to guests who have not answered (Resend is already
wired for email; WhatsApp or SMS would match how Mexican weddings are run).

### 7. Structured answers for suppliers (medium)

Diet is free text. Caterers want counts: meal choice (for example beef, fish,
vegetarian), children's menus and allergies. Needed: optional choice fields per
event with a per-option count on the dashboard, and an export (CSV) of the guest
list per event. Not checked: whether the current bookings list can export.

### 8. Seating and check-in (low)

Table assignment and door check-in (the booking pass could carry a QR code)
are what planners use on the day. Both are new features.

### 9. Invitation storytelling (low, product decision)

The model page is mostly story: the couple's history, a photo gallery, the
parents' names, an envelope animation and music. Haab has a hero text, a header
image and gallery images. On the dedicated public page the hero text only shows
with a header image, so this demo's hero line is not visible. Needed, if
weddings become a real vertical: a few optional content sections (story,
schedule, dress code, registry, lodging, FAQ). This may be better left to the
invitation site, linking to Haab for the RSVP.

### 10. English version of a Spanish demo (low)

`lib/public-content-i18n.ts` only translates English demos into Spanish. This
demo is written in Spanish, so the English toggle changes the interface but not
the event text, the same as the other Spanish demos.

## Suggested order

1 and 2 together (party size bounded by an invitation's seats), then 3, then 5.
Those four turn the demo from "an events page that happens to be a wedding"
into an RSVP tool a planner would hand to a couple.
