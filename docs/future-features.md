# Future features — product backlog

Product/feature ideas not yet built. This is the **product** wishlist; the
engineering decomposition/refactor backlog lives in
[`refactor-todos.md`](refactor-todos.md), and reproducible test scripts live in
[`manual-tests/`](manual-tests/).

Status legend: 🔴 not started · 🟡 partial · ✅ done (then move out).

---

## Events vertical

Came out of the events single-occurrence / weekly-recurrence work (June 2026).

### High value

- 🔴 **Group registration / headcount.** Today capacity = one spot per
  registration; a party of 4 still decrements 1. Add a per-registration "number
  of guests" and make `getSpotsLeft` subtract Σ guests. `getSpotsLeft` is already
  structured for this (swap the count for a sum). Deferred by decision on
  2026-06-16.
- 🔴 **Notifications.** A confirmation email is collected but nothing is sent —
  confirmations are local-only. Add email + calendar invite (`.ics` is already
  generated for download). Depends on the Supabase/backend sync path
  (offline-first: queue + send on sync).
- 🔴 **Ticket types / tiers.** One price per event today. Support multiple tiers
  (GA / VIP, member / guest) with independent prices and per-tier capacity.
- 🔴 **Waitlist when full.** When a date hits 0 spots, let attendees join a
  waitlist and auto-promote on cancellation.

### Cross-vertical (surfaced by the healthcare urologist test)

- 🔴 **Per-location pricing.** A service has one `cost` string, but a provider
  with multiple addresses may charge differently per location (e.g. a urologist
  whose State-of-Mexico clinic is 75% of the Mexico-City price). Today this is
  only expressible as free-text in `cost`. Wanted: structured per-address price
  (and a location pick in the public flow so the patient sees the right price).
  See `manual-tests/healthcare-urologist.md`.

### Medium

- 🔴 **Recurrence end-date + exceptions.** Weekly events recur forever. Add an
  "ends on" date, blackout/skip dates (holidays), and multi-week patterns
  (every other week). True calendar recurrence (RRULE) is the larger version.
- 🔴 **Timezone display.** Events show a fixed local time with no timezone; a
  KL event viewed from another timezone is ambiguous. Show/booker-convert TZ.
- 🔴 **Past-event handling.** Single events with a past date linger in the admin
  list; add auto-archive / "past" grouping.

### Low / decisions

- 🔴 **Reconsider "Periodic" mode for events.** Now that **Weekly** (per-event
  weekday + time) exists, the global-availability "Periodic" mode is rarely the
  right choice for events and adds a third option to the toggle. Decide: keep,
  hide-for-events, or merge. Product decision, not a bug.
- 🔴 **Per-slot spots-left on the calendar.** Spots-left now shows on the chosen
  date's panel; optionally surface remaining spots per day directly in the
  calendar cells.

---

## Cross-vertical / platform

- 🔴 **Remaining copy decks.** `spaces` and `professional` verticals still fall
  back to `defaultCopy` (only `healthcare` and `events` have full decks). See
  `lib/vertical-copy.ts`.
- 🔴 **Real backend sync.** Offline-first is in place; the Supabase sync target
  is not wired end-to-end (see `docs/backend-implementation.md`). Unblocks
  notifications, cross-device bookings, and analytics.
- 🔴 **Provider analytics.** Registrations over time, fill rate, no-shows.

---

## Recently shipped (for context)

- ✅ Events copy deck (2026-06-16).
- ✅ Single-occurrence events — fixed date + time, no calendar, spots cap.
- ✅ Weekly-recurring events — per-event weekday(s) + fixed time.
- ✅ Capacity = numeric spots (single source of truth); spots-left shown across
  single / weekly / periodic.
