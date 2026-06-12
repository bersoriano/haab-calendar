create or replace function private.slugify(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select nullif(
    trim(both '-' from regexp_replace(lower(trim(value)), '[^a-z0-9]+', '-', 'g')),
    ''
  );
$$;

alter table public.providers
  add column if not exists vertical text not null default 'professional',
  add column if not exists custom_slug text,
  add column if not exists plan_tier text not null default 'free';

do $$
begin
  alter table public.providers
    add constraint providers_vertical_check
    check (vertical in ('healthcare', 'spaces', 'professional', 'events'));
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter table public.providers
    add constraint providers_plan_tier_check
    check (plan_tier in ('free', 'premium'));
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter table public.providers
    add constraint providers_slug_length_check
    check (length(slug) <= 48);
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter table public.providers
    add constraint providers_custom_slug_format
    check (
      custom_slug is null or
      (
        length(custom_slug) <= 48 and
        custom_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      )
    );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter table public.providers
    add constraint providers_custom_slug_requires_premium
    check (custom_slug is null or plan_tier = 'premium');
exception
  when duplicate_object then null;
end;
$$;

alter table public.providers
  drop constraint if exists providers_slug_key;

create unique index if not exists providers_vertical_slug_unique_idx
  on public.providers(vertical, slug);

create table if not exists public.provider_slug_redirects (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  vertical text not null check (vertical in ('healthcare', 'spaces', 'professional', 'events')),
  slug text not null check (
    length(slug) <= 48 and
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  created_at timestamptz not null default now(),
  unique (vertical, slug)
);

create index if not exists provider_slug_redirects_provider_idx
  on public.provider_slug_redirects(provider_id, created_at desc);

alter table public.services
  add column if not exists slug text;

create table if not exists public.service_slug_redirects (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  slug text not null check (
    length(slug) <= 64 and
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  created_at timestamptz not null default now(),
  unique (provider_id, slug)
);

create index if not exists service_slug_redirects_service_idx
  on public.service_slug_redirects(service_id, created_at desc);

create or replace function private.ensure_provider_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  base_slug text;
  candidate text;
  custom_candidate text;
  suffix integer := 2;
  suffix_text text;
begin
  new.vertical := coalesce(nullif(new.vertical, ''), 'professional');
  new.plan_tier := coalesce(nullif(new.plan_tier, ''), 'free');
  custom_candidate := private.slugify(new.custom_slug);

  if new.custom_slug is not null and custom_candidate is null then
    raise exception 'Provider custom slug must contain at least one letter or number.'
      using errcode = 'check_violation';
  end if;

  if custom_candidate is not null then
    new.custom_slug := left(custom_candidate, 48);

    if exists (
      select 1
      from public.providers existing
      where existing.vertical = new.vertical
        and existing.slug = new.custom_slug
        and existing.id <> new.id
    ) or exists (
      select 1
      from public.provider_slug_redirects redirect
      where redirect.vertical = new.vertical
        and redirect.slug = new.custom_slug
        and redirect.provider_id <> new.id
    ) then
      raise exception 'Provider slug "%" is already taken for vertical "%".', new.custom_slug, new.vertical
        using errcode = 'unique_violation';
    end if;

    new.slug := new.custom_slug;
    return new;
  end if;

  new.custom_slug := null;
  base_slug := left(
    coalesce(
      private.slugify(nullif(new.slug, '')),
      private.slugify(new.business_name),
      private.slugify(new.full_name),
      'haab-calendar'
    ),
    48
  );

  if base_slug is null or base_slug = '' then
    base_slug := 'haab-calendar';
  end if;

  candidate := base_slug;

  while exists (
    select 1
    from public.providers existing
    where existing.vertical = new.vertical
      and existing.slug = candidate
      and existing.id <> new.id
  ) or exists (
    select 1
    from public.provider_slug_redirects redirect
    where redirect.vertical = new.vertical
      and redirect.slug = candidate
      and redirect.provider_id <> new.id
  ) loop
    suffix_text := '-' || suffix::text;
    candidate := left(base_slug, 48 - length(suffix_text)) || suffix_text;
    suffix := suffix + 1;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

create or replace function private.record_provider_slug_redirect()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.slug is distinct from new.slug or old.vertical is distinct from new.vertical then
    insert into public.provider_slug_redirects(provider_id, vertical, slug)
    values (new.id, old.vertical, old.slug)
    on conflict (vertical, slug) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists providers_ensure_slug on public.providers;

create trigger providers_ensure_slug
  before insert or update of slug, custom_slug, vertical, plan_tier, business_name, full_name
  on public.providers
  for each row
  execute function private.ensure_provider_slug();

drop trigger if exists providers_record_slug_redirect on public.providers;

create trigger providers_record_slug_redirect
  after update
  on public.providers
  for each row
  execute function private.record_provider_slug_redirect();

create or replace function private.ensure_service_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  base_slug text;
  candidate text;
  explicit_slug text;
  suffix integer := 2;
  suffix_text text;
begin
  explicit_slug := private.slugify(new.slug);

  if new.slug is not null and explicit_slug is null then
    raise exception 'Service slug must contain at least one letter or number.'
      using errcode = 'check_violation';
  end if;

  if explicit_slug is not null then
    explicit_slug := left(explicit_slug, 64);

    if exists (
      select 1
      from public.services existing
      where existing.provider_id = new.provider_id
        and existing.slug = explicit_slug
        and existing.id <> new.id
    ) or exists (
      select 1
      from public.service_slug_redirects redirect
      where redirect.provider_id = new.provider_id
        and redirect.slug = explicit_slug
        and redirect.service_id <> new.id
    ) then
      raise exception 'Service slug "%" is already taken for this provider.', explicit_slug
        using errcode = 'unique_violation';
    end if;

    new.slug := explicit_slug;
    return new;
  end if;

  base_slug := left(coalesce(private.slugify(new.name), 'service'), 64);
  candidate := base_slug;

  while exists (
    select 1
    from public.services existing
    where existing.provider_id = new.provider_id
      and existing.slug = candidate
      and existing.id <> new.id
  ) or exists (
    select 1
    from public.service_slug_redirects redirect
    where redirect.provider_id = new.provider_id
      and redirect.slug = candidate
      and redirect.service_id <> new.id
  ) loop
    suffix_text := '-' || suffix::text;
    candidate := left(base_slug, 64 - length(suffix_text)) || suffix_text;
    suffix := suffix + 1;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

create or replace function private.record_service_slug_redirect()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.slug is not null and (
    old.slug is distinct from new.slug or
    old.provider_id is distinct from new.provider_id
  ) then
    insert into public.service_slug_redirects(provider_id, service_id, slug)
    values (old.provider_id, new.id, old.slug)
    on conflict (provider_id, slug) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists services_ensure_slug on public.services;

create trigger services_ensure_slug
  before insert or update of provider_id, name, slug
  on public.services
  for each row
  execute function private.ensure_service_slug();

drop trigger if exists services_record_slug_redirect on public.services;

create trigger services_record_slug_redirect
  after update
  on public.services
  for each row
  execute function private.record_service_slug_redirect();

do $$
declare
  service_row record;
begin
  for service_row in
    select id, name
    from public.services
    where slug is null or slug = ''
    order by provider_id, sort_order, created_at, id
  loop
    update public.services
    set slug = service_row.name
    where id = service_row.id;
  end loop;
end;
$$;

alter table public.services
  alter column slug set not null;

do $$
begin
  alter table public.services
    add constraint services_slug_format
    check (
      length(slug) <= 64 and
      slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    );
exception
  when duplicate_object then null;
end;
$$;

create unique index if not exists services_provider_slug_unique_idx
  on public.services(provider_id, slug);

alter table public.provider_slug_redirects enable row level security;
alter table public.service_slug_redirects enable row level security;

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
    )
  );

drop policy if exists "Provider owners can read provider slug redirects"
  on public.provider_slug_redirects;
create policy "Provider owners can read provider slug redirects"
  on public.provider_slug_redirects
  for select
  to authenticated
  using (private.provider_owner(provider_id));

drop policy if exists "Provider owners can create provider slug redirects"
  on public.provider_slug_redirects;
create policy "Provider owners can create provider slug redirects"
  on public.provider_slug_redirects
  for insert
  to authenticated
  with check (private.provider_owner(provider_id));

drop policy if exists "Provider owners can delete provider slug redirects"
  on public.provider_slug_redirects;
create policy "Provider owners can delete provider slug redirects"
  on public.provider_slug_redirects
  for delete
  to authenticated
  using (private.provider_owner(provider_id));

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
    )
  );

