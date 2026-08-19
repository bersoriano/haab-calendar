# Customer rescheduling rules — design

**Status:** approved for implementation planning on 2026-08-19.

## Problem

Customers can currently reschedule a booking from its private manage link without
any provider-configured notice period. Providers need one account-wide policy
that can leave customer rescheduling unrestricted, disable it completely, or
block it inside a configurable number of hours or days before a timed booking
starts.

This is a customer policy, not a general ban on provider operations. Providers
and provider-directed Google Calendar changes may still move eligible timed
bookings after the customer cutoff. Full-day and single-occurrence bookings are
structurally different: they are cancellable but never reschedulable by any
actor.

## Product decisions

- Policy scope is provider-wide. Per-service rules and overrides are out of
  scope.
- New and existing providers begin with customer rescheduling enabled and no
  cutoff rule.
- Without a provider rule, a customer may reschedule any eligible timed booking
  until its start instant.
- A provider can disable customer rescheduling completely.
- A provider can keep rescheduling enabled and add one positive whole-number
  cutoff expressed as hours or days in the UI.
- Storage uses canonical minutes. Hours and days are presentation choices, not
  different policy types.
- Removing a cutoff restores the unrestricted default.
- Disabling rescheduling preserves any saved cutoff. Re-enabling restores that
  cutoff until the provider explicitly removes it.
- The exact cutoff boundary is closed: when `now >= cutoffAt`, customer
  rescheduling is blocked.
- All start and cutoff calculations use the provider timezone.
- Timed provider and Google Calendar reschedules bypass the customer enabled
  flag and cutoff, but no actor may reschedule a booking that has started.
- Full-day bookings are cancellable only. No customer, provider, or Google
  Calendar path may reschedule them.
- Single-occurrence events remain cancellable only because their configured
  occurrence is the service itself, not a movable booking slot.
- Cancellation behavior is unchanged by this feature.

## Data model

Add two columns to `public.providers`:

```sql
customer_rescheduling_enabled boolean not null default true,
customer_reschedule_cutoff_minutes integer null,
constraint providers_customer_reschedule_cutoff_valid
  check (
    customer_reschedule_cutoff_minutes is null
    or (
      customer_reschedule_cutoff_minutes > 0
      and customer_reschedule_cutoff_minutes % 60 = 0
    )
  )
```

`NULL` means no cutoff rule exists. It is intentionally distinct from zero:
zero would be a rule value with unclear UI semantics, while `NULL` cleanly maps
to “Customers can reschedule anytime before start.” Non-null values must be
positive whole hours; day values are whole-hour multiples of 24.

The migration updates explicit provider column grants for authenticated owners
and anonymous public reads. These settings are not sensitive and public clients
need them to render accurate manage controls before a mutation is attempted.
Existing RLS ownership policies continue to authorize writes; no new table,
function, or security-definer code is needed.

The domain `ProviderInfo` representation gains:

```ts
customerReschedulingEnabled: boolean;
customerRescheduleCutoffMinutes?: number;
```

Normalization defaults missing legacy values to `true` and `undefined`.
Provider persistence, dashboard loading, public provider resolution, demo seeds,
and backend DTO mapping carry both fields. They are copied through existing
provider boundaries rather than read from browser-supplied booking requests.

## Policy evaluator

Create one pure domain evaluator for every UI and server consumer:

```ts
type CustomerRescheduleBlockReason =
  | "disabled"
  | "cutoff_reached"
  | "already_started"
  | "full_day"
  | "single_occurrence";

type CustomerRescheduleEligibility =
  | { allowed: true; cutoffAt?: string }
  | {
      allowed: false;
      reason: CustomerRescheduleBlockReason;
      cutoffAt?: string;
    };
```

Inputs are booking date and start time, booking type, service occurrence mode,
provider timezone, enabled flag, optional cutoff minutes, actor type, and current
instant. The evaluator converts the booking wall time to an instant using the
existing timezone utilities, avoiding browser-local interpretation and covering
DST transitions.

Evaluation order is deterministic:

1. Full-day booking → `full_day` for every actor.
2. Single-occurrence service → `single_occurrence` for every actor.
3. Missing/invalid timed start or `now >= startsAt` → `already_started` for every
   actor.
4. Provider or Google Calendar actor → allowed.
5. Customer rescheduling disabled → `disabled`.
6. Cutoff exists and `now >= startsAt - cutoffMinutes` → `cutoff_reached`, with
   `cutoffAt`.
7. Otherwise → allowed, with `cutoffAt` when a rule exists.

The evaluator returns machine-readable state only. Routes select English server
fallback messages, while components translate reason codes into English or
Spanish.

## Server enforcement and data flow

`rescheduleBookingRow` remains the single mutation boundary. It already loads
the booking, provider, and service before availability validation. Policy
evaluation belongs immediately after those reads and before availability,
Google busy checks, database updates, booking events, or integration outbox
writes.

Customer mutations use `actorType: "customer"`; dashboard mutations use
`"provider"`; Google inbound mutations use `"google_calendar"`. The shared
evaluator therefore enforces structural restrictions for every actor and applies
provider-configured restrictions only to customers.

