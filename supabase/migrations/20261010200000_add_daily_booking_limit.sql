-- A provider-set maximum number of bookings per day.
--
-- Off for everyone (null) until a provider turns it on in Settings. Counts
-- every active booking on the date, across all services, whoever made it.
--
-- The availability engine already closes a full day on the page, for holds and
-- at confirmation. The trigger below is the backstop for the one case the
-- engine cannot see: two confirmations racing for the last place, each having
-- checked before the other committed.

alter table public.providers
  add column if not exists max_bookings_per_day integer
    check (max_bookings_per_day is null or max_bookings_per_day between 1 and 500);

-- Owner-editable, like the rest of the profile settings.
grant insert (max_bookings_per_day) on table public.providers to authenticated;
grant update (max_bookings_per_day) on table public.providers to authenticated;

-- The public page needs it to show a full day as full.
grant select (max_bookings_per_day) on table public.providers to anon;

-- Appended last: `create or replace view` can only add columns at the end.
create or replace view public.public_providers
with (security_invoker = true)
as
select
  p.id,
  p.full_name,
  p.business_name,
  p.slug,
  p.vertical,
  p.language,
  p.timezone,
  p.booking_window_days,
  p.availability,
  p.phone_number_1,
  p.phone_number_2,
  p.address_1,
  p.address_2,
  p.header_image_url,
  p.hero_text,
  p.gallery_image_urls,
  p.logo_image_url,
  p.public_theme,
  p.max_bookings_per_day
from public.providers p
where p.setup_complete = true
  and (select private.publication_enabled(p.owner_user_id));

grant select on public.public_providers to anon, authenticated;

-- ── Enforcement ─────────────────────────────────────────────────────────────
-- Runs when a booking becomes active on a date: a new booking, a reschedule to
-- another date, or a cancelled booking brought back. Edits that leave the date
-- and status alone (a note, a detail) never trip it, and lowering the limit
-- never touches bookings already made.
--
-- Holds are not counted here: they are a courtesy the engine honours, and a
-- confirmation should not fail because someone else is still typing. Only
-- committed bookings decide whether the day is full.
--
-- SECURITY DEFINER so the count sees every booking on the date regardless of
-- who is writing (the service role for public bookings, the owner from the
-- dashboard); search_path is pinned so nothing can be shadowed.

create or replace function private.enforce_daily_booking_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  daily_limit integer;
  booked integer;
begin
  if new.status not in ('confirmed', 'rescheduled') then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.date = old.date
     and old.status in ('confirmed', 'rescheduled') then
    return new;
  end if;

  select p.max_bookings_per_day
  into daily_limit
  from public.providers p
  where p.id = new.provider_id;

  if daily_limit is null then
    return new;
  end if;

  -- One provider-day at a time, so two racing confirmations count each other.
  perform pg_advisory_xact_lock(
    hashtextextended('daily-limit:' || new.provider_id::text || ':' || new.date::text, 0)
  );

  select count(*)
  into booked
  from public.bookings b
  where b.provider_id = new.provider_id
    and b.date = new.date
    and b.status in ('confirmed', 'rescheduled')
    and b.id <> new.id;

  if booked >= daily_limit then
    -- A machine token, not prose: lib/supabase/bookings.ts matches on it.
    raise exception 'HAAB_DAILY_LIMIT: this day already has its maximum bookings.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_daily_booking_limit() from public, anon, authenticated;

drop trigger if exists bookings_enforce_daily_limit on public.bookings;
create trigger bookings_enforce_daily_limit
  before insert or update of date, status on public.bookings
  for each row
  execute function private.enforce_daily_booking_limit();
