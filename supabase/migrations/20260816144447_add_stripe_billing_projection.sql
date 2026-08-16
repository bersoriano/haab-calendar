-- Stripe webhook inbox and the billing projection it maintains.
--
-- Two tables, because they answer two different questions. The inbox answers
-- "what did Stripe tell us, and did we finish handling it" — it is append-first,
-- keyed by Stripe's own event id, and exists so a redelivered event is
-- recognised rather than applied twice. The projection answers "what is this
-- provider entitled to right now" — one row per provider, overwritten as
-- subscriptions change, and read on every entitlement resolution.
--
-- Neither is reachable by anon or authenticated. A provider must not be able to
-- read Stripe identifiers, and must certainly not be able to write the row that
-- decides its own paid access.

-- ── Inbox ──────────────────────────────────────────────────────────────────
create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  -- Stripe's id, and the whole idempotency story: a redelivery collides here.
  stripe_event_id text not null,
  event_type text not null,
  api_version text,
  livemode boolean not null,
  -- Stripe's created timestamp, used to reject an older event that arrives
  -- after a newer one has already been applied.
  event_created_at timestamptz not null,
  payload jsonb not null,
  status text not null default 'received',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  last_error_code text,
  last_error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint stripe_webhook_events_stripe_event_id_unique unique (stripe_event_id),
  constraint stripe_webhook_events_stripe_event_id_shape
    check (length(btrim(stripe_event_id)) > 0 and length(stripe_event_id) <= 255),
  constraint stripe_webhook_events_event_type_shape
    check (length(btrim(event_type)) > 0 and length(event_type) <= 255),
  constraint stripe_webhook_events_status_valid
    check (status in ('received', 'processing', 'processed', 'ignored', 'failed', 'dead_letter')),
  constraint stripe_webhook_events_attempt_count_nonnegative
    check (attempt_count >= 0),
  constraint stripe_webhook_events_payload_object
    check (jsonb_typeof(payload) = 'object'),
  constraint stripe_webhook_events_error_code_bounded
    check (last_error_code is null or (length(btrim(last_error_code)) > 0 and length(last_error_code) <= 64)),
  constraint stripe_webhook_events_error_message_bounded
    check (last_error_message is null or length(last_error_message) <= 500),
  constraint stripe_webhook_events_terminal_is_processed
    check (
      status not in ('processed', 'ignored', 'dead_letter')
      or processed_at is not null
    )
);

create index if not exists stripe_webhook_events_workable_idx
  on public.stripe_webhook_events (available_at, received_at)
  where status in ('received', 'failed');

create index if not exists stripe_webhook_events_type_received_idx
  on public.stripe_webhook_events (event_type, received_at desc);

drop trigger if exists stripe_webhook_events_set_updated_at
  on public.stripe_webhook_events;
create trigger stripe_webhook_events_set_updated_at
  before update on public.stripe_webhook_events
  for each row
  execute function private.set_updated_at();

-- What Stripe sent is a record of fact. Status, attempts and errors are ours to
-- change; the identity and the body are not, or a replay could be made to look
-- like a different event after the fact.
create or replace function private.freeze_stripe_webhook_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.stripe_event_id is distinct from old.stripe_event_id
    or new.event_type is distinct from old.event_type
    or new.livemode is distinct from old.livemode
    or new.event_created_at is distinct from old.event_created_at
    or new.payload is distinct from old.payload
  then
    raise exception 'Stripe webhook identity and payload are immutable.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists stripe_webhook_events_freeze_identity
  on public.stripe_webhook_events;
create trigger stripe_webhook_events_freeze_identity
  before update on public.stripe_webhook_events
  for each row
  execute function private.freeze_stripe_webhook_identity();

