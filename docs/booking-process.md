# Booking Process

**Status:** current as of 2026-08-05. This is the canonical description of the public booking lifecycle in Haab Calendar.

Use this document for current behavior. `SYSTEM_REFERENCE.md` contains deeper engine history and local-mode details; older plans and recommendation files describe design intent and may not reflect what is deployed.

## 1. Experience overview

The public flow requires no customer account:

1. Choose a service.
2. Choose an available date and, for timed appointments, a start time. Tapping a
   time slot creates the hold immediately and moves to the details step.
3. Enter contact details while the ten-minute hold counts down.
4. Confirm the booking and receive calendar and self-service tools.

Canonical public URLs are:

```text
/{verticalSegment}/{providerSlug}
/{verticalSegment}/{providerSlug}/{serviceSlug}
/{verticalSegment}/{providerSlug}/manage/{token}
```

Supported public vertical segments are `doctors`, `spaces`, `professionals`, and `events`. `?lang=en` and `?lang=es` select the public language without creating a separate route hierarchy.

## 2. Booking modes

The same flow supports three customer experiences:

| Mode | Service model | Availability rule |
| --- | --- | --- |
| Timed appointment | `bookingType = appointment` with `durationMinutes` | Generates non-overlapping slots inside weekly availability. |
| Full-day reservation | `bookingType = full-day` | The selected day must have no conflicting active booking or hold. |
| Capacity event | Events vertical with `maxSpots` | Multiple bookings and holds may share the occurrence until enforced capacity is reached. |

`capacity` remains a human-readable label. Enforced event inventory comes from numeric `maxSpots`; the database triggers count confirmed/rescheduled bookings plus unexpired holds.

## 3. Public page hydration and availability

Canonical public routes resolve the provider and optional service through `lib/public-booking-resolver.ts`. The resolver:

- reads public-safe provider and service data;
- follows provider and service slug redirects;
- loads only active bookings and unexpired holds inside the provider booking window;
- maps database rows into the `ModuleStore` shape expected by `HaabBookingModule`;
- never includes customer contact information or manage-token hashes.

Availability is computed from:

- the provider's booking window and weekly availability;
- the provider's configured timezone and current local time; on the current
  provider date, only slots whose start time is still in the future are shown;
- service duration or occurrence settings;
- active bookings (`confirmed` or `rescheduled`);
- holds whose `expires_at` is later than the current server time;
- event capacity where `maxSpots` is configured.

The browser uses these records to render the calendar, but every booking-critical write repeats validation on the server. A slot shown as available is an invitation to request a hold, not a promise that no other visitor can select it first.

## 3a. Step state machine

Step transitions are owned by the pure reducer in `lib/booking-flow-machine.ts`,
not by ad-hoc updates at each call site. `components/haab-booking-module.tsx`
dispatches events through it; the reducer decides both the next step and what
part of the selection survives.

| Event | Effect |
| --- | --- |
| `SELECT_SERVICE` | Step 2. Clears date and time (slots differ per service). |
| `SELECT_DATE` | Step 2. Clears the time (slots differ per day). |
| `SELECT_TIME` | Step 2. Records the tapped slot before the hold request. |
| `HOLD_CREATED` | Step 3. A server hold exists for this selection. |
| `HOLD_EXPIRED` | Step 2 with a `hold-expired` notice. Keeps service and date, clears the time. |
| `SELECTION_CONFLICT` | Step 2 with a `selection-conflict` notice. Keeps service and date, clears the time. |
| `CONFIRMED` | Step 4 with the returned booking id. |
| `BACK` | Step 3 → 2 keeps service and date; step 2 → 1 is the only path that drops the service. |
| `RESTART` | Step 1 with an empty selection. |

Two invariants follow from the table and are covered by
`lib/__tests__/booking-flow-machine.test.ts`:

- **Back navigation never loses the selected service.** Only `BACK` from the date
  step and `RESTART` clear it, and both are explicit "choose another service"
  actions.
- **Losing a slot is never a dead end.** Expiry and conflict always land on time
  selection with the date intact, so re-booking is one tap.

`resolveReachableStep` clamps a step to what the current selection supports, so a
restored or shared step can never open a screen with no data behind it.

The progress indicator is always on screen: the full three-step indicator
collapses into a pinned compact bar (step dots, current label, `n/3`) once the
header sticks, rather than scrolling away.

## 4. The ten-minute hold

### Creating the hold

