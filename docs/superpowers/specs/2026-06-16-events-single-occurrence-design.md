# Events: single-occurrence scheduling — design

Date: 2026-06-16
Status: approved (design)
Scope: events vertical only. Additive; no change to healthcare/spaces/professional behavior.

## Problem

The booking module assumes every provider runs a **recurring weekly** schedule
(`WeeklyAvailability`) and the public flow always renders a month calendar so the
client picks a day. For events (a one-off Eiffel Tower visit, a single cooking
class, a yoga master class) this is wrong: the event happens on **one fixed date
and time**. A month calendar where only one day is real "makes no sense."

Events providers (organizers) need to choose, **per event**, between:

- **Single occurrence** (default) — one fixed date + time window.
- **Periodic occurrence** — today's recurring weekly behavior, unchanged.

Events must also always let the organizer set a **maximum capacity in spots**,
and the public side shows **spots remaining**.

## Decisions (locked via brainstorming)

1. Occurrence mode lives **per service (event)**, not per provider. An organizer
   can mix a single one-off and a periodic class on the same page.
2. Single-occurrence data lives on the `Service`: `occurrenceMode`,
   `occurrenceDate`, and a fixed time window (`startTime`/`endTime`).
3. Public UI for a single-occurrence event shows a **fixed date/time card** with
   spots-left — no month calendar. Attendee confirms and registers.
4. "Periodic occurrence" maps to the **existing** weekly-availability + calendar
   flow. No new recurrence engine (no RRULE).
5. Events always expose a **numeric max capacity** (`maxSpots`); the public card
   computes `spotsLeft = maxSpots - activeRegistrationsForThatDate`. Full = 0
   left → unavailable.
6. Default for new events: `occurrenceMode = "single"`.
7. `bookingType` (appointment/full-day) is ignored in single mode — a single
   event is always a fixed date + time window. The appointment/full-day control
   is hidden when Single is selected.

## Data model (`lib/types.ts`) — additive

Add to `Service` and `ServiceDraft`:

```ts
occurrenceMode?: "single" | "periodic"; // undefined = legacy/periodic
occurrenceDate?: string;                 // "YYYY-MM-DD", single mode only
startTime?: string;                      // "HH:MM", single window start
endTime?: string;                        // "HH:MM", single window end
maxSpots?: number;                       // events: required max capacity
```

- `occurrenceMode === undefined` is treated as **periodic/legacy** everywhere, so
  healthcare/spaces/professional are untouched.
- Events new-service drafts default `occurrenceMode: "single"`.
- `BookingRecord` needs **no schema change**: a single-occurrence registration
  stores `dateKey = occurrenceDate`, `startTime`/`endTime` = the window.

## Provider — `ServiceEditor.tsx` (events only)

Gated by `vertical === "events"` (same pattern as the existing
`vertical === "healthcare"` branch).

- **Occurrence radio:** ● Single / ○ Periodic. Default Single.
- **When Single:** show **Date** picker + **Start**/**End** time inputs on the
  event; hide the appointment/full-day (`bookingType`) control.
- **When Periodic:** existing controls; global weekly `AvailabilityEditor`
  applies as today.
- **Max spots:** numeric input, shown for all events regardless of mode.
- **Validation (new copy errors):**
  - Single event requires `occurrenceDate` before publish.
  - Events require `maxSpots >= 1`.

The global `AvailabilityEditor` stays — it governs periodic events only. If every
event is single, it is simply unused (no removal needed).

## Availability seam (`lib/availability.ts`)

Branch on `service.occurrenceMode === "single"`:

- `isDateAvailable(dateKey, service, ...)`: for single mode, available **only**
  when `dateKey === service.occurrenceDate`, the date is not past, and
  `spotsLeft > 0`. Periodic path unchanged.
- `getAvailableSlots(...)`: for single mode, the only slot is the fixed
  `startTime`–`endTime` window (subject to spots remaining). Periodic path
  unchanged.
- New helper `getSpotsLeft(service, dateKey, bookings)` =
  `maxSpots - count(active bookings for service on dateKey)`. Used by both the
  availability check and the public card. Applies to **events** (single and
  periodic) wherever `maxSpots` is set.

## Public flow (`components/haab-booking-module.tsx`)

In `renderPublicFlow` / step 2:

- When `selectedService.occurrenceMode === "single"`, render a **fixed date/time
  card** instead of `renderPublicCalendar`:
  - Shows formatted event date + time window and **"N spots left"**.
  - Auto-sets `bookingFlow.dateKey = occurrenceDate` and `bookingFlow.time` to the
    window start.
  - Primary button uses events copy (`copy.bookVerb` / "Reserve my spot") →
    advances to the details step.
  - If `spotsLeft <= 0`: show "Fully booked" state, disable the button.
- Periodic events keep `renderPublicCalendar`.
- For periodic events with `maxSpots`, the calendar's per-day availability already
  routes through `isDateAvailable`, which now also enforces spots.

## Copy (`lib/vertical-copy.ts`) — additive

New `VerticalCopy.phrases` keys (added to `defaultCopy`, `healthcareCopy`,
`eventsCopy` since the interface requires all keys):

- `eventDateLabel` — label for the fixed date/time card.
- `singleOccurrenceHelper` — helper under the card / step.
- `pickEventDateError` — "Pick the event date before publishing." (events voice).
- `maxSpotsRequiredError` — "Set the maximum number of spots." (events voice).
- `spotsLeftLabel` — e.g. "{n} spots left" template (or a function-free
  "spots left" suffix; implementation picks the simplest typed form).
- `fullyBookedLabel` — "Fully booked".

Generic decks get neutral wording; `eventsCopy` gets the events voice.

## Seed (`config/verticals.ts`)

Events services seeded with `occurrenceMode: "single"`, empty `occurrenceDate`
(organizer fills), and a numeric `maxSpots` (e.g. 50 / 200 matching existing
"Up to N attendees" copy). Other verticals' service drafts get
`occurrenceMode: "periodic"` (or leave undefined = legacy).

## Testing

- `lib/__tests__/availability.test.ts`: new cases —
  - single-occurrence date available only on `occurrenceDate`, blocked when past;
  - `getSpotsLeft` math; date becomes unavailable at 0 spots;
  - `getAvailableSlots` returns the single window in single mode.
- Existing 138 tests must stay green.

## Out of scope (YAGNI)

- Recurrence rules (RRULE / "every Tuesday"). Periodic = existing weekly only.
- A runtime dropdown to rename copy (separate deferred task).
- Per-attendee waitlists when full.

## Non-goals / invariants

- No behavior change for healthcare, spaces, professional.
- Offline-first preserved: all new fields live in the local store, no new network
  dependency.
- All changes additive to existing types and components.
