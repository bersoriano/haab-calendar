# Backend and Offline Interaction

**Status:** current as of 2026-08-04.

Haab Calendar deliberately keeps standalone local behavior separate from production booking authority. This document defines that boundary. See `docs/booking-process.md` for the complete customer lifecycle.

## Two operating modes

### Standalone/demo mode

When `HaabBookingModule` is mounted without a complete `injectedConfig`, `useModuleStore` uses browser localStorage.

It supports:

- provider, service, and availability setup;
- local bookings and holds;
- hold pruning by local epoch time;
- cross-tab synchronization through the browser `storage` event;
- local reschedule/cancel and manage-token behavior.

This mode is useful for development, demos, and embedding. It coordinates tabs sharing the same origin and browser profile, but it cannot prevent conflicts between separate devices.

### Integrated public mode

Canonical `/{vertical}/{providerSlug}` routes resolve provider data from Supabase and inject a `ModuleStore` into the same UI.

In this mode:

- Supabase rows are authoritative for public bookings and holds;
- public booking-critical writes go through Next.js Route Handlers;
- server responses are mirrored into the module's shadow state;
- localStorage is not proof of a confirmed booking;
- database constraints/triggers decide conflicts and capacity;
- the server `expires_at` timestamp controls hold validity.

## Why the UI still uses `ModuleStore`

Keeping one frontend shape prevents database column names and Supabase coupling from spreading across components. `lib/public-booking-resolver.ts` translates public-safe rows into the existing domain types.

The integrated store may contain operational schedule projections, but it does not contain public customer details. Private booking lookup requires provider authentication or the customer's manage token.

## What survives a lost connection

While the page remains open, React keeps the current selection and entered details. The countdown continues from the last server-synchronized expiry.

Offline behavior is intentionally conservative:

- the customer cannot extend the hold;
- the customer cannot confirm;
- the UI does not claim success;
- reconnecting checks the hold before enabling actions again.

If the hold expired while offline, reconnect changes the flow to the expired state. If the browser or device closes, the server row expires independently.

This is recovery of an in-progress screen, not an offline booking queue. Haab does not enqueue a public confirmation and promise to submit it later because availability may change before connectivity returns.

## Abandonment

Explicit back/change/start-over actions release the active hold locally and on the server. A real page exit sends a best-effort keepalive release request.

The release request is an optimization. It can fail when the device is offline or the process is terminated. Availability remains correct because all server reads and capacity checks ignore `expires_at <= now()`, and a scheduled cleanup removes expired rows physically.

## Server/client reconciliation

For integrated public bookings, the server wins for:

- whether a hold is active;
- the hold expiry and extension count;
- whether a slot conflicts;
- whether an event has remaining capacity;
- whether confirmation succeeded;
- the stored booking status after reschedule/cancel.

The client may preserve unsent form fields for convenience, but it must replace operational booking/hold state with the server response.

## Privacy boundary

Standalone localStorage contains only data created in that browser. Integrated data is shared and therefore follows stricter rules:

- no raw customer booking list on a public page;
- no direct public write grants to booking/hold tables;
- no manage-token hashes in browser responses;
- no service-role key in client code;
- customer access to an existing booking requires the raw private manage token.

## Development rules

When changing the public flow:

1. Preserve standalone mode unless the request explicitly removes it.
2. Do not fall back to local confirmation when an integrated server write fails.
3. Keep database-to-domain mapping in server/resolver modules.
4. Treat browser timers as display state, never as expiry authority.
5. Exercise offline, reconnect, background resume, abandonment, expiry, and conflict behavior.

## Verification

Run the automated checks from `docs/booking-process.md` and smoke-test both modes:

- standalone local booking with refresh and cross-tab behavior;
- canonical integrated booking with server hold and confirmation;
- offline/online transition during details;
- expired hold returning to availability;
- manage-link reschedule and cancellation.
