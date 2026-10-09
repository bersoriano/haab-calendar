# Booking retention

Approved policy: permanently delete bookings whose scheduled date is more than one calendar month before today in the provider's timezone. Premium providers may opt into one calendar year of history; the preference defaults to off. The seven-day Archive remains a presentation filter. Future bookings are never expired based on their creation time. “Sessions” means booked appointments, not authentication sessions.

## Architecture

- Add `booking_history_retention` to the existing feature catalog and Premium plan. Persist the separate boolean preference `providers.keep_booking_history_one_year`, default false, through the normal dashboard save flow.
- A private database helper resolves billing precedence and active manual overrides. A trigger validates attempts to turn the preference on, including direct authenticated writes. Turning it off remains allowed. A saved true preference without current access has an effective one-month policy.
- A service-role-only `purge_expired_bookings` RPC computes current policy and deletes at most 500 rows per call, accepting a bounded test clock and batch size. Provider row locks serialize preference changes with deletion; booking locks skip concurrent work. Invalid timezone falls back to UTC. Month/year subtraction clamps to the last day of the target month, including leap years.
- An authenticated cron endpoint calls the RPC. A daily GitHub workflow uses the same Production environment and worker secrets as integration workers, drains bounded batches, and reports failures. No migration or page view deletes existing records. Running the production cleanup requires the migration and deployed scheduler.
- Booking deletion cascades existing booking events, integration outbox records and Google mapping/conflict records, and nulls analytics booking references according to current foreign keys. It does not cancel a booking, delete an external Google event, delete a service, or change login sessions. Anonymous analytics retain their independent 13-month policy.

## Experience

Settings shows a Premium checkbox named “Keep booking history for one year”, off initially, disabled when access is unavailable. The current effective policy and permanent-deletion warning remain visible for every owner. The normal save bar saves the preference. Bookings shows the current saved policy and links to Settings. Unsaved preference edits must not claim that one-year retention is already active. Notices explain that disabling the option or losing access restores one-month deletion on the next cleanup; deleted history cannot be recovered.

English and Spanish copy cover both surfaces. Privacy retention wording and the booking process, deployment and Premium entitlement documentation must reflect the policy.

## Verification

Unit tests cover entitlement resolution, strict preference normalization and persistence, notices and access states, worker failure and authorization. Local database tests run actual SQL deletion, month and leap-year boundaries, provider timezone, billing/override precedence, default-off, downgrades, future dates, cascading references, batch limits and direct-write authorization. Verify typecheck, lint, unit suite, production build and browser UI.

## Operational limits

Daily scheduling is best-effort; expired records may remain until the next successful cleanup. Cleanup returns counters only. Entitlement/database errors abort the transaction instead of assuming shorter retention. Rolling back code or stopping the schedule cannot restore deleted records.