For timed appointments, tapping a time slot is what creates the hold — there is
no separate confirm-this-selection step. Full-day and single-occurrence services
have no slot list, so their primary action on the date step creates the hold
instead. Both call:

```text
POST /api/public/{verticalSegment}/{providerSlug}/holds
```

The server:

1. Resolves a published provider and service.
2. Validates the date and provider booking window.
3. Deletes stale expired rows for that provider.
4. Rechecks bookings, active holds, and capacity.
5. Inserts a `booking_holds` row with `expires_at = server now + BOOKING_HOLD_DURATION_MS`
   (`lib/constants.ts`, ten minutes). The client counts down from the same
   constant, so the visible timer and the server expiry cannot drift apart.
6. Returns the hold and `serverNow`.

While the request is in flight the tapped slot shows a holding state and the
other slots are disabled, so a slow network cannot produce two holds. Tapping a
different slot after a hold exists releases the previous one.

Database exclusion/unique constraints protect non-capacity slots. Event-capacity triggers protect shared occurrences. A conflict returns HTTP `409`, and the visitor must choose again.

### Countdown authority

The database `expires_at` timestamp is authoritative. The client countdown is presentation only and calculates:

```text
max(0, hold.expiresAt - serverAdjustedNow)
```

The create, refresh, and extend responses include `serverNow`, allowing the browser to compensate for normal client/server clock differences. Background timer throttling cannot lengthen a hold.

### Warning and grace extension

During the final two minutes, the details screen displays a prominent “Still interested?” warning. The visitor may request one five-minute extension:

```text
PATCH /api/public/{verticalSegment}/{providerSlug}/holds
```

The database function updates `expires_at` and `extension_count` together. It succeeds only when the hold is still active and `extension_count = 0`. The extension is intentionally limited so an abandoned form cannot monopolize a slot indefinitely.

### Offline and reconnect behavior

If the browser loses connectivity:

- the visible countdown continues from the last server-authoritative expiry;
- confirmation and extension actions are disabled;
- no false confirmation is shown;
- reconnecting triggers a hold-status request and refreshes server time.

The same status refresh runs when a backgrounded page becomes visible. If the server reports the hold inactive, the UI switches to the expired state described below.

### Abandonment and release

Leaving the details step, changing the selection, or starting over calls:

```text
DELETE /api/public/{verticalSegment}/{providerSlug}/holds
```

A true page exit also sends a best-effort `pagehide` request with Fetch `keepalive`. That request may not reach the server if the device is offline or the browser process is terminated, so correctness never depends on it.

### Expiry and cleanup

An expired hold frees the slot logically as soon as `expires_at <= now()`:

- availability queries ignore expired rows;
- confirmation requires a matching unexpired hold;
- new hold creation prunes stale rows before database conflict checks;
- event capacity triggers count only unexpired holds.

Supabase Cron runs `cleanup-expired-booking-holds` every minute to remove expired rows physically. Cron is storage cleanup, not the mechanism that makes the slot available.

### What the customer sees when a hold expires

Expiry does not move the customer off the details step, and it never discards
what they typed. The countdown panel switches to an expired state that offers
two exits:

- **Hold this time again** requests a fresh hold for the same selection. If it
  succeeds the countdown restarts and the form is untouched. Only a `409`
  (the slot really is gone) sends the customer back to time selection with a
  `SELECTION_CONFLICT` notice; a failed request leaves the expired panel up so
  the same tap can be retried.
- **Choose another time** returns to time selection, keeping service, date, and
  every entered field.

The same pair of actions replaces Back/Confirm in the step's desktop header row
and mobile action bar while the hold is expired.

### Changing the time without losing the form

The countdown panel also offers **Change time** while the hold is alive. It
releases the hold and returns to time selection; the booking flow reducer keeps
the customer's name, email, phone, and notes, and time selection shows a
"your details are saved" notice whenever any of those fields are filled.

## 5. Confirmation

The details step requires customer name, email, and phone. Confirmation calls:

```text
POST /api/public/{verticalSegment}/{providerSlug}/bookings
```

The request includes the selected service/date/time, customer details, location details, an idempotency key, and the hold ID.

The server:

1. Resolves the published provider and current service.
2. Validates the date window and customer detail payload.
3. Loads active bookings and unexpired holds.
4. Requires the hold to exist and match the service, booking type, date, start, and end.
5. Rechecks slot or capacity availability while ignoring that same hold.
6. Creates the booking with service, price, capacity, location, and structured-detail snapshots.
7. Generates a random manage token, stores only its SHA-256 hash, and returns the raw token in the booking DTO.
8. Deletes the consumed hold and records a `created` booking event.

