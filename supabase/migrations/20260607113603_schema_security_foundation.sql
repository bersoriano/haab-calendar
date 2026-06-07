create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

revoke all on schema private from public;

create or replace function private.slugify(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select left(
    trim(both '-' from regexp_replace(lower(trim(value)), '[^a-z0-9]+', '-', 'g')),
    48
  );
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.providers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) > 0),
  business_name text not null check (length(btrim(business_name)) > 0),
  email text not null check (position('@' in email) > 1),
  slug text not null unique,
  timezone text not null default 'UTC' check (length(btrim(timezone)) > 0),
  booking_window_days integer not null default 60 check (booking_window_days between 1 and 365),
  availability jsonb not null default '{}'::jsonb check (jsonb_typeof(availability) = 'object'),
  setup_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint providers_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create or replace function private.ensure_provider_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  base_slug text;
  candidate text;
  suffix integer := 2;
  suffix_text text;
begin
  base_slug := private.slugify(coalesce(nullif(new.slug, ''), new.business_name, new.full_name, 'haab-calendar'));

  if base_slug is null or base_slug = '' then
    base_slug := 'haab-calendar';
  end if;

  candidate := base_slug;

  while exists (
    select 1
    from public.providers existing
    where existing.slug = candidate
      and existing.id <> new.id
  ) loop
    suffix_text := '-' || suffix::text;
    candidate := left(base_slug, 48 - length(suffix_text)) || suffix_text;
    suffix := suffix + 1;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

create trigger providers_ensure_slug
  before insert or update of slug, business_name, full_name
  on public.providers
  for each row
  execute function private.ensure_provider_slug();

create trigger providers_set_updated_at
  before update on public.providers
  for each row
  execute function private.set_updated_at();

create table public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  booking_type text not null check (booking_type in ('appointment', 'full-day')),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  description text not null default '',
  capacity text,
  cost text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_provider_name_unique unique (provider_id, name),
  constraint services_duration_matches_type check (
    (booking_type = 'appointment' and duration_minutes is not null) or
    (booking_type = 'full-day' and duration_minutes is null)
  )
);

create index services_provider_sort_idx on public.services(provider_id, sort_order, created_at);

create trigger services_set_updated_at
  before update on public.services
  for each row
  execute function private.set_updated_at();

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  booking_type text not null check (booking_type in ('appointment', 'full-day')),
  duration_minutes_snapshot integer check (duration_minutes_snapshot is null or duration_minutes_snapshot > 0),
  cost_snapshot text not null default '',
  capacity_snapshot text,
  client_name text not null check (length(btrim(client_name)) > 0),
  client_email text not null check (position('@' in client_email) > 1),
  client_phone text not null default '',
  date date not null,
  start_time time,
  end_time time,
  status text not null default 'confirmed' check (status in ('confirmed', 'rescheduled', 'cancelled')),
  notes text not null default '',
  manage_token_hash text not null unique,
  confirmation_number text not null unique,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_time_matches_type check (
    (booking_type = 'appointment' and start_time is not null and end_time is not null and start_time < end_time) or
    (booking_type = 'full-day' and start_time is null and end_time is null)
  )
);

create unique index bookings_provider_idempotency_key_idx
  on public.bookings(provider_id, idempotency_key);

create index bookings_provider_date_status_idx
  on public.bookings(provider_id, date, status);

create unique index bookings_exact_active_slot_idx
  on public.bookings(
    provider_id,
    date,
    booking_type,
    coalesce(start_time, '00:00'::time),
    coalesce(end_time, '23:59:59'::time)
  )
  where status in ('confirmed', 'rescheduled');

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row
  execute function private.set_updated_at();

create table public.booking_holds (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  booking_type text not null check (booking_type in ('appointment', 'full-day')),
  date date not null,
  start_time time,
  end_time time,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint booking_holds_time_matches_type check (
    (booking_type = 'appointment' and start_time is not null and end_time is not null and start_time < end_time) or
    (booking_type = 'full-day' and start_time is null and end_time is null)
  )
);

create index booking_holds_provider_date_expires_idx
  on public.booking_holds(provider_id, date, expires_at);

create index booking_holds_expires_idx
  on public.booking_holds(expires_at);

