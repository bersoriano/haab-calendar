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