The UI enters the success step only after the server returns a confirmed booking. HTTP `409` means the hold expired or availability changed. The client does not leave the customer on a form for a slot that no longer exists: it dispatches `HOLD_EXPIRED` or `SELECTION_CONFLICT`, returning to time selection with the reason shown and the entered date preserved. The same applies to the client-side re-validation that runs before the request is sent.

## 6. Confirmation receipt

The success screen is laid out as a receipt worth keeping:

- provider name, a status pill (confirmed, updated, or cancelled), a short
  reference derived from the booking id, and the issue date;
- the date and time in display type, then the full booking summary;
- a perforation, below which sit the take-away tools: a one-tap `.ics`
  download and a scannable inline QR code containing the same calendar event,
  with an enlarged view;
- actions to reschedule, cancel, or book another service;
- the private manage URL in a card of its own, headed "Save this link" and
  captioned "Save this link – you can reschedule or cancel anytime without an
  account", with copy and open actions.

The ICS event also contains the private manage URL. The manage URL contains the raw token and should be treated like a password-reset link: anyone with the URL can manage that booking. The database stores only `manage_token_hash`.

## 7. Self-service reschedule and cancellation

The manage page loads through:

```text
GET /api/public/{verticalSegment}/{providerSlug}/manage/{token}
```

Mutations use:

```text
PATCH /api/public/{verticalSegment}/{providerSlug}/manage/{token}
```

Supported actions are:

- `reschedule` with a replacement date and optional time;
- `cancel`;
- `note`, an optional short message (max 500 characters) the customer leaves for
  the provider. It is merged into the booking's `details` payload as
  `clientNote`, so it never overwrites the notes typed while booking, and it
  appends a `note_added` booking event. Cancelled bookings reject it.

Rescheduling repeats date-window, availability, overlap, and capacity validation while ignoring the booking's current slot. A conflict returns `409`. Cancellation changes status to `cancelled`, which no longer blocks availability. Both actions append a booking event.

### What the private link renders

The manage page is its own screen, not the confirmation receipt. In order:

1. **Status first** — a status pill and a plain-language line saying what it
   means, then the booking's date, time, service, customer, price, and location.
2. **Change this booking** — cancel (with a confirmation dialog), add to
   calendar, show QR, book another, and a one-tap reschedule. Rescheduling
   re-enters the real availability step for the *same* service, with the
   booking's own slot treated as free, a banner naming the currently booked
   time, and a "keep current time" way out. Tapping a slot saves the new time
   directly — no hold is taken, because the booking already exists.
3. **Note for the provider** — the optional `note` action above.
4. **Save this link** — the same private-link card the receipt shows.

Everything on this page works without an account or password.

The authenticated provider dashboard subscribes to booking row changes through
Supabase Realtime. Each notification triggers an authenticated reload of the
provider store, so created, rescheduled, and cancelled bookings are reflected
from the database rather than reconstructed from event payloads. Focus,
visibility, online, and 15-second fallback refreshes cover interrupted Realtime
connections without requiring a manual page reload.

Booking status transitions are:

```text
confirmed  -> rescheduled
confirmed  -> cancelled
rescheduled -> rescheduled
rescheduled -> cancelled
cancelled  -> terminal
```

## 8. Standalone versus integrated behavior

`HaabBookingModule` supports two persistence modes:

- **Integrated public routes:** Supabase is authoritative for public holds, confirmation, rescheduling, and cancellation. Shadow state keeps the current UI responsive after successful server writes.
- **Standalone/demo mode:** `useModuleStore` persists providers, services, bookings, and holds in browser `localStorage`. Local pruning and cross-tab storage events preserve the demo/offline workflow, but this mode cannot coordinate separate devices.

Local storage is never used as proof that an integrated public booking was confirmed. Losing connection preserves form fields in React while the page remains open, but the server must accept the confirmation.

## 9. Security and privacy invariants

- Public visitors never write directly to `bookings` or `booking_holds`.
- Next.js Route Handlers use the server-only Supabase admin client after validating public inputs.
- Anonymous clients do not receive raw booking lists, customer information, booking events, or manage-token hashes.
- Provider administration uses authenticated ownership checks and RLS.
- Published public routes resolve only providers allowed to publish.
- Snapshot values are computed from the current service on the server, not trusted from the browser.
- Expiry and capacity decisions use database/server time.

