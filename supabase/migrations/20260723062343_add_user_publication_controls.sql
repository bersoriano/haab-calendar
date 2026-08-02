create table public.user_publication_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  publishing_enabled boolean not null default true,
  dashboard_message text,
  updated_at timestamptz not null default now()
);

alter table public.user_publication_settings enable row level security;

revoke all on public.user_publication_settings from anon, authenticated;
grant select on public.user_publication_settings to authenticated;
grant select, insert, update, delete on public.user_publication_settings to service_role;

create policy "Users can read their own publication setting"
  on public.user_publication_settings
  for select
  to authenticated
  using (user_id = (select auth.uid()));

insert into public.user_publication_settings (user_id)
select id
from auth.users
on conflict (user_id) do nothing;

create or replace function private.create_user_publication_setting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_publication_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists auth_user_create_publication_setting on auth.users;

create trigger auth_user_create_publication_setting
  after insert on auth.users
  for each row
  execute function private.create_user_publication_setting();

create or replace function private.publication_enabled(owner_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    (
      select settings.publishing_enabled
      from public.user_publication_settings settings
      where settings.user_id = owner_id
    ),
    true
  );
$$;

revoke all on function private.create_user_publication_setting() from public;
revoke all on function private.publication_enabled(uuid) from public;
alter default privileges in schema private revoke execute on functions from public;
grant usage on schema private to anon;
grant execute on function private.publication_enabled(uuid) to anon, authenticated, service_role;

drop policy if exists "Public can read published provider profile columns"
  on public.providers;
create policy "Public can read published provider profile columns"
  on public.providers
  for select
  to anon
  using (
    setup_complete = true
    and (select private.publication_enabled(owner_user_id))
  );

drop policy if exists "Public can read services for published providers"
  on public.services;
create policy "Public can read services for published providers"
  on public.services
  for select
  to anon
  using (
    exists (
      select 1
      from public.providers p
      where p.id = provider_id
        and p.setup_complete = true
        and (select private.publication_enabled(p.owner_user_id))
    )
  );

drop policy if exists "Public can read provider slug redirects for published providers"
  on public.provider_slug_redirects;
create policy "Public can read provider slug redirects for published providers"
  on public.provider_slug_redirects
  for select
  to anon
  using (
    exists (
      select 1
      from public.providers p
      where p.id = provider_id
        and p.setup_complete = true
        and (select private.publication_enabled(p.owner_user_id))
    )
  );

drop policy if exists "Public can read service slug redirects for published providers"
  on public.service_slug_redirects;
create policy "Public can read service slug redirects for published providers"
  on public.service_slug_redirects
  for select
  to anon
  using (
    exists (
      select 1
      from public.providers p
      where p.id = provider_id
        and p.setup_complete = true
        and (select private.publication_enabled(p.owner_user_id))
    )
  );

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
  gallery_image_urls,
  logo_image_url
from public.providers
where setup_complete = true
  and (select private.publication_enabled(owner_user_id));

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
where p.setup_complete = true
  and (select private.publication_enabled(p.owner_user_id));

create or replace view public.public_provider_slug_redirects
with (security_invoker = true)
as
select
  r.provider_id,
  r.vertical,
  r.slug,
  p.vertical as current_vertical,
  p.slug as current_slug
from public.provider_slug_redirects r
join public.providers p on p.id = r.provider_id
where p.setup_complete = true
  and (select private.publication_enabled(p.owner_user_id));

create or replace view public.public_service_slug_redirects
with (security_invoker = true)
as
select
  r.provider_id,
  r.service_id,
  r.slug,
  s.slug as current_slug
from public.service_slug_redirects r
join public.services s on s.id = r.service_id
join public.providers p on p.id = r.provider_id
where p.setup_complete = true
  and (select private.publication_enabled(p.owner_user_id));

grant select on public.public_providers to anon, authenticated;
grant select on public.public_services to anon, authenticated;
grant select on public.public_provider_slug_redirects to anon, authenticated;
grant select on public.public_service_slug_redirects to anon, authenticated;
