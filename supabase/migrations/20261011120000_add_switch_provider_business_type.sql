-- Switch a published provider to another business type in one transaction.
--
-- Called by POST /api/provider/business-type once the owner has set up the new
-- type on a draft. Everything the switch replaces changes together or not at
-- all: a failure half-way would leave a live page with no services.
--
-- Security invoker: every read and write below goes through the caller's own
-- row-level security, and the provider is found by auth.uid(), so a caller can
-- only ever switch their own page.

create or replace function public.switch_provider_business_type(
  p_vertical text,
  p_availability jsonb,
  p_max_bookings_per_day integer,
  p_services jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_provider_id uuid;
  v_vertical text;
  v_timezone text;
begin
  -- Locked so a booking cannot slip in between the checks and the swap.
  select id, vertical, timezone
  into v_provider_id, v_vertical, v_timezone
  from public.providers
  where owner_user_id = auth.uid()
  for update;

  if v_provider_id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if p_vertical = v_vertical then
    raise exception 'same_vertical' using errcode = '22023';
  end if;

  if p_services is null or jsonb_typeof(p_services) <> 'array'
     or jsonb_array_length(p_services) = 0 then
    raise exception 'no_services' using errcode = '22023';
  end if;

  -- A client still expects these; the owner handles them before switching.
  if exists (
    select 1
    from public.bookings b
    where b.provider_id = v_provider_id
      and b.status <> 'cancelled'
      and b.date >= (now() at time zone coalesce(nullif(v_timezone, ''), 'UTC'))::date
  ) then
    raise exception 'upcoming_bookings' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.booking_holds h
    where h.provider_id = v_provider_id
      and h.expires_at > now()
  ) then
    raise exception 'active_holds' using errcode = 'P0001';
  end if;

  -- Past bookings keep their snapshots; their service_id becomes null.
  delete from public.services where provider_id = v_provider_id;

  -- providers_record_slug_redirect keeps the old (vertical, slug) path working.
  update public.providers
  set vertical = p_vertical,
      availability = p_availability,
      max_bookings_per_day = p_max_bookings_per_day
  where id = v_provider_id;

  insert into public.services (
    provider_id, name, slug, booking_type, duration_minutes, description,
    medical_specialty, capacity, cost, notes, sort_order, occurrence_mode,
    occurrence_date, weekdays, start_time, end_time, max_spots, capacity_scope,
    max_party_size, location_prices, linked_address_1, linked_address_2,
    linked_phone_1, linked_phone_2, custom_address, custom_phone
  )
  select
    v_provider_id, r.name, r.slug, r.booking_type, r.duration_minutes, r.description,
    r.medical_specialty, r.capacity, r.cost, r.notes, r.sort_order,
    coalesce(r.occurrence_mode, 'periodic'),
    r.occurrence_date, coalesce(r.weekdays, '{}'), r.start_time, r.end_time,
    r.max_spots, coalesce(r.capacity_scope, 'date'), r.max_party_size,
    coalesce(r.location_prices, '{}'::jsonb),
    coalesce(r.linked_address_1, false), coalesce(r.linked_address_2, false),
    coalesce(r.linked_phone_1, false), coalesce(r.linked_phone_2, false),
    r.custom_address, r.custom_phone
  from jsonb_populate_recordset(null::public.services, p_services) as r;

  return v_provider_id;
end;
$$;

revoke all on function public.switch_provider_business_type(text, jsonb, integer, jsonb)
  from public, anon;
grant execute on function public.switch_provider_business_type(text, jsonb, integer, jsonb)
  to authenticated;
