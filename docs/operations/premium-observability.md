# Premium paths: what they log, and what to do when they break

Everything premium — Stripe ingress, the billing projection, entitlement
resolution, and outbound integration delivery — emits one-line JSON to stdout.
There is no vendor here on purpose: any log platform can ingest these, and with
no platform at all they are still readable with `jq`.

## The record

```json
{
  "schemaVersion": 1,
  "timestamp": "2026-08-16T12:00:00.000Z",
  "level": "info",
  "event": "stripe.webhook.processed",
  "service": "haab-calendar",
  "environment": "production",
  "requestId": "9f1c…",
  "stripeEventId": "evt_1…",
  "durationMs": 42,
  "outcome": "processed"
}
```

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Bumped only when the record shape changes incompatibly. |
| `event` | One of the names below. A closed set — a typo is a type error. |
| `requestId` | Correlates every line from one HTTP request. Echoed as `x-request-id`. |
| `stripeEventId` | Added **after** signature verification, never before. |
| `outboxEventId` / `bookingId` / `providerId` / `aggregateVersion` | Which row a delivery concerned. |
| `attemptCount` | How many times this has been tried. |
| `errorCode` | Stable, bounded code. Never a message from Stripe or Postgres. |
| `outcome` | `processed`, `duplicate`, `ignored`, `retry`, `dead_letter`, `failed`, `lease_conflict`. |

### What is never logged

Authorization headers, cookies, Supabase tokens, the service-role key, Stripe
secret and webhook secrets, OAuth tokens, webhook payloads, booking details,
client name / email / phone, provider email, manage tokens, raw request bodies,
external response bodies, and stack traces.

Two mechanisms, not one. The logger takes **allowlisted fields**, so the normal
path cannot leak. On top of that, `redact()` walks whatever it is given and
replaces any key matching a sensitive *concept* — `token`, `email`, `secret`,
`payload`, `signature`, `credential`, and others — with `[REDACTED]`. Matching
the concept rather than the exact name means a newly invented `refreshTokenV2`
is redacted the day it appears.

Errors are reduced to `{ name, code }` by `toSafeError`. A message can carry a
key prefix; a stack is a map of the filesystem. Neither leaves the process.

## Event catalog

**Stripe ingress** — `stripe.webhook.received`, `.signature_invalid`,
`.mode_mismatch`, `.duplicate`, `.persisted`, `.processed`, `.ignored`,
`.retry_scheduled`, `.dead_lettered`, `.failed`, `.unconfigured`

**Billing** — `billing.projection.updated`, `.unchanged`, `.failed`,
`billing.provider_mapping_missing`, `billing.status_unknown`

**Entitlements** — `entitlements.resolved`, `.billing_read_failed`,
`.override_read_failed`, `.denied`, `.override_applied`

**Outbox** — `integration.outbox.run_started`, `.run_completed`, `.claim_failed`,
`.delivery_succeeded`, `.delivery_skipped`, `.delivery_retry`,
`.delivery_dead_letter`, `.lease_conflict`

Entitlement resolution is deliberately **not** logged on the happy path: it runs
on every dashboard render, and a line per page view would bury everything worth
reading. Denials at a gate are logged, because those are either a bug or an
attempt.

## Traces

Spans, when an OTLP exporter is configured: `stripe.webhook.verify`, `.persist`,
`.process`, `stripe.subscription.retrieve`, `billing.projection.apply`,
`entitlements.resolve`, `premium.custom_slug.authorize`,
`integration.outbox.claim`, `.deliver`, `.record_outcome`.

Attributes stay low-cardinality — event type, outcome, status, feature key,
attempt number, batch size. Identifiers live in logs: as a span or metric
dimension, a provider id multiplies the series count by the number of providers.

## Normal behaviour

- Most `integration.outbox.delivery_skipped` lines carry
  `errorCode: no_active_integrations`. **That is correct today** — no Google
  adapter is registered, so every event terminates as skipped.
- `stripe.webhook.duplicate` is routine. Stripe redelivers by design.
- `stripe.webhook.ignored` with `unsupported_event_type` means the endpoint is
  subscribed to more than it handles. Narrow the Stripe subscription if it is
  noisy.

