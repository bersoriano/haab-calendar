alter table public.providers
  add column if not exists phone_number_1 text not null default '',
  add column if not exists phone_number_2 text not null default '',
  add column if not exists address_1 text not null default '',
  add column if not exists address_2 text not null default '',
  add column if not exists header_image_url text,
  add column if not exists hero_text text,
  add column if not exists gallery_image_urls jsonb not null default '[]'::jsonb;

alter table public.services
  add column if not exists occurrence_mode text not null default 'periodic',
  add column if not exists occurrence_date date,
  add column if not exists weekdays text[] not null default '{}'::text[],
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists max_spots integer,
  add column if not exists location_prices jsonb not null default '{}'::jsonb,
  add column if not exists linked_address_1 boolean not null default false,
  add column if not exists linked_address_2 boolean not null default false,
  add column if not exists linked_phone_1 boolean not null default false,
  add column if not exists linked_phone_2 boolean not null default false,
  add column if not exists custom_address text,
  add column if not exists custom_phone text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'providers_gallery_image_urls_array_check'
  ) then
    alter table public.providers
      add constraint providers_gallery_image_urls_array_check
      check (jsonb_typeof(gallery_image_urls) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'services_occurrence_mode_check'
  ) then
    alter table public.services
      add constraint services_occurrence_mode_check
      check (occurrence_mode in ('single', 'periodic', 'weekly'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'services_weekdays_check'
  ) then
    alter table public.services
      add constraint services_weekdays_check
      check (
        weekdays <@ array[
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday'
        ]::text[]
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'services_schedule_time_pair_check'
  ) then
    alter table public.services
      add constraint services_schedule_time_pair_check
      check (
        (start_time is null and end_time is null) or
        (start_time is not null and end_time is not null and start_time < end_time)
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'services_max_spots_check'
  ) then
    alter table public.services
      add constraint services_max_spots_check
      check (max_spots is null or max_spots > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'services_location_prices_object_check'
  ) then
    alter table public.services
      add constraint services_location_prices_object_check
      check (jsonb_typeof(location_prices) = 'object');
  end if;
end $$;

grant select (
  phone_number_1,
  phone_number_2,
  address_1,
  address_2,
  header_image_url,
  hero_text,
  gallery_image_urls
) on public.providers to anon;

grant select (
  occurrence_mode,
  occurrence_date,
  weekdays,
  start_time,
  end_time,
  max_spots,
  location_prices,
  linked_address_1,
  linked_address_2,
  linked_phone_1,
  linked_phone_2,
  custom_address,
  custom_phone
) on public.services to anon;

drop view if exists public.public_services;
drop view if exists public.public_providers;

create or replace view public.public_providers
with (security_invoker = true)
as
select
  id,
  full_name,
  business_name,
  slug,
  vertical,
  language,
  timezone,
  booking_window_days,
  availability,
  phone_number_1,
  phone_number_2,
  address_1,
  address_2,
  header_image_url,
  hero_text,
  gallery_image_urls
from public.providers
where setup_complete = true;

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
  s.custom_phone
from public.services s
join public.providers p on p.id = s.provider_id
where p.setup_complete = true;

grant select on public.public_providers to anon, authenticated;
grant select on public.public_services to anon, authenticated;
