-- Restaurant reservations: a service can hand out a fixed number of tables at
-- each seating, instead of one exclusive slot per booking.
--
-- The events vertical already sells shared capacity, but counts it per date: a
-- single or weekly occurrence has one window per date, so date and slot are the
-- same thing there. A restaurant has several seatings a night, each with its own
-- table count, so the counter needs a scope. `capacity_scope` supplies it and
-- `max_spots` keeps meaning "units of capacity" — tables here, spots for events
-- — rather than growing a second column that would drift from the first.
--
-- Everything below is additive and defaults to today's behavior, so this can be
-- applied before the app that uses it ships.

alter table public.services
  add column if not exists capacity_scope text not null default 'date',
  add column if not exists max_party_size integer;

do $$
begin
  alter table public.services
    add constraint services_capacity_scope_check
    check (capacity_scope in ('date', 'slot'));
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter table public.services
    add constraint services_max_party_size_check
    check (max_party_size is null or max_party_size > 0);
exception
  when duplicate_object then null;
end;
$$;

-- Both places a vertical is validated.
alter table public.providers
  drop constraint if exists providers_vertical_check;

alter table public.providers
  add constraint providers_vertical_check
  check (vertical in ('healthcare', 'spaces', 'professional', 'events', 'restaurant'));

alter table public.provider_slug_redirects
  drop constraint if exists provider_slug_redirects_vertical_check;

alter table public.provider_slug_redirects
  add constraint provider_slug_redirects_vertical_check
  check (vertical in ('healthcare', 'spaces', 'professional', 'events', 'restaurant'));

-- Restaurant bookings join the shared-capacity class, which is what takes them
-- out of the GiST overlap constraint and lets twelve parties hold 19:00.
create or replace function private.set_shared_capacity_mode()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select p.vertical in ('events', 'restaurant') and s.max_spots is not null
  into new.allows_shared_capacity
  from public.services s
  join public.providers p on p.id = s.provider_id
  where s.id = new.service_id;

  new.allows_shared_capacity := coalesce(new.allows_shared_capacity, false);

  return new;
end;
$$;

-- Occupancy is counted per (service, date) when the scope is 'date', and per
-- (service, date, start_time) when it is 'slot'. Events are unaffected: their
-- one window per date makes the extra predicate a no-op.
create or replace function private.enforce_shared_booking_capacity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  capacity integer;
  scope text;
  occupied integer;
  consumed_hold_id uuid;
begin
  if not new.allows_shared_capacity or new.status not in ('confirmed', 'rescheduled') then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(new.service_id::text || ':' || new.date::text, 0)
  );

  select max_spots, capacity_scope
  into capacity, scope
  from public.services
  where id = new.service_id;

  consumed_hold_id := new.hold_id_snapshot;

  if consumed_hold_id is null then
    select h.id
    into consumed_hold_id
    from public.booking_holds h
    where h.service_id = new.service_id
      and h.date = new.date
      and h.start_time is not distinct from new.start_time
      and h.end_time is not distinct from new.end_time
      and h.expires_at > now()
    order by h.created_at
    limit 1;
  end if;

  select
    (select count(*)
     from public.bookings b
     where b.service_id = new.service_id
       and b.date = new.date
       and b.status in ('confirmed', 'rescheduled')
       and b.id <> new.id
       and (scope <> 'slot' or b.start_time is not distinct from new.start_time))
    +
    (select count(*)
     from public.booking_holds h
     where h.service_id = new.service_id
       and h.date = new.date
       and h.expires_at > now()
       and (consumed_hold_id is null or h.id <> consumed_hold_id)
       and (scope <> 'slot' or h.start_time is not distinct from new.start_time))
  into occupied;

  if capacity is null or occupied >= capacity then
    -- A machine token, not prose: lib/supabase/bookings.ts matches on it and
    -- renders the guest-facing sentence from the provider's vertical copy.
    raise exception 'HAAB_CAPACITY_FULL: no capacity left for this selection.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function private.enforce_shared_hold_capacity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  capacity integer;
  scope text;
  occupied integer;
begin
  if not new.allows_shared_capacity then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(new.service_id::text || ':' || new.date::text, 0)
  );

  select max_spots, capacity_scope
  into capacity, scope
  from public.services
  where id = new.service_id;

  select
    (select count(*)
     from public.bookings b
     where b.service_id = new.service_id
       and b.date = new.date
       and b.status in ('confirmed', 'rescheduled')
       and (scope <> 'slot' or b.start_time is not distinct from new.start_time))
    +
    (select count(*)
     from public.booking_holds h
     where h.service_id = new.service_id
       and h.date = new.date
       and h.expires_at > now()
       and h.id <> new.id
       and (scope <> 'slot' or h.start_time is not distinct from new.start_time))
  into occupied;

  if capacity is null or occupied >= capacity then
    raise exception 'HAAB_CAPACITY_FULL: no capacity left for this selection.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- start_time now decides which seating a row occupies, so moving a booking
-- between seatings on the same date has to re-check capacity.
drop trigger if exists bookings_b_enforce_shared_capacity on public.bookings;
create trigger bookings_b_enforce_shared_capacity
  before insert or update of service_id, provider_id, date, start_time, status
  on public.bookings
  for each row
  execute function private.enforce_shared_booking_capacity();

drop trigger if exists booking_holds_b_enforce_shared_capacity on public.booking_holds;
create trigger booking_holds_b_enforce_shared_capacity
  before insert or update of service_id, provider_id, date, start_time, expires_at
  on public.booking_holds
  for each row
  execute function private.enforce_shared_hold_capacity();

revoke all on function private.set_shared_capacity_mode() from public;
revoke all on function private.enforce_shared_booking_capacity() from public;
revoke all on function private.enforce_shared_hold_capacity() from public;
