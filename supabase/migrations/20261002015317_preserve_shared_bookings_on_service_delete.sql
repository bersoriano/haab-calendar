-- Bookings keep their capacity mode as a snapshot after their service is
-- removed. The FK's ON DELETE SET NULL updates service_id; recalculating the
-- mode as false would put multiple valid shared bookings into the exclusive
-- slot index and reject the service delete.
create or replace function private.set_shared_capacity_mode()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_relid = 'public.bookings'::regclass
    and tg_op = 'UPDATE'
    and old.service_id is not null
    and new.service_id is null then
    new.allows_shared_capacity := old.allows_shared_capacity;
    return new;
  end if;

  select p.vertical in ('events', 'restaurant') and s.max_spots is not null
  into new.allows_shared_capacity
  from public.services s
  join public.providers p on p.id = s.provider_id
  where s.id = new.service_id;

  new.allows_shared_capacity := coalesce(new.allows_shared_capacity, false);

  return new;
end;
$$;

-- An archived booking has no service whose current capacity can be checked.
-- Keep capacity enforcement for all bookings that still reference a service.
drop trigger if exists bookings_b_enforce_shared_capacity on public.bookings;
create trigger bookings_b_enforce_shared_capacity
  before insert or update of service_id, provider_id, date, start_time, status
  on public.bookings
  for each row
  when (new.service_id is not null)
  execute function private.enforce_shared_booking_capacity();
