# Booking history retention

## Policy

Daily cleanup permanently deletes bookings whose scheduled date is strictly
before the provider's local today minus one calendar month. All booking statuses
qualify. Future bookings are protected regardless of creation time. Records
exactly at the cutoff remain. Calendar arithmetic clamps month-end and leap-day
boundaries; invalid stored timezones fall back to UTC.

Premium owners can enable **Keep booking history for one year** in Settings.
This preference defaults to false, including existing accounts. One calendar
year applies only when the saved preference is true and the
`booking_history_retention` entitlement is active. Active feature overrides take
precedence over billing state, then the legacy provider tier. An explicit deny
override wins over Premium. Read failures abort cleanup rather than shortening
retention. Disabling the preference or losing entitlement restores one-month
retention at the next cleanup. Deleted records cannot be recovered by re-enabling
the option. Dashboard notices show the saved policy separately from pending
edits; unresolved entitlement reads show an unavailable policy notice.

The seven-day Archive remains a dashboard filter. Here, sessions means booked
appointments; authentication sessions are outside this policy. Booking events,
integration outbox records, and local Google mappings/conflicts follow existing
foreign-key cascades. Anonymous page analytics retain their separate 13-month
policy, with booking references cleared. External Google Calendar events are
not deleted: removal of history is not appointment cancellation.

## Access and scheduling

Migration `20261009071120_booking_history_retention.sql` adds the default-off
preference and guards changes from false to true with an entitlement trigger.
Unchanged true preferences and turning the option off remain writable after a
downgrade. Public provider reads do not expose this preference.

`public.purge_expired_bookings` is executable only by `service_role`. The worker
calls it with batches of 500. Row locks serialize preference writes against
cleanup; locked rows are skipped and can be processed on a later run. Cleanup
does not run when the migration is applied.

`GET /api/cron/booking-retention` requires `Authorization: Bearer <CRON_SECRET>`.
Missing or wrong credentials return 401. Successful responses contain only
`deletedBookings` and `hasMore`; failures return a generic 500. Logs omit customer
details and database error text.

The separate `booking-retention.yml` GitHub workflow runs at 08:17 UTC daily and
supports manual dispatch. Configure `WORKERS_BASE_URL` and `CRON_SECRET` in the
Production environment, matching deployment configuration. It drains up to 20
batches (10,000 records), failing visibly if a backlog remains. Investigate
worker failures, then dispatch another run to drain a larger backlog. GitHub
scheduling delays or skipped locks can postpone cleanup.

## Deployment and rollback

1. Apply the additive migration before deploying application code.
2. Deploy the UI and authenticated worker, including `CRON_SECRET`.
3. Enable the daily workflow after the updated notices are available.
4. Check `booking.retention.completed` counters and workflow results.

Disable the workflow to stop automatic cleanup. Manual endpoint calls still
delete records; revoke worker credentials or stop endpoint access if required.
Rolling back application code does not restore deleted data. Keep the additive
column and grants when rolling back code so older clients remain compatible.

## Verification

Unit tests cover entitlement and preference behavior, saved-policy notices,
English/Spanish copy, authentication, result validation, and safe failures.
`test/db/booking-retention.test.ts` exercises the real SQL inside rolled-back
transactions, including calendar cutoffs, Premium opt-in, downgrade/override
behavior, permissions, related-record cleanup, and batching. It requires `psql`
and a local migrated Supabase database; the URL guard rejects remote targets.

```sh
RETENTION_TEST_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npm run test:db -- test/db/booking-retention.test.ts
```

Calendar semantics: [PostgreSQL date/time operations](https://www.postgresql.org/docs/current/functions-datetime.html).
Worker invocation: [Supabase RPC](https://supabase.com/docs/reference/javascript/rpc).
