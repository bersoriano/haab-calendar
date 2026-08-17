-- Hardening the Google Calendar projection.
--
-- Three things the first cut left to application code alone:
--
--   1. A mapping could name a booking belonging to one provider and a
--      connection belonging to another. The handler checks; the database did
--      not, so a future caller could still write an inconsistent row.
--   2. Reconciliation ran inside the calendar-selection request and stopped
--      after 200 bookings. A provider with more than that silently lost the
--      rest, and a slow Google turned a click into a timeout.
--   3. Disconnecting revoked the token best-effort. If Google was unreachable
--      the row was deleted anyway, and the grant stayed alive at Google with
--      nothing left to retry from.
--
-- Forward-only, and safe on a populated database: the constraints are added
-- NOT VALID first so an existing row cannot block deployment, then validated.

-- ── 1. Mapping consistency ─────────────────────────────────────────────────
-- A mapping's provider must be the booking's provider. Enforced by pointing a
-- composite foreign key at a composite unique key, so the database checks the
-- pair rather than each id separately.
alter table public.bookings
  drop constraint if exists bookings_id_provider_unique;
alter table public.bookings
  add constraint bookings_id_provider_unique unique (id, provider_id);

alter table public.provider_google_calendar_connections
  drop constraint if exists provider_google_calendar_connections_id_provider_generation_key;
alter table public.provider_google_calendar_connections
  add constraint provider_google_calendar_connections_id_provider_generation_key
  unique (id, provider_id, connection_generation);

alter table public.provider_google_calendar_event_mappings
  drop constraint if exists provider_google_calendar_event_mappings_booking_provider_fkey;
alter table public.provider_google_calendar_event_mappings
  add constraint provider_google_calendar_event_mappings_booking_provider_fkey
  foreign key (booking_id, provider_id)
  references public.bookings(id, provider_id)
  on delete cascade
  not valid;

alter table public.provider_google_calendar_event_mappings
  validate constraint provider_google_calendar_event_mappings_booking_provider_fkey;

-- And the mapping's connection must be that same provider's connection, at the
-- generation the mapping claims. A reconnect rotates the generation, so old
-- mappings cannot authorize writes against the new grant.
alter table public.provider_google_calendar_event_mappings
  drop constraint if exists provider_google_calendar_event_mappings_connection_fkey;
alter table public.provider_google_calendar_event_mappings
  add constraint provider_google_calendar_event_mappings_connection_fkey
  foreign key (connection_id, provider_id, connection_generation)
  references public.provider_google_calendar_connections(id, provider_id, connection_generation)
  on delete cascade
  not valid;

alter table public.provider_google_calendar_event_mappings
  validate constraint provider_google_calendar_event_mappings_connection_fkey;

-- Composite foreign keys need their own indexes; the single-column ones from
-- the previous migration do not serve these lookups or the cascade.
create index if not exists provider_google_calendar_event_mappings_booking_provider_idx
  on public.provider_google_calendar_event_mappings (booking_id, provider_id);

create index if not exists provider_google_calendar_event_mappings_connection_generation_idx
  on public.provider_google_calendar_event_mappings
  (connection_id, provider_id, connection_generation);

