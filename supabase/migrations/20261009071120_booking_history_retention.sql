-- Preference and access are separate: Premium includes the capability, while
-- every provider starts with the one-month policy until explicitly opting in.
alter table public.providers
  add column keep_booking_history_one_year boolean not null default false;

grant insert (keep_booking_history_one_year), update (keep_booking_history_one_year)
  on public.providers to authenticated;

-- Same precedence as lib/entitlements/server.ts: active override, then billing
-- projection if present, then the legacy provider plan. No error fallback.
create or replace function private.booking_history_entitled(
  p_provider_id uuid,
  p_legacy_plan text,
  p_now timestamptz
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (select o.enabled from public.provider_feature_overrides o
      where o.provider_id = p_provider_id
        and o.feature_key = 'booking_history_retention'
        and (o.expires_at is null or o.expires_at > p_now)),
    coalesce((select b.plan_tier from public.provider_billing_subscriptions b
      where b.provider_id = p_provider_id), p_legacy_plan, 'free') = 'premium'
  );
$$;

revoke all on function private.booking_history_entitled(uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function private.booking_history_entitled(uuid, text, timestamptz) to service_role;

-- This private trigger needs to read protected billing/override tables for an
-- authenticated owner. It changes no ownership or RLS rules, and cannot be
-- called as an exposed RPC. Only a new opt-in needs authorization: off is
-- always allowed, and unrelated profile saves after a downgrade still work.
create or replace function private.validate_booking_history_preference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.keep_booking_history_one_year then
    if tg_op = 'INSERT' or not old.keep_booking_history_one_year then
      if not private.booking_history_entitled(new.id, new.plan_tier, statement_timestamp()) then
        raise exception 'One-year booking history requires Premium access.'
          using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.validate_booking_history_preference() from public, anon, authenticated;

create trigger providers_validate_booking_history_preference
  before insert or update of keep_booking_history_one_year on public.providers
  for each row execute function private.validate_booking_history_preference();

-- Only invoked by the authenticated scheduler through a service-role client.
-- No rows are deleted by installing this migration. UTC is the deterministic
-- fallback for an invalid/unset provider zone. Calendar subtraction clamps
-- month ends and leap days; the exact cutoff date stays retained.
create or replace function public.purge_expired_bookings(
  p_now timestamptz default now(),
  p_batch_size integer default 500
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_now is null or not isfinite(p_now) or p_batch_size is null or p_batch_size not between 1 and 1000 then
    raise exception 'Invalid cleanup clock or batch size.' using errcode = '22023';
  end if;

  with policies as materialized (
    select p.id,
      (
        (p_now at time zone coalesce(
          (select z.name from pg_catalog.pg_timezone_names z where z.name = p.timezone limit 1), 'UTC'
        ))::date - case
          when p.keep_booking_history_one_year
            and private.booking_history_entitled(p.id, p.plan_tier, p_now)
            then interval '1 year'
          else interval '1 month'
        end
      )::date as cutoff
    from public.providers p
    -- An opt-in save cannot race this transaction's preference snapshot.
    for share of p skip locked
  ), candidates as materialized (
    select b.id, b.date
    from public.bookings b
    join policies p on p.id = b.provider_id
    where b.date < p.cutoff
    order by b.date, b.id
    limit p_batch_size + 1
    for update of b skip locked
  ), deleted as (
    delete from public.bookings b
    using (select c.id from candidates c order by c.date, c.id limit p_batch_size) chosen
    where b.id = chosen.id
    returning b.id
  )
  select jsonb_build_object(
    'deletedBookings', (select count(*) from deleted),
    'hasMore', (select count(*) from candidates) > p_batch_size
  ) into result;

  return result;
end;
$$;

revoke all on function public.purge_expired_bookings(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.purge_expired_bookings(timestamptz, integer) to service_role;
