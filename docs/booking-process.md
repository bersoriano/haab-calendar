# Booking Process

**Status:** current as of 2026-08-04. This is the canonical description of the public booking lifecycle in Haab Calendar.

Use this document for current behavior. `SYSTEM_REFERENCE.md` contains deeper engine history and local-mode details; older plans and recommendation files describe design intent and may not reflect what is deployed.

## 1. Experience overview

The public flow requires no customer account:

1. Choose a service.
2. Choose an available date and, for timed appointments, a start time.
3. Receive a temporary hold and enter contact details.
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

## 4. The ten-minute hold

### Creating the hold

Moving from date/time selection to customer details calls:

```text
POST /api/public/{verticalSegment}/{providerSlug}/holds
```

The server:

1. Resolves a published provider and service.
2. Validates the date and provider booking window.
3. Deletes stale expired rows for that provider.
4. Rechecks bookings, active holds, and capacity.
5. Inserts a `booking_holds` row with `expires_at = server now + 10 minutes`.
6. Returns the hold and `serverNow`.

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

The same status refresh runs when a backgrounded page becomes visible. If the server reports the hold inactive, the UI immediately switches to the expired state and directs the visitor back to availability.

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

The UI enters the success step only after the server returns a confirmed booking. HTTP `409` means the hold expired or availability changed; the customer is sent back to choose again.

## 6. Confirmation tools

The success screen provides:

- a clear confirmed, updated, or cancelled status;
- a complete booking summary;
- a one-tap `.ics` calendar download;
- a scannable inline QR code containing the same calendar event, with an enlarged view;
- a private manage URL that can be opened or copied directly;
- actions to reschedule, cancel, or book another service.

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
- `cancel`.

Rescheduling repeats date-window, availability, overlap, and capacity validation while ignoring the booking's current slot. A conflict returns `409`. Cancellation changes status to `cancelled`, which no longer blocks availability. Both actions append a booking event.

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
| Slot taken while selecting | Hold request returns `409`; refresh and choose another slot. |
| Connection lost during details | Countdown continues; extend/confirm disabled until reconnect. |
| Hold expires | Expired message appears; slot is immediately available to others. |
| Extension already used | Server refuses another extension; client refreshes hold state. |
| Confirmation conflicts | No success screen; return to availability. |
| Manage token invalid | Standard not-found/error state without revealing booking data. |
| QR generation fails | Booking remains confirmed; show the localized QR error and keep the ICS option. |

## 11. Main implementation files

| Area | File |
| --- | --- |
| Public flow orchestration | `components/haab-booking-module.tsx` |
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

1. Create a hold and verify the countdown is close to ten minutes.
2. Simulate offline/online and verify confirmation gating plus server refresh.
3. Verify the final-two-minute warning and one-time extension.
4. Verify expiry changes the action to “choose another time.”
5. Verify the expired/abandoned slot can be held by another visitor.
6. Complete a booking, download ICS, display QR, and open the manage link.
7. Reschedule and cancel through the manage link.
8. Keep the authenticated provider dashboard open in a second browser and verify each customer change appears without a manual refresh.