## Investigating

**Start from the request id.** It is on every line of one request and returned
as `x-request-id`, so a report that quotes it gives you the whole story:

```
jq -c 'select(.requestId == "9f1c…")' < logs.ndjson
```

**A provider says they paid and have no premium.** In order:

```sql
-- 1. Did the event arrive and settle?
select stripe_event_id, event_type, status, attempt_count, last_error_code, received_at
from public.stripe_webhook_events
order by received_at desc
limit 20;

-- 2. What does the projection say?
select provider_id, status, plan_tier, current_period_end, last_event_created_at
from public.provider_billing_subscriptions
where provider_id = '…';

-- 3. Is an override withholding it?
select feature_key, enabled, expires_at, reason
from public.provider_feature_overrides
where provider_id = '…';
```

Precedence is **override → billing projection → legacy `providers.plan_tier`**.
An active revoke beats a paid subscription; that is the intended answer, and
step 3 is where it shows.

If the inbox has no row at all, the event never passed signature verification —
look for `stripe.webhook.signature_invalid`, and check the endpoint's secret in
the Stripe dashboard.

**Stripe replay.** Resend from the Stripe dashboard (Developers → Events →
Resend), or `stripe events resend evt_…` with the CLI. Replay is safe: the event
id is unique, and a settled event is recognised and answered 200 without being
applied twice. To force reprocessing of a `failed` row, clear `available_at`:

```sql
update public.stripe_webhook_events
set status = 'received', available_at = now()
where stripe_event_id = 'evt_…' and status = 'failed';
```

Never edit `payload`, `stripe_event_id`, `event_type`, `livemode`, or
`event_created_at` — a trigger rejects it, because what Stripe sent is a record
of fact.

**Outbox backlog.**

```sql
select status, count(*), min(available_at) as oldest
from public.integration_outbox_events
group by status;
```

A stuck `processing` row recovers on its own once `lease_expires_at` passes. To
retry a dead letter after fixing the cause, reset it to `pending`:

```sql
update public.integration_outbox_events
set status = 'pending', available_at = now(), attempt_count = 0,
    last_error_code = null, last_error_message = null, processed_at = null
where id = '…';
```

## Google Calendar

**Events** — `google.oauth.started` / `.succeeded` / `.failed`,
`google.connection.saved` / `.disconnected` / `.needs_reauth`,
`google.calendar.selected`, `google.reconcile.enqueued` / `.started` / `.page` /
`.completed` / `.failed`, `google.event.inserted` / `.patched` / `.deleted` /
`.skipped` / `.collision` / `.mapping_failed`, `google.revocation.enqueued` /
`.completed` / `.failed`.

Never logged: OAuth tokens, ID tokens, calendar ids (usually email addresses),
Google event bodies, or raw Google responses.

**Scheduling.** Not Vercel cron. The Hobby plan allows one run per day, which
would mean a booking reaching Google the following night, so `vercel.json` was
removed and `.github/workflows/scheduled-workers.yml` drives both endpoints
instead — `/api/cron/integration-outbox` and `/api/cron/google-workers`, every
five minutes, six passes per run.

Both require `Authorization: Bearer $CRON_SECRET`. Two repository secrets make
it work:

| Secret | Value |
| --- | --- |
| `WORKERS_BASE_URL` | `https://haab-calendar.vercel.app`, no trailing slash |
| `CRON_SECRET` | The same value set in the Vercel project |

If the two `CRON_SECRET`s ever drift, every call answers 401 and the workflow
fails loudly rather than silently doing nothing.

Two things to know about this arrangement. GitHub's scheduler is best-effort
and runs late under load — acceptable here because no worker has a deadline;
each claims what is due and the queue keeps the rest. And **GitHub disables
scheduled workflows after 60 days without a commit to the repository**, without
notice. On a quiet repo that is the likeliest way for delivery to stop, so it
is the first thing to check when a backlog appears with no errors anywhere.

Moving to Vercel Pro would let `vercel.json` own the schedule again at
per-minute resolution; the routes need no change either way.

