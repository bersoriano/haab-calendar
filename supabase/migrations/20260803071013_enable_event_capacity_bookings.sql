alter table public.bookings
  add column if not exists allows_shared_capacity boolean not null default false,
  add column if not exists hold_id_snapshot uuid;

alter table public.booking_holds
  add column if not exists allows_shared_capacity boolean not null default false;

update public.bookings b
set allows_shared_capacity = true
from public.services s
join public.providers p on p.id = s.provider_id
where b.service_id = s.id
  and p.vertical = 'events'
  and s.max_spots is not null;

update public.booking_holds h
set allows_shared_capacity = true
from public.services s
join public.providers p on p.id = s.provider_id
where h.service_id = s.id
  and p.vertical = 'events'
  and s.max_spots is not null;

drop index if exists public.bookings_exact_active_slot_idx;

create unique index bookings_exact_active_slot_idx
  on public.bookings(
    provider_id,
    date,
    booking_type,
    coalesce(start_time, '00:00'::time),
    coalesce(end_time, '23:59:59'::time)
  )
  where status in ('confirmed', 'rescheduled')
    and allows_shared_capacity = false;

alter table public.bookings
  drop constraint if exists bookings_active_appointment_no_overlap;

alter table public.bookings
  add constraint bookings_active_appointment_no_overlap
  exclude using gist (
    provider_id with =,
    date with =,
    tsrange(date + start_time, date + end_time, '[)') with &&
  )
  where (
    booking_type = 'appointment'
    and status in ('confirmed', 'rescheduled')
    and allows_shared_capacity = false
  );

alter table public.booking_holds
  drop constraint if exists booking_holds_appointment_no_overlap;

alter table public.booking_holds
  add constraint booking_holds_appointment_no_overlap
  exclude using gist (
    provider_id with =,
    date with =,
    tsrange(date + start_time, date + end_time, '[)') with &&
  )
  where (
    booking_type = 'appointment'
    and allows_shared_capacity = false
  );

create or replace function private.set_shared_capacity_mode()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select p.vertical = 'events' and s.max_spots is not null
  into new.allows_shared_capacity
  from public.services s
  join public.providers p on p.id = s.provider_id
  where s.id = new.service_id
    and p.id = new.provider_id;

  new.allows_shared_capacity := coalesce(new.allows_shared_capacity, false);
  return new;
end;
$$;

create or replace function private.enforce_shared_booking_capacity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  capacity integer;
  occupied integer;
begin
  if not new.allows_shared_capacity or new.status not in ('confirmed', 'rescheduled') then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(new.service_id::text || ':' || new.date::text, 0)
  );

  select max_spots
  into capacity
  from public.services
  where id = new.service_id;

  select
    (select count(*)
     from public.bookings b
     where b.service_id = new.service_id
       and b.date = new.date
       and b.status in ('confirmed', 'rescheduled')
       and b.id <> new.id)
    +
    (select count(*)
     from public.booking_holds h
     where h.service_id = new.service_id
       and h.date = new.date
       and h.expires_at > now()
       and (new.hold_id_snapshot is null or h.id <> new.hold_id_snapshot))
  into occupied;

  if capacity is null or occupied >= capacity then
    raise exception 'Event capacity is full for this date.'
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
  occupied integer;
begin
  if not new.allows_shared_capacity then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(new.service_id::text || ':' || new.date::text, 0)
  );

  select max_spots
  into capacity
  from public.services
  where id = new.service_id;

  select
    (select count(*)
     from public.bookings b
     where b.service_id = new.service_id
       and b.date = new.date
       and b.status in ('confirmed', 'rescheduled'))
    +
    (select count(*)
     from public.booking_holds h
     where h.service_id = new.service_id
       and h.date = new.date
       and h.expires_at > now()
       and h.id <> new.id)
  into occupied;

  if capacity is null or occupied >= capacity then
    raise exception 'Event capacity is full for this date.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_a_set_shared_capacity_mode on public.bookings;
create trigger bookings_a_set_shared_capacity_mode
  before insert or update of service_id, provider_id
  on public.bookings
  for each row
  execute function private.set_shared_capacity_mode();

drop trigger if exists bookings_b_enforce_shared_capacity on public.bookings;
create trigger bookings_b_enforce_shared_capacity
  before insert or update of service_id, provider_id, date, status
  on public.bookings
  for each row
  execute function private.enforce_shared_booking_capacity();

drop trigger if exists booking_holds_a_set_shared_capacity_mode on public.booking_holds;
create trigger booking_holds_a_set_shared_capacity_mode
  before insert or update of service_id, provider_id
  on public.booking_holds
  for each row
  execute function private.set_shared_capacity_mode();

drop trigger if exists booking_holds_b_enforce_shared_capacity on public.booking_holds;
create trigger booking_holds_b_enforce_shared_capacity
  before insert or update of service_id, provider_id, date, expires_at
  on public.booking_holds
  for each row
  execute function private.enforce_shared_hold_capacity();

revoke all on function private.set_shared_capacity_mode() from public;
revoke all on function private.enforce_shared_booking_capacity() from public;
revoke all on function private.enforce_shared_hold_capacity() from public;
