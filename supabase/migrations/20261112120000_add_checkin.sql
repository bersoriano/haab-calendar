-- Door check-in for invitation-only pages: when each attending guest arrived
-- at each event.
--
-- Additive. Hosted must take this migration BEFORE the code that selects
-- checked_in_at ships.

alter table public.guest_attendance
  add column if not exists checked_in_at timestamptz;

comment on column public.guest_attendance.checked_in_at is
  'When this guest was checked in at the door of this event. The first time recorded wins; cleared with the answers a month after the event.';

-- Recreated from 20261110120000 so arrival times go with the answers.
create or replace function public.purge_invitation_answers(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cleared integer;
begin
  with finished as (
    select p.id
    from public.providers p
    where exists (select 1 from public.invitations i where i.provider_id = p.id)
      and (
        select max(s.occurrence_date)
        from public.services s
        where s.provider_id = p.id
          and s.occurrence_mode = 'single'
          and s.occurrence_date is not null
      ) < (
        (p_now at time zone coalesce(
          (select z.name from pg_catalog.pg_timezone_names z where z.name = p.timezone limit 1),
          'UTC'
        ))::date - 30
      )
  ),
  cleared_guests as (
    update public.invitation_guests g
    set answers = '{}'::jsonb
    from public.invitations i
    where g.invitation_id = i.id
      and i.provider_id in (select id from finished)
      and g.answers <> '{}'::jsonb
    returning 1
  ),
  cleared_households as (
    update public.invitations i
    set answers = '{}'::jsonb
    where i.provider_id in (select id from finished)
      and i.answers <> '{}'::jsonb
    returning 1
  ),
  cleared_arrivals as (
    update public.guest_attendance a
    set checked_in_at = null
    from public.invitation_guests g
    join public.invitations i on i.id = g.invitation_id
    where a.guest_id = g.id
      and i.provider_id in (select id from finished)
      and a.checked_in_at is not null
    returning 1
  )
  select (select count(*) from cleared_guests) + (select count(*) from cleared_households)
    + (select count(*) from cleared_arrivals)
  into v_cleared;

  return v_cleared;
end;
$$;

revoke all on function public.purge_invitation_answers(timestamptz) from public, anon, authenticated;
grant execute on function public.purge_invitation_answers(timestamptz) to service_role;
