# Manual test — Events / capacity + spots-left

Covers the capacity model for events:

- **Spots are the single source of truth.** Events have one numeric "Maximum
  spots"; the free-text Capacity field is gone for events.
- **Spots-left is shown everywhere** a date is in play (single card, and the
  weekly/periodic slot panel once a date is chosen).
- **One spot per registration** (no party-size/headcount field).

Last run: 2026-06-16 · Result: **PASS**.

---

## Setup

Any events workspace works (see the yoga or hotel scripts). Have at least one
event with a numeric Maximum spots and one confirmed registration on a bookable
date.

## Provider checks (#2 — capacity collapse)

Events tab → add/edit an event:

- The editor shows **Maximum spots** only — there is **no** free-text "Capacity"
  field for events (other verticals still have it).
- Event list cards and the public "Choose an event" cards show a derived
  capacity: **"Up to N spots"** (singular "1 spot" when N = 1), not a hand-typed
  string.
- Saving stores no free-text capacity for events; `capacitySnapshot` on new
  bookings is the derived "Up to N spots".

## Public checks (#3 — spots-left visible)

- **Single event:** the fixed date/time card shows **"N spots left"** (already
  covered by the single-occurrence test). At 0 → "Fully booked".
- **Weekly / periodic event:** pick a bookable date on the calendar. The
  "Available time slots" panel header shows
  **"<date> · N spots left"**.
- Register once on that date → reopen → the count drops by exactly 1
  (one spot per registration).
- When a date reaches 0 spots it becomes unavailable on the calendar
  (enforced by `isDateAvailable` / `getSpotsLeft`).

## Findings (2026-06-16)

| # | Severity | Finding | Status |
|---|---|---|---|
| 2 | — | Free-text Capacity removed for events; capacity derived from `maxSpots` ("Up to N spots") across editor list, public cards, details, confirmation, and booking snapshot. | **Pass** |
| 3 | — | Spots-left surfaced on the weekly/periodic date panel ("<date> · N spots left") in addition to the single-occurrence card. Verified 12 − 1 booking = "11 spots left". | **Pass** |
| 1 | n/a | Headcount/party-size was scoped out — capacity is one spot per registration by decision. | Deferred |

### Notes

- `getSpotsLeft` counts active registrations (1 each). If party-size is added
  later, switch it to sum a per-booking guest count.
- Pre-existing bookings keep their original `capacitySnapshot` text (e.g. an old
  "Up to 12 yogis"); only new bookings use the derived "Up to N spots".
