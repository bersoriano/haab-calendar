-- Seating for invitation-only pages: tables per event, a seat per attending
-- guest per event, and whether households may see their table yet.
--
-- Additive. Hosted must take this migration BEFORE the code that selects
-- table_id or seating_published ships.

create table public.seating_tables (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  name text not null
    constraint seating_tables_name_length check (char_length(btrim(name)) between 1 and 60),
  seat_count integer
    constraint seating_tables_seat_count_range check (seat_count is null or seat_count between 1 and 100),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index seating_tables_service_idx on public.seating_tables(service_id, position);

comment on table public.seating_tables is
  'A table at one event of an invitation-only page. Seats are guest_attendance.table_id.';

create trigger seating_tables_set_updated_at
  before update on public.seating_tables
  for each row execute function private.set_updated_at();

-- A table belongs to an event of its own page.
create or replace function private.check_seating_table()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.services s where s.id = new.service_id and s.provider_id = new.provider_id
  ) then
    raise exception 'service_not_on_this_page' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger seating_tables_same_page
  before insert or update of provider_id, service_id on public.seating_tables
  for each row execute function private.check_seating_table();

alter table public.guest_attendance
  add column if not exists table_id uuid references public.seating_tables(id) on delete set null;

create index guest_attendance_table_idx on public.guest_attendance(table_id) where table_id is not null;

-- Only someone coming has a seat, and only at a table of that event. Saying
-- you won't come frees the seat here, whoever made the change.
create or replace function private.check_guest_seat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.attending then
    new.table_id := null;
  elsif new.table_id is not null and not exists (
    select 1 from public.seating_tables t where t.id = new.table_id and t.service_id = new.service_id
  ) then
    raise exception 'table_not_at_this_event' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger guest_attendance_seat
  before insert or update on public.guest_attendance
  for each row execute function private.check_guest_seat();

revoke all on function private.check_seating_table() from public;
revoke all on function private.check_guest_seat() from public;

alter table public.seating_tables enable row level security;
revoke all on table public.seating_tables from public, anon, authenticated;
grant select, insert, update, delete on table public.seating_tables to authenticated, service_role;

create policy "Owners manage their tables"
  on public.seating_tables
  for all
  to authenticated
  using (private.provider_owner(provider_id))
  with check (private.provider_owner(provider_id));

-- Households see their table only once the owner publishes the seating. Read
-- by the server only, so no public grant.
alter table public.providers
  add column if not exists seating_published boolean not null default false,
  add column if not exists seating_published_at timestamptz;

comment on column public.providers.seating_published is
  'Invitation-only pages: whether households see their table in their invitation.';

grant update (seating_published, seating_published_at) on public.providers to authenticated;
