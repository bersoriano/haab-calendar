-- Transactional outbox for outbound integrations.
--
-- A booking change and the notice that it happened have to be one atomic fact.
-- Writing the notice from TypeScript after the booking write cannot be: the
-- process can die between the two, the booking is committed, and the
-- integration never hears about it. So the notice is written by a trigger,
-- inside the booking's own transaction — commit takes both, rollback takes
-- neither.
--
-- public.booking_events stays exactly as it is. It is the provider's audit
-- history: readable by the owner, written once, never operational. This table
-- is the opposite — private machinery with leases, attempts, and terminal
-- states, which a worker mutates constantly. Sharing one table would mean
-- either exposing worker state to providers or letting workers rewrite audit
-- history, and both are worse than a second table.

-- ── Version ────────────────────────────────────────────────────────────────
-- Monotonic per booking, bumped only when a field an external calendar could
-- actually show has changed. It orders events, dedupes them, and lets a future
-- adapter tell a stale delivery from a current one.
alter table public.bookings
  add column if not exists integration_version bigint not null default 1;

alter table public.bookings
  drop constraint if exists bookings_integration_version_positive;
alter table public.bookings
  add constraint bookings_integration_version_positive
  check (integration_version > 0);

-- ── Outbox ─────────────────────────────────────────────────────────────────
create table if not exists public.integration_outbox_events (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  aggregate_version bigint not null,
  event_type text not null,
  payload_schema_version integer not null default 1,
  payload jsonb not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  lease_token uuid,
  leased_by text,
  lease_expires_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz,

  constraint integration_outbox_events_booking_version_unique
    unique (booking_id, aggregate_version),
  constraint integration_outbox_events_aggregate_version_positive
    check (aggregate_version > 0),
  constraint integration_outbox_events_payload_schema_version_positive
    check (payload_schema_version > 0),
  constraint integration_outbox_events_attempt_count_nonnegative
    check (attempt_count >= 0),
  constraint integration_outbox_events_event_type_valid
    check (event_type in (
      'booking.created',
      'booking.updated',
      'booking.rescheduled',
      'booking.cancelled'
    )),
  constraint integration_outbox_events_status_valid
    check (status in (
      'pending',
      'processing',
      'failed',
      'succeeded',
      'skipped',
      'dead_letter'
    )),
  constraint integration_outbox_events_payload_object
    check (jsonb_typeof(payload) = 'object'),
  -- Identifiers only. Anything larger means someone started copying the
  -- booking into it, which is exactly what must not happen.
  constraint integration_outbox_events_payload_bounded
    check (octet_length(payload::text) <= 8192),
  constraint integration_outbox_events_leased_by_shape
    check (leased_by is null or (length(btrim(leased_by)) > 0 and length(leased_by) <= 120)),
  constraint integration_outbox_events_error_code_bounded
    check (last_error_code is null or (length(btrim(last_error_code)) > 0 and length(last_error_code) <= 64)),
  constraint integration_outbox_events_error_message_bounded
    check (last_error_message is null or length(last_error_message) <= 500),

  -- A row being worked on holds a whole lease, not part of one.
  constraint integration_outbox_events_processing_holds_lease
    check (
      status <> 'processing'
      or (lease_token is not null and leased_by is not null and lease_expires_at is not null)
    ),
  -- And a row nobody is working on holds none of one, so an expired claim can
  -- never be mistaken for a live worker.
  constraint integration_outbox_events_idle_has_no_lease
    check (
      status = 'processing'
      or (lease_token is null and leased_by is null and lease_expires_at is null)
    ),
  constraint integration_outbox_events_terminal_is_processed
    check (
      status not in ('succeeded', 'skipped', 'dead_letter')
      or processed_at is not null
    ),
  constraint integration_outbox_events_pending_not_processed
    check (
      status not in ('pending', 'processing', 'failed')
      or processed_at is null
    )
);

-- The claim query's own predicate and order, so it can be answered from the
-- index alone rather than by scanning the settled rows, which will outnumber
-- the workable ones by orders of magnitude.
create index if not exists integration_outbox_events_claimable_idx
  on public.integration_outbox_events (available_at, created_at, id)
  where status in ('pending', 'failed');

create index if not exists integration_outbox_events_expired_lease_idx
  on public.integration_outbox_events (lease_expires_at)
  where status = 'processing';

create index if not exists integration_outbox_events_booking_version_idx
  on public.integration_outbox_events (booking_id, aggregate_version);

create index if not exists integration_outbox_events_provider_created_idx
  on public.integration_outbox_events (provider_id, created_at desc);

drop trigger if exists integration_outbox_events_set_updated_at
  on public.integration_outbox_events;
create trigger integration_outbox_events_set_updated_at
  before update on public.integration_outbox_events
  for each row
  execute function private.set_updated_at();

-- ── Access ─────────────────────────────────────────────────────────────────
-- RLS on with no policies: no role reaches these rows through the Data API.
-- This is operational state about deliveries, not something a provider owns.
alter table public.integration_outbox_events enable row level security;