-- ── 2. Reconciliation jobs ─────────────────────────────────────────────────
-- Durable, resumable, leased. One row per connection generation: reconnecting
-- starts a new job rather than resuming one against a grant that is gone.
create table if not exists public.provider_google_reconciliation_jobs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  connection_id uuid not null
    references public.provider_google_calendar_connections(id) on delete cascade,
  connection_generation uuid not null,

  status text not null default 'pending',
  -- (date, id) — a date alone is not unique, and a cursor that is not unique
  -- either repeats bookings forever or skips them.
  cursor_date date,
  cursor_booking_id uuid,

  considered_count integer not null default 0,
  written_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,

  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  lease_token uuid,
  leased_by text,
  lease_expires_at timestamptz,
  last_error_code text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint provider_google_reconciliation_jobs_generation_unique
    unique (provider_id, connection_generation),
  constraint provider_google_reconciliation_jobs_status_valid
    check (status in ('pending', 'running', 'completed', 'failed', 'dead_letter')),
  constraint provider_google_reconciliation_jobs_counts_nonnegative
    check (
      considered_count >= 0 and written_count >= 0
      and skipped_count >= 0 and failed_count >= 0 and attempt_count >= 0
    ),
  constraint provider_google_reconciliation_jobs_error_bounded
    check (last_error_code is null or (length(btrim(last_error_code)) > 0 and length(last_error_code) <= 64)),
  constraint provider_google_reconciliation_jobs_leased_by_shape
    check (leased_by is null or (length(btrim(leased_by)) > 0 and length(leased_by) <= 120)),
  -- A running job holds a whole lease; anything else holds none, so an expired
  -- claim can never be mistaken for a live worker.
  constraint provider_google_reconciliation_jobs_running_holds_lease
    check (
      status <> 'running'
      or (lease_token is not null and leased_by is not null and lease_expires_at is not null)
    ),
  constraint provider_google_reconciliation_jobs_idle_has_no_lease
    check (
      status = 'running'
      or (lease_token is null and leased_by is null and lease_expires_at is null)
    ),
  -- completed_at is the promise that every page was processed, so it is set
  -- only by completion.
  constraint provider_google_reconciliation_jobs_completed_at_matches
    check ((status = 'completed') = (completed_at is not null)),
  -- The cursor is a pair or it is nothing.
  constraint provider_google_reconciliation_jobs_cursor_paired
    check ((cursor_date is null) = (cursor_booking_id is null))
);

create index if not exists provider_google_reconciliation_jobs_claimable_idx
  on public.provider_google_reconciliation_jobs (available_at, created_at)
  where status in ('pending', 'failed');

create index if not exists provider_google_reconciliation_jobs_connection_idx
  on public.provider_google_reconciliation_jobs (connection_id);

create index if not exists provider_google_reconciliation_jobs_provider_idx
  on public.provider_google_reconciliation_jobs (provider_id);

drop trigger if exists provider_google_reconciliation_jobs_set_updated_at
  on public.provider_google_reconciliation_jobs;
create trigger provider_google_reconciliation_jobs_set_updated_at
  before update on public.provider_google_reconciliation_jobs
  for each row
  execute function private.set_updated_at();

-- ── 3. Revocation cleanup jobs ─────────────────────────────────────────────
-- Holds the sealed token *after* the connection row is gone, so a disconnect
-- can delete immediately while revocation is retried. The ciphertext lives
-- here only until Google confirms; nothing else in the row identifies a person.
create table if not exists public.google_revocation_jobs (
  id uuid primary key default gen_random_uuid(),
  -- Deliberately not a foreign key: the connection is deleted first, and the
  -- job has to outlive it. The provider id is kept for operational grouping and
  -- nulled rather than cascaded if the provider goes too.
  provider_id uuid references public.providers(id) on delete set null,

  refresh_token_ciphertext text not null,
  refresh_token_iv text not null,
  refresh_token_auth_tag text not null,
  refresh_token_key_version integer not null,

  status text not null default 'pending',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint google_revocation_jobs_status_valid
    check (status in ('pending', 'completed', 'dead_letter')),
  constraint google_revocation_jobs_attempt_count_nonnegative
    check (attempt_count >= 0),
  constraint google_revocation_jobs_key_version_positive
    check (refresh_token_key_version > 0),
  constraint google_revocation_jobs_error_bounded
    check (last_error_code is null or (length(btrim(last_error_code)) > 0 and length(last_error_code) <= 64)),
  constraint google_revocation_jobs_terminal_is_completed
    check ((status in ('completed', 'dead_letter')) = (completed_at is not null))
);

