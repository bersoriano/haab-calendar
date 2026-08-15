-- Manual feature overrides, and an immutable record of who changed what.
--
-- A provider's plan supplies its baseline features. An override is a support
-- action on top of that — grant something the plan omits, withhold something it
-- includes, permanently or until a date. Because it decides paid access, it is
-- writable only by the service role, and never by the provider whose access it
-- governs.

create table if not exists public.provider_feature_overrides (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null,
  -- Null means permanent. The resolver treats the exact instant as expired.
  expires_at timestamptz,
  reason text not null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_feature_overrides_feature_key_not_blank
    check (length(btrim(feature_key)) > 0),
  constraint provider_feature_overrides_feature_key_length
    check (length(feature_key) <= 100),
  constraint provider_feature_overrides_reason_not_blank
    check (length(btrim(reason)) > 0),
  constraint provider_feature_overrides_reason_length
    check (length(reason) <= 500),
  -- One current override per provider and feature; history lives in the events
  -- table rather than as extra rows here.
  constraint provider_feature_overrides_provider_feature_unique
    unique (provider_id, feature_key)
);

-- Append-only. Rows are written by the RPCs below and never updated: the point
-- of an audit trail is that it cannot be tidied up afterwards.
create table if not exists public.provider_feature_override_events (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  feature_key text not null,
  action text not null check (action in ('set', 'cleared')),
  enabled boolean,
  expires_at timestamptz,
  reason text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint provider_feature_override_events_reason_not_blank
    check (length(btrim(reason)) > 0),
  constraint provider_feature_override_events_reason_length
    check (length(reason) <= 500),
  -- A 'set' says what it set; a 'cleared' has nothing to say about enabled.
  constraint provider_feature_override_events_enabled_matches_action
    check (
      (action = 'set' and enabled is not null)
      or (action = 'cleared' and enabled is null)
    )
);

-- (provider_id, feature_key) already covers provider lookups on the current
-- table; these are the ones not covered by a constraint.
create index if not exists provider_feature_overrides_created_by_user_id_idx
  on public.provider_feature_overrides(created_by_user_id);

create index if not exists provider_feature_override_events_provider_created_idx
  on public.provider_feature_override_events(provider_id, created_at desc);

create index if not exists provider_feature_override_events_actor_user_id_idx
  on public.provider_feature_override_events(actor_user_id);

drop trigger if exists provider_feature_overrides_set_updated_at
  on public.provider_feature_overrides;
create trigger provider_feature_overrides_set_updated_at
  before update on public.provider_feature_overrides
  for each row
  execute function private.set_updated_at();

-- ── Access ──────────────────────────────────────────────────────────────────
-- RLS on with no policies at all: no role reaches these rows through the Data
-- API. The service role bypasses RLS, which is the only path that should exist.
alter table public.provider_feature_overrides enable row level security;
alter table public.provider_feature_override_events enable row level security;

revoke all on table public.provider_feature_overrides from public, anon, authenticated;
revoke all on table public.provider_feature_override_events from public, anon, authenticated;

grant select, insert, update, delete on table public.provider_feature_overrides to service_role;
-- No update or delete: history is written once.
grant select, insert on table public.provider_feature_override_events to service_role;

-- ── Mutations ───────────────────────────────────────────────────────────────
-- State change and audit row are written in one statement each way, so an
-- entitlement can never move without a record of who moved it. SECURITY
-- INVOKER: these carry no privilege of their own and run as the service role
-- that calls them.

create or replace function public.set_provider_feature_override(
  p_provider_id uuid,
  p_feature_key text,
  p_enabled boolean,
  p_expires_at timestamptz,
  p_reason text,
  p_actor_user_id uuid
)
returns public.provider_feature_overrides
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved public.provider_feature_overrides;
begin
  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'A reason is required to change a feature override.'
      using errcode = '23514';
  end if;

  if length(p_reason) > 500 then
    raise exception 'Reason is too long.' using errcode = '23514';
  end if;

  insert into public.provider_feature_overrides as o (
    provider_id, feature_key, enabled, expires_at, reason, created_by_user_id
  )
  values (
    p_provider_id, p_feature_key, p_enabled, p_expires_at, btrim(p_reason), p_actor_user_id
  )
  on conflict (provider_id, feature_key) do update
    set enabled = excluded.enabled,
        expires_at = excluded.expires_at,
        reason = excluded.reason,
        created_by_user_id = excluded.created_by_user_id
  returning o.* into saved;

  insert into public.provider_feature_override_events (
    provider_id, feature_key, action, enabled, expires_at, reason, actor_user_id
  )
  values (
    p_provider_id, p_feature_key, 'set', p_enabled, p_expires_at, btrim(p_reason), p_actor_user_id
  );

  return saved;
end;
$$;

create or replace function public.clear_provider_feature_override(
  p_provider_id uuid,
  p_feature_key text,
  p_reason text,
  p_actor_user_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  removed_count integer;
begin
  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'A reason is required to clear a feature override.'
      using errcode = '23514';
  end if;

  if length(p_reason) > 500 then
    raise exception 'Reason is too long.' using errcode = '23514';
  end if;

  delete from public.provider_feature_overrides
  where provider_id = p_provider_id
    and feature_key = p_feature_key;

  get diagnostics removed_count = row_count;

  -- Recorded even when nothing was there to remove: the attempt is part of the
  -- history, and a silent no-op is exactly what an audit trail should not have.
  insert into public.provider_feature_override_events (
    provider_id, feature_key, action, enabled, expires_at, reason, actor_user_id
  )
  values (
    p_provider_id, p_feature_key, 'cleared', null, null, btrim(p_reason), p_actor_user_id
  );

  return removed_count > 0;
end;
$$;

revoke all on function public.set_provider_feature_override(uuid, text, boolean, timestamptz, text, uuid)
  from public, anon, authenticated;
revoke all on function public.clear_provider_feature_override(uuid, text, text, uuid)
  from public, anon, authenticated;

grant execute on function public.set_provider_feature_override(uuid, text, boolean, timestamptz, text, uuid)
  to service_role;
grant execute on function public.clear_provider_feature_override(uuid, text, text, uuid)
  to service_role;