revoke all on table public.integration_outbox_events from public, anon, authenticated;

-- No delete: the normal path never removes a row, and retention will be a
-- deliberate, separate job rather than a worker's side effect.
grant select, update on table public.integration_outbox_events to service_role;

-- ── Version trigger ────────────────────────────────────────────────────────
-- Integration-relevant fields are the ones an external calendar entry could
-- display or be scheduled by. Deliberately excluded: updated_at,
-- manage_token_hash, confirmation_number, idempotency_key, hold_id_snapshot,
-- and the version itself — none of them change what an outside calendar would
-- show, so none of them should cost a delivery.
create or replace function private.set_booking_integration_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Never the caller's value: the version is the database's own counter, and
    -- a client that could set it could make a stale delivery look current.
    new.integration_version := 1;
    return new;
  end if;

  if (
    new.provider_id is distinct from old.provider_id
    or new.service_id is distinct from old.service_id
    or new.service_name is distinct from old.service_name
    or new.booking_type is distinct from old.booking_type
    or new.duration_minutes_snapshot is distinct from old.duration_minutes_snapshot
    or new.client_name is distinct from old.client_name
    or new.client_email is distinct from old.client_email
    or new.client_phone is distinct from old.client_phone
    or new.date is distinct from old.date
    or new.start_time is distinct from old.start_time
    or new.end_time is distinct from old.end_time
    or new.status is distinct from old.status
    or new.notes is distinct from old.notes
    or new.location_snapshot is distinct from old.location_snapshot
    or new.details is distinct from old.details
    or new.details_schema_key is distinct from old.details_schema_key
    or new.details_schema_version is distinct from old.details_schema_version
    or new.service_snapshot is distinct from old.service_snapshot
  ) then
    new.integration_version := old.integration_version + 1;
  else
    new.integration_version := old.integration_version;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_set_integration_version on public.bookings;
-- Ahead of the enqueue trigger, and named to sort before the capacity guard's
-- BEFORE trigger has no bearing on it; BEFORE triggers fire alphabetically.
create trigger bookings_set_integration_version
  before insert or update on public.bookings
  for each row
  execute function private.set_booking_integration_version();

-- ── Enqueue trigger ────────────────────────────────────────────────────────
-- SECURITY DEFINER is required here and nowhere else: the booking write is made
-- by `authenticated` or `anon` through RLS, and those roles hold no privilege
-- on the outbox — deliberately, since they must never read or write delivery
-- state directly. The trigger therefore needs the table owner's rights to
-- insert the row inside their transaction. It is kept as small as that job
-- allows: no dynamic SQL, an empty search_path, every object fully qualified,
-- every value taken from NEW/OLD rather than from any caller input.
create or replace function private.enqueue_booking_integration_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_type text;
begin
  if tg_op = 'INSERT' then
    event_type := 'booking.created';
  elsif new.integration_version <= old.integration_version then
    -- Nothing an integration would care about changed.
    return null;
  elsif new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    event_type := 'booking.cancelled';
  elsif (
    new.date is distinct from old.date
    or new.start_time is distinct from old.start_time
    or new.end_time is distinct from old.end_time
  ) then
    event_type := 'booking.rescheduled';
  else
    event_type := 'booking.updated';
  end if;

  -- Identifiers only. A handler reloads the booking through an authorized read;
  -- copying client details here would put personal data in operational state
  -- that outlives the booking's own access rules.
  insert into public.integration_outbox_events (
    provider_id,
    booking_id,
    aggregate_version,
    event_type,
    payload
  )
  values (
    new.provider_id,
    new.id,
    new.integration_version,
    event_type,
    jsonb_build_object(
      'bookingId', new.id,
      'providerId', new.provider_id,
      'aggregateVersion', new.integration_version,
      'change', event_type
    )
  )
  -- Belt and braces against a version replayed by a future backfill: the
  -- unique constraint already forbids it, and this keeps that from aborting an
  -- otherwise valid booking write.
  on conflict (booking_id, aggregate_version) do nothing;

  return null;
end;
$$;

revoke all on function private.enqueue_booking_integration_event() from public, anon, authenticated;

drop trigger if exists bookings_enqueue_integration_event on public.bookings;
create trigger bookings_enqueue_integration_event
  after insert or update on public.bookings
  for each row
  execute function private.enqueue_booking_integration_event();

-- ── Worker RPCs ────────────────────────────────────────────────────────────
-- SECURITY INVOKER throughout: these carry no privilege of their own and run as
-- the service role that calls them. Every completion is matched on the lease
-- token, so a worker whose lease expired cannot write over the worker that
-- took the row from it.

create or replace function public.claim_integration_outbox_events(
  p_worker_id text,
  p_batch_size integer default 20,
  p_lease_seconds integer default 60
)
returns setof public.integration_outbox_events
language plpgsql
security invoker
set search_path = ''
as $$
declare
  lease_interval interval;