drop policy if exists "Provider owners can read service slug redirects"
  on public.service_slug_redirects;
create policy "Provider owners can read service slug redirects"
  on public.service_slug_redirects
  for select
  to authenticated
  using (private.provider_owner(provider_id));

drop policy if exists "Provider owners can create service slug redirects"
  on public.service_slug_redirects;
create policy "Provider owners can create service slug redirects"
  on public.service_slug_redirects
  for insert
  to authenticated
  with check (private.provider_owner(provider_id));

drop policy if exists "Provider owners can delete service slug redirects"
  on public.service_slug_redirects;
create policy "Provider owners can delete service slug redirects"
  on public.service_slug_redirects
  for delete
  to authenticated
  using (private.provider_owner(provider_id));

grant select (id, full_name, business_name, slug, vertical, timezone, booking_window_days, availability, setup_complete)
  on public.providers to anon;
grant select (id, provider_id, name, slug, booking_type, duration_minutes, description, capacity, cost, notes, sort_order)
  on public.services to anon;

grant select on public.provider_slug_redirects to anon;
grant select on public.service_slug_redirects to anon;
grant select, insert, delete on public.provider_slug_redirects to authenticated;
grant select, insert, delete on public.service_slug_redirects to authenticated;
grant select, insert, update, delete on public.provider_slug_redirects to service_role;
grant select, insert, update, delete on public.service_slug_redirects to service_role;

drop view if exists public.public_service_slug_redirects;
drop view if exists public.public_provider_slug_redirects;
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
  timezone,
  booking_window_days,
  availability
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
  s.capacity,
  s.cost,
  s.notes,
  s.sort_order
from public.services s
join public.providers p on p.id = s.provider_id
where p.setup_complete = true;

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
where p.setup_complete = true;

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
where p.setup_complete = true;

grant select on public.public_providers to anon, authenticated;
grant select on public.public_services to anon, authenticated;
grant select on public.public_provider_slug_redirects to anon, authenticated;
grant select on public.public_service_slug_redirects to anon, authenticated;

revoke all on function private.ensure_provider_slug() from public;
revoke all on function private.record_provider_slug_redirect() from public;
revoke all on function private.ensure_service_slug() from public;
revoke all on function private.record_service_slug_redirect() from public;