create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  actor_type text not null check (actor_type in ('provider', 'customer', 'system')),
  event_type text not null check (event_type in ('created', 'rescheduled', 'cancelled', 'hold_expired', 'note_added')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index booking_events_provider_created_idx
  on public.booking_events(provider_id, created_at desc);

create index booking_events_booking_created_idx
  on public.booking_events(booking_id, created_at desc);

create or replace function private.provider_owner(provider_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.providers p
    where p.id = provider_id
      and p.owner_user_id = (select auth.uid())
  );
$$;

revoke all on function private.provider_owner(uuid) from public;
revoke all on all functions in schema private from public;
grant usage on schema private to authenticated, service_role;
grant execute on function private.provider_owner(uuid) to authenticated, service_role;

alter table public.providers enable row level security;
alter table public.services enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_holds enable row level security;
alter table public.booking_events enable row level security;

create policy "Public can read published provider profile columns"
  on public.providers
  for select
  to anon
  using (setup_complete = true);

create policy "Provider owners can read providers"
  on public.providers
  for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

create policy "Authenticated users can create their own provider"
  on public.providers
  for insert
  to authenticated
  with check (owner_user_id = (select auth.uid()));

create policy "Provider owners can update providers"
  on public.providers
  for update
  to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create policy "Provider owners can delete providers"
  on public.providers
  for delete
  to authenticated
  using (owner_user_id = (select auth.uid()));

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
    )
  );

create policy "Provider owners can read services"
  on public.services
  for select
  to authenticated
  using (private.provider_owner(provider_id));

create policy "Provider owners can create services"
  on public.services
  for insert
  to authenticated
  with check (private.provider_owner(provider_id));

create policy "Provider owners can update services"
  on public.services
  for update
  to authenticated
  using (private.provider_owner(provider_id))
  with check (private.provider_owner(provider_id));

create policy "Provider owners can delete services"
  on public.services
  for delete
  to authenticated
  using (private.provider_owner(provider_id));

create policy "Provider owners can read bookings"
  on public.bookings
  for select
  to authenticated
  using (private.provider_owner(provider_id));

create policy "Provider owners can create bookings"
  on public.bookings
  for insert
  to authenticated
  with check (private.provider_owner(provider_id));

create policy "Provider owners can update bookings"
  on public.bookings
  for update
  to authenticated
  using (private.provider_owner(provider_id))
  with check (private.provider_owner(provider_id));

create policy "Provider owners can delete bookings"
  on public.bookings
  for delete
  to authenticated
  using (private.provider_owner(provider_id));

create policy "Provider owners can read holds"
  on public.booking_holds
  for select
  to authenticated
  using (private.provider_owner(provider_id));

create policy "Provider owners can delete holds"
  on public.booking_holds
  for delete
  to authenticated
  using (private.provider_owner(provider_id));

create policy "Provider owners can read booking events"
  on public.booking_events
  for select
  to authenticated
  using (private.provider_owner(provider_id));

create policy "Provider owners can create booking events"
  on public.booking_events
  for insert
  to authenticated
  with check (private.provider_owner(provider_id));

revoke all on public.providers from anon, authenticated;
revoke all on public.services from anon, authenticated;
revoke all on public.bookings from anon, authenticated;
revoke all on public.booking_holds from anon, authenticated;
revoke all on public.booking_events from anon, authenticated;

grant select (id, full_name, business_name, slug, timezone, booking_window_days, availability, setup_complete)
  on public.providers to anon;
grant select (id, provider_id, name, booking_type, duration_minutes, description, capacity, cost, notes, sort_order)
  on public.services to anon;

grant select, insert, update, delete on public.providers to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.bookings to authenticated;
grant select, insert, update, delete on public.booking_holds to authenticated;
grant select, insert on public.booking_events to authenticated;

grant select, insert, update, delete on public.providers to service_role;
grant select, insert, update, delete on public.services to service_role;
grant select, insert, update, delete on public.bookings to service_role;
grant select, insert, update, delete on public.booking_holds to service_role;
grant select, insert, update, delete on public.booking_events to service_role;

create or replace view public.public_providers
with (security_invoker = true)
as
select
  id,
  full_name,
  business_name,
  slug,
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

grant select on public.public_providers to anon, authenticated;
grant select on public.public_services to anon, authenticated;