create index if not exists google_revocation_jobs_claimable_idx
  on public.google_revocation_jobs (available_at, created_at)
  where status = 'pending';

create index if not exists google_revocation_jobs_provider_idx
  on public.google_revocation_jobs (provider_id);

drop trigger if exists google_revocation_jobs_set_updated_at
  on public.google_revocation_jobs;
create trigger google_revocation_jobs_set_updated_at
  before update on public.google_revocation_jobs
  for each row
  execute function private.set_updated_at();

-- ── Access ─────────────────────────────────────────────────────────────────
-- Same rule as every other operational table here: RLS on, no policies, nothing
-- granted to anon or authenticated. The revocation job holds a sealed token, so
-- it is if anything more sensitive than the connection it came from.
alter table public.provider_google_reconciliation_jobs enable row level security;
alter table public.google_revocation_jobs enable row level security;

revoke all on table public.provider_google_reconciliation_jobs
  from public, anon, authenticated;
revoke all on table public.google_revocation_jobs
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.provider_google_reconciliation_jobs to service_role;
grant select, insert, update, delete
  on table public.google_revocation_jobs to service_role;

-- ── Claim functions ────────────────────────────────────────────────────────
-- Same shape as the outbox claim: one atomic statement, SKIP LOCKED, a lease
-- that expires so a dead worker's job returns to the pool on its own.

create or replace function public.claim_google_reconciliation_job(
  p_worker_id text,
  p_lease_seconds integer default 120
)
returns public.provider_google_reconciliation_jobs
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed public.provider_google_reconciliation_jobs;
begin
  if p_worker_id is null or length(btrim(p_worker_id)) = 0 or length(p_worker_id) > 120 then
    raise exception 'A worker id between 1 and 120 characters is required.'
      using errcode = '22023';
  end if;

  if p_lease_seconds is null or p_lease_seconds < 30 or p_lease_seconds > 600 then
    raise exception 'Lease seconds must be between 30 and 600.' using errcode = '22023';
  end if;

  with claimable as (
    select job.id
    from public.provider_google_reconciliation_jobs job
    where (
        (job.status in ('pending', 'failed') and job.available_at <= now())
        or (job.status = 'running' and job.lease_expires_at <= now())
      )
    order by job.available_at, job.created_at
    limit 1
    for update skip locked
  )
  update public.provider_google_reconciliation_jobs target
  set status = 'running',
      attempt_count = target.attempt_count + 1,
      lease_token = gen_random_uuid(),
      leased_by = p_worker_id,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      updated_at = now()
  from claimable
  where target.id = claimable.id
  returning target.* into claimed;

  return claimed;
end;
$$;

create or replace function public.claim_google_revocation_job(
  p_worker_id text
)
returns public.google_revocation_jobs
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed public.google_revocation_jobs;
begin
  if p_worker_id is null or length(btrim(p_worker_id)) = 0 or length(p_worker_id) > 120 then
    raise exception 'A worker id between 1 and 120 characters is required.'
      using errcode = '22023';
  end if;

  with claimable as (
    select job.id
    from public.google_revocation_jobs job
    where job.status = 'pending' and job.available_at <= now()
    order by job.available_at, job.created_at
    limit 1
    for update skip locked
  )
  update public.google_revocation_jobs target
  set attempt_count = target.attempt_count + 1,
      -- No status change: revocation is a single attempt against Google, and
      -- the delay is what keeps two workers from racing the same row.
      available_at = now() + interval '5 minutes',
      updated_at = now()
  from claimable
  where target.id = claimable.id
  returning target.* into claimed;

  return claimed;
end;
$$;

revoke all on function public.claim_google_reconciliation_job(text, integer)
  from public, anon, authenticated;
revoke all on function public.claim_google_revocation_job(text)
  from public, anon, authenticated;

grant execute on function public.claim_google_reconciliation_job(text, integer)
  to service_role;
grant execute on function public.claim_google_revocation_job(text)
  to service_role;
