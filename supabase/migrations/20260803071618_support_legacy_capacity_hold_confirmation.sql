create or replace function private.enforce_shared_booking_capacity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  capacity integer;
  occupied integer;
  consumed_hold_id uuid;
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
       and b.id <> new.id)
    +
    (select count(*)
     from public.booking_holds h
     where h.service_id = new.service_id
       and h.date = new.date
       and h.expires_at > now()
       and (consumed_hold_id is null or h.id <> consumed_hold_id))
  into occupied;

  if capacity is null or occupied >= capacity then
    raise exception 'Event capacity is full for this date.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_shared_booking_capacity() from public;