begin
  if p_worker_id is null or length(btrim(p_worker_id)) = 0 or length(p_worker_id) > 120 then
    raise exception 'A worker id between 1 and 120 characters is required.'
      using errcode = '22023';
  end if;

  if p_batch_size is null or p_batch_size < 1 or p_batch_size > 100 then
    raise exception 'Batch size must be between 1 and 100.' using errcode = '22023';
  end if;

  if p_lease_seconds is null or p_lease_seconds < 15 or p_lease_seconds > 300 then
    raise exception 'Lease seconds must be between 15 and 300.' using errcode = '22023';
  end if;

  lease_interval := make_interval(secs => p_lease_seconds);

  -- A processing row whose lease has run out is treated as claimable again.
  -- The worker holding it may still be alive and may still finish; its writes
  -- are rejected because the lease token no longer matches, and the work is
  -- redone. That is the at-least-once bargain, stated in one place.
  return query
  with claimable as (
    select o.id
    from public.integration_outbox_events o
    where (
        (o.status in ('pending', 'failed') and o.available_at <= now())
        or (o.status = 'processing' and o.lease_expires_at <= now())
      )
      -- Per-booking order: a later version waits until every earlier version
      -- of the same booking has reached a terminal state. Without this, a
      -- cancellation could overtake the reschedule that preceded it.
      and not exists (
        select 1
        from public.integration_outbox_events earlier
        where earlier.booking_id = o.booking_id
          and earlier.aggregate_version < o.aggregate_version
          and earlier.status not in ('succeeded', 'skipped', 'dead_letter')
      )
    order by o.available_at, o.created_at, o.id
    limit p_batch_size
    for update skip locked
  )
  update public.integration_outbox_events target
  set status = 'processing',
      attempt_count = target.attempt_count + 1,
      lease_token = gen_random_uuid(),
      leased_by = p_worker_id,
      lease_expires_at = now() + lease_interval,
      updated_at = now()
  from claimable
  where target.id = claimable.id
  returning target.*;
end;
$$;

create or replace function public.complete_integration_outbox_event(
  p_event_id uuid,
  p_lease_token uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_count integer;
begin
  update public.integration_outbox_events
  set status = 'succeeded',
      processed_at = now(),
      lease_token = null,
      leased_by = null,
      lease_expires_at = null,
      last_error_code = null,
      last_error_message = null,
      updated_at = now()
  where id = p_event_id
    and status = 'processing'
    and lease_token = p_lease_token;

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

create or replace function public.skip_integration_outbox_event(
  p_event_id uuid,
  p_lease_token uuid,
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
  update public.integration_outbox_events
  set status = 'skipped',
      processed_at = now(),
      lease_token = null,
      leased_by = null,
      lease_expires_at = null,
      last_error_code = left(coalesce(nullif(btrim(p_reason_code), ''), 'skipped'), 64),
      last_error_message = null,
      updated_at = now()
  where id = p_event_id
    and status = 'processing'
    and lease_token = p_lease_token;

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

create or replace function public.retry_integration_outbox_event(
  p_event_id uuid,
  p_lease_token uuid,
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

  update public.integration_outbox_events
  set status = 'failed',
      available_at = now() + make_interval(secs => delay_seconds),
      lease_token = null,
      leased_by = null,
      lease_expires_at = null,
      last_error_code = left(coalesce(nullif(btrim(p_error_code), ''), 'unknown'), 64),
      last_error_message = left(nullif(btrim(coalesce(p_error_message, '')), ''), 500),
      updated_at = now()
  where id = p_event_id
    and status = 'processing'
    and lease_token = p_lease_token;

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

create or replace function public.dead_letter_integration_outbox_event(
  p_event_id uuid,
  p_lease_token uuid,
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
  update public.integration_outbox_events
  set status = 'dead_letter',
      processed_at = now(),
      lease_token = null,
      leased_by = null,
      lease_expires_at = null,
      last_error_code = left(coalesce(nullif(btrim(p_error_code), ''), 'unknown'), 64),
      last_error_message = left(nullif(btrim(coalesce(p_error_message, '')), ''), 500),
      updated_at = now()
  where id = p_event_id
    and status = 'processing'
    and lease_token = p_lease_token;

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

revoke all on function public.claim_integration_outbox_events(text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.complete_integration_outbox_event(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.skip_integration_outbox_event(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.retry_integration_outbox_event(uuid, uuid, integer, text, text)
  from public, anon, authenticated;
revoke all on function public.dead_letter_integration_outbox_event(uuid, uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.claim_integration_outbox_events(text, integer, integer)
  to service_role;
grant execute on function public.complete_integration_outbox_event(uuid, uuid)
  to service_role;
grant execute on function public.skip_integration_outbox_event(uuid, uuid, text)
  to service_role;
grant execute on function public.retry_integration_outbox_event(uuid, uuid, integer, text, text)
  to service_role;
grant execute on function public.dead_letter_integration_outbox_event(uuid, uuid, text, text)
  to service_role;
