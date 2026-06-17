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

## Internationalization

- 🔴 **Spanish translation across all verticals (i18n).** The whole UI is
  English-only, but real providers are Spanish-speaking (e.g. the UM Grupo
  Médico urologist in Mexico). Add a language layer so every vertical can render
  in Spanish (and be extensible to more locales).
  - **Where the strings live:** `lib/vertical-copy.ts` already centralizes the
    per-vertical wording (`VerticalCopy` decks: default/healthcare/events/
    spaces/professional). The natural shape is a locale dimension on top —
    e.g. `getVerticalCopy(verticalId, locale)` returning the right deck, with
    `es` decks mirroring the existing `en` ones. Plus the still-hardcoded
    English strings in `components/haab-booking-module.tsx` and the setup wizard
    (e.g. "Pick a date and time", "My Details", "Available time slots",
    weekday/month formatting) need extracting into the same system.
  - **Scope:** translate all five decks + the hardcoded UI strings; localize
    date/time formatting (currently `en`-style); a locale selector (provider
    setting and/or `?lang=es` / Accept-Language on public pages); keep English
    as fallback. Offline-first: bundle locale strings, no network.
  - **Out of scope for v1:** user-generated content (service names, notes) stays
    as the provider typed it.

## Public-page branding

- 🔴 **Manual image carousel (3 images below the header).** The header banner
  ships now; the `ProviderInfo.galleryImageUrls` field is already reserved (max
  3). Build the uploader (reuse `HeaderImageUploader` + `/api/blob/upload` +
  `validateImageFile`) and a manual (arrow/dot) carousel rendered below the
  header at the public root. All verticals.
- 🔴 **Header image cross-device.** The header URL lives on the provider record
  and shows wherever that store loads (own-browser today). To show it on other
  devices via Supabase: add `public_providers.header_image_url`, include it in
  `PUBLIC_PROVIDER_SELECT` + `PublicProviderRow`, map it in `toPublicStore` —
  and it still needs the (unbuilt) provider write-sync to populate. See
  `docs/superpowers/specs/2026-06-16-provider-header-image-design.md`.

## Cross-vertical / platform

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
- ✅ Full copy decks for all four verticals (`spaces` + `professional` added;
  healthcare + events already done).
- ✅ Hide Reschedule for single-occurrence events (one fixed date — cancel
  instead).
- ✅ Provider header image — upload to Vercel Blob, shown as a banner at the
  public root above the selection (all verticals). Carousel field reserved.
- ✅ Hero text on the header image (editable, defaults to business name) + a
  centered business-name hero above the image.
- ✅ Per-location pricing — per-location price overrides, a "Choose a location"
  selector on step 2, effective price + chosen location recorded on the booking.
