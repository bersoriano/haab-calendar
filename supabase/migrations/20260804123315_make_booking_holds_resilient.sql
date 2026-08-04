-- A public visitor may accept one five-minute grace extension when the
-- ten-minute hold is close to expiring. The API updates this counter and the
-- expiry together, which prevents repeated extensions from monopolizing a slot.
alter table public.booking_holds
  add column if not exists extension_count smallint not null default 0;

alter table public.booking_holds
  drop constraint if exists booking_holds_extension_count_check;

alter table public.booking_holds
  add constraint booking_holds_extension_count_check
  check (extension_count between 0 and 1);

create or replace function public.extend_public_booking_hold(
  p_provider_id uuid,
  p_hold_id uuid
)
returns setof public.booking_holds
language sql
security invoker
set search_path = ''
as $$
  update public.booking_holds
  set
    expires_at = expires_at + interval '5 minutes',
    extension_count = extension_count + 1
  where provider_id = p_provider_id
    and id = p_hold_id
    and expires_at > now()
    and extension_count = 0
  returning *;
$$;

revoke all on function public.extend_public_booking_hold(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.extend_public_booking_hold(uuid, uuid)
  to service_role;

-- Availability queries always ignore expires_at <= now(). This scheduled
-- cleanup also removes those rows physically, including holds left behind by
-- offline browsers or abandoned tabs, without any manual intervention.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'cleanup-expired-booking-holds',
  '* * * * *',
  $$delete from public.booking_holds where expires_at <= now()$$
);