## 10. Failure-state expectations

| Condition | Customer behavior |
| --- | --- |
| Slot taken while selecting | Hold request returns `409`; the slot list refreshes and the customer chooses another time. |
| Connection lost during details | Countdown continues; extend/confirm disabled until reconnect. |
| Hold expires | The customer stays on the details step with the form intact; the countdown panel offers "hold this time again" (one tap for the same slot) and "choose another time". The slot is immediately available to others, so the retry can lose to someone else. |
| Extension already used | Server refuses another extension; client refreshes hold state. |
| Confirmation conflicts | No success screen; returned to time selection with a "someone confirmed that time first" notice; nothing is booked. |
| Manage token invalid | Standard not-found/error state without revealing booking data. |
| QR generation fails | Booking remains confirmed; show the localized QR error and keep the ICS option. |

## 10b. Outbound integration events

Every Supabase-backed booking write — public confirmation, self-service cancel
or reschedule, provider cancel or reschedule, note edits — also writes one row
to `public.integration_outbox_events`, in the same transaction, through a
trigger. Nothing in the booking flow calls an outside system during the request.

- The booking's `integration_version` rises once per integration-relevant
  change; a write that only touches `updated_at` or an internal field produces
  no event.
- The event carries identifiers only. Client name, email, phone, notes, and
  details stay in `bookings`.
- A background worker delivers events at-least-once with leases and bounded
  retries. Until a Google Calendar adapter exists, every event terminates as
  `skipped` / `no_active_integrations`.
- `public.booking_events` is unchanged and remains the provider-visible audit
  history. The outbox is private operational state.

See `docs/backend-implementation.md` for the state machine and retry policy.

## 11. Main implementation files

| Area | File |
| --- | --- |
| Public flow orchestration | `components/haab-booking-module.tsx` |
| Step transitions | `lib/booking-flow-machine.ts` (tests in `lib/__tests__/booking-flow-machine.test.ts`) |
| Progress indicator (full + compact) | `components/ui/PublicProgressIndicator.tsx` |
| Countdown and warning UI | `components/ui/BookingHoldCountdownBar.tsx` |
| Hold timing helpers | `lib/holds.ts`, `lib/constants.ts` |
| Public page resolution | `lib/public-booking-resolver.ts` |
| Hold API | `app/api/public/[verticalSegment]/[providerSlug]/holds/route.ts` |
| Confirmation API | `app/api/public/[verticalSegment]/[providerSlug]/bookings/route.ts` |
| Manage API | `app/api/public/[verticalSegment]/[providerSlug]/manage/[token]/route.ts` |
| Server booking rules | `lib/supabase/bookings.ts` |
| Store modes | `components/booking/state/useModuleStore.ts` |
| Provider refresh API | `app/api/provider/store/route.ts` |
| Schema catalog | `docs/supabase-schema-catalog.md` |
| Hold resilience migration | `supabase/migrations/20260804123315_make_booking_holds_resilient.sql` |
| Provider booking Realtime migration | `supabase/migrations/20260804164334_stream_booking_changes_to_providers.sql` |

## 12. Verification checklist

For changes to the booking process, run:

```bash
npx tsc --noEmit
npm test
npm run build
npx supabase db lint --linked
```

Browser smoke-test at least one canonical public route on a mobile viewport:

1. Tap a time slot and verify a `POST …/holds` fires immediately, the details step
   opens, and the countdown starts close to ten minutes.
2. Simulate offline/online and verify confirmation gating plus server refresh.
3. Verify the final-two-minute warning and one-time extension.
4. Verify expiry returns to time selection with the "hold ran out" notice, keeps
   the service and date, and lets a new slot be tapped straight away.
5. Verify the expired/abandoned slot can be held by another visitor.
6. Verify the progress indicator stays visible while scrolling (compact bar).
7. Verify back navigation from details keeps the selected service and date.
8. Complete a booking, download ICS, display QR, and open the manage link.
9. Reschedule and cancel through the manage link.
10. Keep the authenticated provider dashboard open in a second browser and verify each customer change appears without a manual refresh.

To exercise expiry without waiting ten minutes, temporarily lower
`BOOKING_HOLD_DURATION_MS` in `lib/constants.ts` — the server reads the same
constant, so both sides shorten together. Restore it before committing.