Manual invocation:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/google-workers
```

**Health queries.**

```sql
-- Outbox: backlog, stuck leases, dead letters
select status, count(*), min(available_at) as oldest
from public.integration_outbox_events group by status;

select count(*) as expired_leases
from public.integration_outbox_events
where status = 'processing' and lease_expires_at < now();

-- Reconciliation: jobs that are not finishing
select status, count(*), min(available_at) as oldest,
       max(attempt_count) as worst_attempt
from public.provider_google_reconciliation_jobs group by status;

-- Revocation: grants Google has not confirmed forgetting
select status, count(*), min(created_at) as oldest
from public.google_revocation_jobs group by status;

-- Connections needing a human
select status, count(*) from public.provider_google_calendar_connections
group by status;
```

There is no "last successful run" table; the equivalent is the absence of a
backlog above plus `google.reconcile.completed` in the logs. A cron that stopped
firing shows up as an oldest-pending age that only grows.

**What the states mean.**

- `needs_reauth` — the grant was revoked or expired. Only the provider can fix
  it; writes stop until they reconnect.
- `paused` — the entitlement lapsed. The grant is kept, writes stop, and
  restoring the entitlement resumes it and queues a full reconciliation.
- `event_id_collision` — the deterministic id belongs to an event this
  deployment does not own. Never overwritten. Usually two deployments sharing a
  calendar with the same `HAAB_DEPLOYMENT_NAMESPACE`.
- A `dead_letter` revocation job means Google was never told to forget a grant.
  Revoke it by hand from the Google account's third-party access page.

## Busy blocking and two-way sync

Both are off until a provider switches them on, and each is gated on its own
entitlement plus the connection existing. Neither is inferred.

**The pipeline.** Google notifies `/api/webhooks/google-calendar`, which writes
one inbox row and answers 204 without calling Google at all. Everything after
that is a worker on the cron: dispatch reads the change, the applier judges it,
repair puts Google back when Haab refused.

```
notification → google_calendar_webhook_inbox
             → busy refresh   (busy_refresh channels)
             → incremental sync → google_calendar_inbound_changes
                                → applied to the booking
                                or → google_calendar_sync_conflicts → repair
```

**Why a change was not applied.** In order of how often it is the answer:

```sql
-- 1. What was staged, and what happened to it?
select status, last_error_code, count(*)
from public.google_calendar_inbound_changes
group by status, last_error_code
order by count(*) desc;

-- 2. Conflicts a provider is being shown
select conflict_type, status, count(*)
from public.google_calendar_sync_conflicts
group by conflict_type, status;

-- 3. Is anything still listening?
select purpose, status, count(*), min(expires_at) as soonest_expiry
from public.provider_google_calendar_watch_channels
group by purpose, status;
```

A `last_error_code` of `two_way_disabled`, `not_entitled`, or
`connection_superseded` is the system working: the provider's last word wins,
and it is re-checked at the moment of the write rather than trusted from when
the change was staged.

**Conflict types, and which repair themselves.** Everything except
`ownership_mismatch` and `calendar_changed` is restored from Haab automatically
and ends as `auto_repaired`. Those two are left `open` on purpose:
`ownership_mismatch` means the event at that id is not this booking's, and
writing over it would do to somebody else exactly what the check exists to
prevent.

**Busy state.** The snapshot is generational: intervals are written under a new
generation and only then activated, so availability never reads a half-written
refresh. A failed refresh therefore shows up as a stale snapshot, never a
partial one.

```sql
select source.calendar_summary, source.last_refreshed_at, source.last_error_code,
       count(interval.id) as intervals
from public.provider_google_calendar_busy_sources source
left join public.provider_google_calendar_busy_intervals interval
  on interval.busy_source_id = source.id
 and interval.snapshot_generation = source.active_snapshot_generation
