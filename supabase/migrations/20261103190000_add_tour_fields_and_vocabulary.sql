-- Optional fields a tour operator needs, and the words a tour page speaks.
--
-- All additive and all optional: every existing row keeps its current behaviour
-- with the defaults below. Hosted must take this migration BEFORE the code that
-- selects these columns ships, or every public page and dashboard read fails.

alter table public.services
  add column if not exists photo_urls text[] not null default '{}',
  add column if not exists cancellation_policy text,
  add column if not exists min_group_size integer,
  add column if not exists traveler_fields text[] not null default '{}';

alter table public.services
  add constraint services_photo_urls_limit
    check (cardinality(photo_urls) <= 5),
  add constraint services_cancellation_policy_length
    check (cancellation_policy is null or char_length(cancellation_policy) <= 2000),
  add constraint services_min_group_size_positive
    check (min_group_size is null or min_group_size > 0),
  add constraint services_traveler_fields_known
    check (traveler_fields <@ array['passport', 'emergency_contact', 'diet', 'hotel_pickup']::text[]);

comment on column public.services.photo_urls is
  'Up to five public image URLs. The first is the cover on the booking page.';
comment on column public.services.cancellation_policy is
  'Owner-written policy shown to the public. Stated, not enforced.';
comment on column public.services.min_group_size is
  'Fewest travelers the owner runs this with. Stated, not enforced.';
comment on column public.services.traveler_fields is
  'Extra details the booking form asks for. Always optional for the person booking; answers live in bookings.details.travelerDetails.';

-- Null is the vertical's own words. Only the events vertical has a variant today.
alter table public.providers
  add column if not exists vocabulary text
    constraint providers_vocabulary_known check (vocabulary in ('tours'));

comment on column public.providers.vocabulary is
  'Word set for the booking page and dashboard. Null uses the vertical''s own; ''tours'' applies to the events vertical.';

-- `providers` is granted column by column. Without the anon grant the public
-- view below refuses anon outright and every public page turns into a 404;
-- without the owner's, every dashboard save is refused. `services` has table
-- grants, so its new columns need none.
grant select (vocabulary) on public.providers to anon;
grant insert (vocabulary), update (vocabulary) on public.providers to authenticated;

-- The public page reads through these views. `create or replace view` can only
-- add columns at the end, so the new ones go last.
create or replace view public.public_services
with (security_invoker = true)
as
select
  s.id,
  s.provider_id,
  s.name,
  s.slug,
  s.booking_type,
  s.duration_minutes,
  s.description,
  s.medical_specialty,
  s.capacity,
  s.cost,
  s.notes,
  s.sort_order,
  s.occurrence_mode,
  s.occurrence_date,
  s.weekdays,
  s.start_time,
  s.end_time,
  s.max_spots,
  s.location_prices,
  s.linked_address_1,
  s.linked_address_2,
  s.linked_phone_1,
  s.linked_phone_2,
  s.custom_address,
  s.custom_phone,
  s.capacity_scope,
  s.max_party_size,
  s.photo_urls,
  s.cancellation_policy,
  s.min_group_size,
  s.traveler_fields
from public.services s
join public.providers p on p.id = s.provider_id
where p.setup_complete = true
  and (select private.publication_enabled(p.owner_user_id));

grant select on public.public_services to anon, authenticated;

create or replace view public.public_providers with (security_invoker = true) as
select p.id, p.full_name, p.business_name, p.slug, p.vertical, p.language,
  p.timezone, p.booking_window_days, p.availability, p.phone_number_1,
  p.phone_number_2, p.address_1, p.address_2, p.header_image_url, p.hero_text,
  p.gallery_image_urls, p.logo_image_url, p.public_theme, p.max_bookings_per_day,
  private.public_booking_footer(p.id)->>'text' as public_footer_text,
  private.public_booking_footer(p.id)->>'url' as public_footer_url,
  p.vocabulary
from public.providers p
where p.setup_complete = true and (select private.publication_enabled(p.owner_user_id));

grant select on public.public_providers to anon, authenticated;

-- Recreated from 20261011120000 so a switch keeps the new service columns and
-- drops a word set that only means something on the events vertical.
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
      max_bookings_per_day = p_max_bookings_per_day,
      vocabulary = case when p_vertical = 'events' then vocabulary else null end
  where id = v_provider_id;

  insert into public.services (
    provider_id, name, slug, booking_type, duration_minutes, description,
    medical_specialty, capacity, cost, notes, sort_order, occurrence_mode,
    occurrence_date, weekdays, start_time, end_time, max_spots, capacity_scope,
    max_party_size, location_prices, linked_address_1, linked_address_2,
    linked_phone_1, linked_phone_2, custom_address, custom_phone,
    photo_urls, cancellation_policy, min_group_size, traveler_fields
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
    r.custom_address, r.custom_phone,
    coalesce(r.photo_urls, '{}'), r.cancellation_policy, r.min_group_size,
    coalesce(r.traveler_fields, '{}')
  from jsonb_populate_recordset(null::public.services, p_services) as r;

  return v_provider_id;
end;
$$;
