-- Shared event capacity and daily limits must count payment-pending bookings.
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
  if not new.allows_shared_capacity or new.status not in (
    'confirmed', 'rescheduled', 'pending_payment_verification', 'payment_action_required'
  ) then
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
    select h.id into consumed_hold_id
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
       and b.status in (
         'confirmed', 'rescheduled', 'pending_payment_verification', 'payment_action_required'
       )
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
       and b.status in (
         'confirmed', 'rescheduled', 'pending_payment_verification', 'payment_action_required'
       )
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
  if new.status not in (
    'confirmed', 'rescheduled', 'pending_payment_verification', 'payment_action_required'
  ) then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.date = old.date
     and old.status in (
       'confirmed', 'rescheduled', 'pending_payment_verification', 'payment_action_required'
     ) then
    return new;
  end if;

  select p.max_bookings_per_day into daily_limit
  from public.providers p where p.id = new.provider_id;
  if daily_limit is null then return new; end if;

  perform pg_advisory_xact_lock(
    hashtextextended('daily-limit:' || new.provider_id::text || ':' || new.date::text, 0)
  );

  select count(*) into booked
  from public.bookings b
  where b.provider_id = new.provider_id
    and b.date = new.date
    and b.status in (
      'confirmed', 'rescheduled', 'pending_payment_verification', 'payment_action_required'
    )
    and b.id <> new.id;

  if booked >= daily_limit then
    raise exception 'HAAB_DAILY_LIMIT: this day already has its maximum bookings.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_shared_booking_capacity() from public, anon, authenticated;
revoke all on function private.enforce_shared_hold_capacity() from public, anon, authenticated;
revoke all on function private.enforce_daily_booking_limit() from public, anon, authenticated;