-- ── Projection ─────────────────────────────────────────────────────────────
-- One row per provider: a provider has at most one subscription that decides
-- its tier, and a unique constraint says so rather than leaving the resolver to
-- pick between rows.
create table if not exists public.provider_billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text not null,
  status text not null,
  plan_tier text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  -- Which event produced this row, so an out-of-order redelivery can be
  -- recognised and refused.
  last_event_id text not null,
  last_event_created_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint provider_billing_subscriptions_provider_unique unique (provider_id),
  constraint provider_billing_subscriptions_subscription_unique
    unique (stripe_subscription_id),
  constraint provider_billing_subscriptions_plan_tier_valid
    check (plan_tier in ('free', 'premium')),
  constraint provider_billing_subscriptions_status_shape
    check (length(btrim(status)) > 0 and length(status) <= 64),
  constraint provider_billing_subscriptions_customer_shape
    check (stripe_customer_id is null or length(stripe_customer_id) <= 255),
  constraint provider_billing_subscriptions_subscription_shape
    check (length(btrim(stripe_subscription_id)) > 0 and length(stripe_subscription_id) <= 255)
);

create index if not exists provider_billing_subscriptions_status_idx
  on public.provider_billing_subscriptions (status);

drop trigger if exists provider_billing_subscriptions_set_updated_at
  on public.provider_billing_subscriptions;
create trigger provider_billing_subscriptions_set_updated_at
  before update on public.provider_billing_subscriptions
  for each row
  execute function private.set_updated_at();

-- ── Access ─────────────────────────────────────────────────────────────────
-- RLS on, no policies, no grants to anon or authenticated. A provider reads its
-- entitlements through the resolver, which runs server-side; it never reads the
-- billing row itself, and can never write one.
alter table public.stripe_webhook_events enable row level security;
alter table public.provider_billing_subscriptions enable row level security;

revoke all on table public.stripe_webhook_events from public, anon, authenticated;
revoke all on table public.provider_billing_subscriptions from public, anon, authenticated;

grant select, insert, update on table public.stripe_webhook_events to service_role;
grant select, insert, update on table public.provider_billing_subscriptions to service_role;

-- ── Claim ──────────────────────────────────────────────────────────────────
-- Stripe retries on its own schedule and can deliver the same event twice at
-- once. This turns "is anyone already handling this" into a single atomic
-- statement: exactly one caller gets the row, the other is told to stand down.
create or replace function public.claim_stripe_webhook_event(
  p_stripe_event_id text,
  p_lease_seconds integer default 60
)
returns public.stripe_webhook_events
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed public.stripe_webhook_events;
begin
  if p_lease_seconds is null or p_lease_seconds < 15 or p_lease_seconds > 300 then
    raise exception 'Lease seconds must be between 15 and 300.' using errcode = '22023';
  end if;

  update public.stripe_webhook_events
  set status = 'processing',
      attempt_count = attempt_count + 1,
      -- Doubles as the lease: another caller may take the row over only once
      -- this has passed, which recovers a request that died mid-processing.
      available_at = now() + make_interval(secs => p_lease_seconds),
      updated_at = now()
  where stripe_event_id = p_stripe_event_id
    and (
      status in ('received', 'failed')
      or (status = 'processing' and available_at <= now())
    )
    and available_at <= now()
  returning * into claimed;

  return claimed;
end;
$$;