where source.provider_id = '…'
group by 1, 2, 3;
```

**The final check fails closed.** At the moment a booking is written, an
unverifiable calendar refuses the booking with a retryable 503 rather than
letting it through. A provider who turned busy blocking on asked for their
outside commitments to be respected; booking over them because Google timed out
would break exactly the promise the feature makes. Watch for
`google.busy.final_check_failed` — sustained, it means providers cannot take
bookings.

**The calendar Haab writes to is never a busy source.** It is filtered out of
the picker, rejected by the API, and skipped by the refresh. Its events are
Haab's own bookings; counting them again would make a service with room for two
look full after one.

## Suggested alerts

Vendor-neutral thresholds. None of these are configured anywhere yet — creating
them is a deliberate operational step.

| # | Condition | Why |
| --- | --- | --- |
| 1 | `stripe.webhook.failed` or `.retry_scheduled` sustained 5–10 min | Ingress is broken; subscriptions are drifting from reality. |
| 2 | Oldest `received`/`failed` inbox row > 5 min | Backlog: retries are not draining. |
| 3 | Any new `stripe.webhook.dead_lettered` | Someone paid and it did not land. Always worth a human. |
| 4 | Oldest `pending`/`failed` outbox row > 5 min | Deliveries are stalled. |
| 5 | Any new `integration.outbox.delivery_dead_letter` | An event will never be delivered. |
| 6 | `entitlements.billing_read_failed` / `.override_read_failed` above ~1% of resolutions | Resolution fails closed, so this is showing paying providers a free plan. |
| 7 | Any premium E2E failure on `main` or a pull request | The precedence rules are the product. |
| 8 | Oldest `pending`/`failed` reconciliation job > 15 min | A provider's calendar is missing bookings they can see in Haab. |
| 9 | Any `google_revocation_jobs` row in `dead_letter` | A grant Haab was asked to release is still live at Google. |
| 10 | `provider_google_calendar_connections` in `needs_reauth` rising | Often a client-secret rotation, not individual revocations. |
| 11 | `google.busy.final_check_failed` sustained | Bookings are being refused. Fails closed, so this is lost business, not overbooking. |
| 12 | Oldest `pending` webhook inbox row > 10 min | Notifications are arriving and nothing is reading them. |
| 13 | Any `google_calendar_inbound_changes` in `dead_letter` | A provider's calendar change will never be applied. |
| 14 | `provider_google_calendar_watch_channels` with `expires_at` inside 24h and no newer active row | Renewal is not running; push will stop silently within the week. |

**Dead letters are owned, not cleared.** Both dead-letter states are terminal on
purpose: nothing marks them succeeded to tidy a queue. Triage means finding the
cause, fixing it, then explicitly resetting the row as above.

## Retention

Keep `succeeded` and `skipped` outbox rows 30–90 days; keep `dead_letter` rows
until reviewed. The webhook inbox is the audit of what Stripe told us — keep it
at least as long. No cleanup job exists yet; deleting operational history should
be a deliberate, reviewed job rather than a worker's side effect.

## Configuration

| Variable | Effect when unset |
| --- | --- |
| `STRIPE_SECRET_KEY` | Webhook endpoint refuses every request. |
| `STRIPE_WEBHOOK_SECRET` | Same — the endpoint fails closed rather than trusting an unverified body. |
| `STRIPE_PREMIUM_PRODUCT_IDS` | No subscription grants premium. |
| `CRON_SECRET` | The outbox cron route answers 401 to everything. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` (and friends) | No spans are exported. The application starts and runs normally. |

Telemetry is never a startup requirement: `instrumentation.ts` registers a
provider, and with no exporter configured the SDK drops spans silently.

## Known limitations

- No metrics pipeline. Counts are derivable from logs and from the two tables,
  but nothing aggregates them.
- No alert or dashboard is configured anywhere. The table above is a
  recommendation.
- Entitlement resolution is not logged on success, so "how many resolutions
  happened" cannot be answered from logs alone — only the failures can.
- Traces are only as useful as the exporter behind them; with none configured
  the span names above exist but go nowhere.
- Watch channels renew only when a worker runs. Without the cron they expire
  after at most a week and push stops with no error anywhere — the periodic
  workers still sync, just on their own schedule rather than promptly.
- Conflicts are never expired or cleaned up. `auto_repaired` rows accumulate.
- There is no provider-facing notification when a conflict is created; it is
  visible in the integrations settings and nowhere else.