A rejected mutation returns HTTP `409` with a stable reason code and a safe
message. It must not update the booking, write an audit event, or enqueue an
integration event.

Manage lookup responses include `rescheduleEligibility` calculated on the
server. Public provider DTOs also include the provider policy so the immediate
post-confirmation screen can avoid offering a known-invalid action. The mutation
still reevaluates against current server time and current provider settings;
client state never authorizes a reschedule.

If a page remains open across its cutoff, the visible control may become stale.
An attempted mutation receives `409`; the client consumes the returned reason,
updates to the locked state, and keeps the booking unchanged. A live countdown
or background policy subscription is out of scope.

## Admin settings experience

Add a “Customer rescheduling” section to provider Settings.

Default state says: “Customers can reschedule anytime before start.” Controls
support these actions:

- toggle customer rescheduling off or on;
- add a cutoff rule when none exists;
- edit the positive whole-number value;
- choose Hours or Days;
- remove the cutoff rule.

The UI converts the displayed unit to canonical minutes before calling existing
provider persistence. When an existing minute value divides evenly by 1,440 it
is displayed in days; otherwise it is displayed in hours. The database
constraint guarantees every stored value is exactly representable by this UI.

Helper copy reflects the saved state, for example:

- “Customers can reschedule anytime before start.”
- “Customers cannot reschedule within 24 hours of start.”
- “Customers cannot reschedule this booking. Contact the provider for help.”

Save errors use the existing settings error surface. English and Spanish copy
ship together.

## Customer manage experience

For an allowed timed booking, the existing “Pick a new time” action remains.

For blocked bookings, the action is absent or disabled and the page explains the
specific reason:

- provider disabled customer rescheduling;
- cutoff deadline has passed;
- booking already started;
- full-day booking is cancellable only;
- single-occurrence event is cancellable only.

When available, cutoff copy shows the deadline in provider-local date and time.
Cancellation stays visible and unchanged.

The post-confirmation success screen uses the same policy state and wording. A
private manage link remains available even when rescheduling is blocked because
it also provides booking status, notes, and cancellation.

## Migration and compatibility

The migration is additive and reversible:

- defaults preserve current behavior for existing rows;
- legacy serialized stores normalize to unrestricted rescheduling;
- no booking rows need backfill;
- no manage tokens or existing links change;
- old application code ignores the new columns;
- rollback drops the two columns and their check constraint, restoring the
  current unrestricted customer behavior.

Explicit select lists, column grants, fixtures, schema catalog documentation,
and migration contract tests must be updated together. This prevents a field
from existing in Postgres while silently disappearing at a DTO boundary.

## Error handling

Policy blocks are expected conflicts, not server errors. Routes return `409`
with `reason` and `userMessage`. Invalid provider policy values are rejected on
save with `400` and by the database constraint as defense in depth.

Unexpected lookup or conversion failures fail closed for customer rescheduling
and return a generic `500`; logs may include booking and provider identifiers but
never manage tokens. Provider and Google paths also fail rather than bypassing a
malformed structural booking state.

## Testing

Automated coverage includes:

- migration contract: columns, defaults, nullability, positive whole-hour
  constraint, and grants;
- normalization and provider persistence round-trip;
- unrestricted default for existing and new providers;
- disabled customer rescheduling;
- cutoff before, exactly at, and after its boundary;
- hour/day conversion and cutoff removal;
- provider timezone and DST boundary conversion;
- started booking rejection for every actor;
- customer cutoff enforcement before any write or outbox side effect;
- provider and Google cutoff bypass for eligible timed bookings;
- full-day and single-occurrence rejection for every actor;
- manage lookup eligibility payload;
- admin settings and customer manage states in English and Spanish;
- existing cancellation behavior unchanged.

Focused unit and route tests run first. Full typecheck, lint, unit suite, build,
and relevant local database tests form the completion gate.

## Non-goals

- Per-service or per-event policy overrides.
- Different rules by customer, plan, location, or booking status.
- Cancellation cutoffs or cancellation fees.
- Reschedule limits, approval workflows, or reason collection.
- Holiday/business-hour arithmetic; cutoffs are elapsed hours/days.
- Live policy subscriptions or cutoff countdowns.
- Notifications about policy changes.

## Acceptance criteria

1. New and existing providers allow customer rescheduling of eligible timed
   bookings before start when no rule exists.
2. Provider can disable customer rescheduling globally.
3. Provider can add, edit, or remove one provider-wide hour/day cutoff.
4. Customer UI explains blocked state and retains cancellation access.
5. Server rejects customer reschedules at or after cutoff without side effects.
6. Provider and Google Calendar can move eligible timed bookings despite
   customer cutoff or disabled state.
7. No actor can reschedule started, full-day, or single-occurrence bookings.
8. Every policy calculation uses provider timezone.
9. English and Spanish admin/customer copy match behavior.
10. Existing bookings, manage links, and cancellation flows remain compatible.