-- ── Apply ──────────────────────────────────────────────────────────────────
-- The projection write and the inbox completion are one statement each way, so
-- an event can never be marked handled without its effect, or applied without
-- being marked. Out-of-order delivery is refused by comparing Stripe's own
-- created timestamp with the one already stored.
create or replace function public.apply_stripe_subscription_projection(
  p_stripe_event_id text,
  p_provider_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_status text,
  p_plan_tier text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_event_created_at timestamptz
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  existing_event_at timestamptz;
  outcome text := 'updated';
begin
  select last_event_created_at into existing_event_at
  from public.provider_billing_subscriptions
  where provider_id = p_provider_id
  for update;

  if existing_event_at is not null and existing_event_at > p_event_created_at then
    -- A newer event already decided this provider's tier. Applying this one
    -- would move the projection backwards, so it is recorded as handled and
    -- otherwise ignored.
    outcome := 'stale';
  else
    insert into public.provider_billing_subscriptions as target (
      provider_id,
      stripe_customer_id,
      stripe_subscription_id,
      status,
      plan_tier,
      current_period_end,
      cancel_at_period_end,
      last_event_id,
      last_event_created_at
    )
    values (
      p_provider_id,
      p_stripe_customer_id,
      p_stripe_subscription_id,
      p_status,
      p_plan_tier,
      p_current_period_end,
      coalesce(p_cancel_at_period_end, false),
      p_stripe_event_id,
      p_event_created_at
    )
    on conflict (provider_id) do update
      set stripe_customer_id = excluded.stripe_customer_id,
          stripe_subscription_id = excluded.stripe_subscription_id,
          status = excluded.status,
          plan_tier = excluded.plan_tier,
          current_period_end = excluded.current_period_end,
          cancel_at_period_end = excluded.cancel_at_period_end,
          last_event_id = excluded.last_event_id,
          last_event_created_at = excluded.last_event_created_at
    returning target.provider_id into p_provider_id;
  end if;

  update public.stripe_webhook_events
  set status = 'processed',
      processed_at = now(),
      available_at = now(),
      last_error_code = null,
      last_error_message = null,
      updated_at = now()
  where stripe_event_id = p_stripe_event_id;

  return outcome;
end;
$$;

create or replace function public.ignore_stripe_webhook_event(
  p_stripe_event_id text,
  p_reason_code text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_count integer;
begin
  update public.stripe_webhook_events
  set status = 'ignored',
      processed_at = now(),
      available_at = now(),
      last_error_code = left(coalesce(nullif(btrim(p_reason_code), ''), 'ignored'), 64),
      last_error_message = null,
      updated_at = now()
  where stripe_event_id = p_stripe_event_id
    and status in ('received', 'processing', 'failed');

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

create or replace function public.fail_stripe_webhook_event(
  p_stripe_event_id text,
  p_delay_seconds integer,
  p_error_code text,
  p_error_message text default null
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_count integer;
  delay_seconds integer;
begin
  delay_seconds := least(greatest(coalesce(p_delay_seconds, 30), 1), 21600);

  update public.stripe_webhook_events
  set status = 'failed',
      available_at = now() + make_interval(secs => delay_seconds),
      last_error_code = left(coalesce(nullif(btrim(p_error_code), ''), 'unknown'), 64),
      last_error_message = left(nullif(btrim(coalesce(p_error_message, '')), ''), 500),
      updated_at = now()
  where stripe_event_id = p_stripe_event_id
    and status in ('received', 'processing', 'failed');

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

create or replace function public.dead_letter_stripe_webhook_event(
  p_stripe_event_id text,
  p_error_code text,
  p_error_message text default null
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_count integer;
begin
  update public.stripe_webhook_events
  set status = 'dead_letter',
      processed_at = now(),
      available_at = now(),
      last_error_code = left(coalesce(nullif(btrim(p_error_code), ''), 'unknown'), 64),
      last_error_message = left(nullif(btrim(coalesce(p_error_message, '')), ''), 500),
      updated_at = now()
  where stripe_event_id = p_stripe_event_id
    and status in ('received', 'processing', 'failed');

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

revoke all on function public.claim_stripe_webhook_event(text, integer)
  from public, anon, authenticated;
revoke all on function public.apply_stripe_subscription_projection(
  text, uuid, text, text, text, text, timestamptz, boolean, timestamptz
) from public, anon, authenticated;
revoke all on function public.ignore_stripe_webhook_event(text, text)
  from public, anon, authenticated;
revoke all on function public.fail_stripe_webhook_event(text, integer, text, text)
  from public, anon, authenticated;
revoke all on function public.dead_letter_stripe_webhook_event(text, text, text)
  from public, anon, authenticated;

grant execute on function public.claim_stripe_webhook_event(text, integer)
  to service_role;
grant execute on function public.apply_stripe_subscription_projection(
  text, uuid, text, text, text, text, timestamptz, boolean, timestamptz
) to service_role;
grant execute on function public.ignore_stripe_webhook_event(text, text)
  to service_role;
grant execute on function public.fail_stripe_webhook_event(text, integer, text, text)
  to service_role;
grant execute on function public.dead_letter_stripe_webhook_event(text, text, text)
  to service_role;
