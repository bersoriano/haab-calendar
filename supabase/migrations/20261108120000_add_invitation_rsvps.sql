-- Invitation-only RSVPs: a guest list of households, each with its own link,
-- a seat limit, and one answer covering every event it is invited to.
--
-- Additive. Every existing page keeps rsvp_mode = 'open' and behaves as before.
-- Hosted must take this migration BEFORE the code that selects these columns
-- ships, or every public page and dashboard read fails.

-- The mode and the seat default only mean something on the events vertical;
-- the app saves 'open' for any other vertical and the switch below resets it.
alter table public.providers
  add column if not exists rsvp_mode text not null default 'open'
    constraint providers_rsvp_mode_known check (rsvp_mode in ('open', 'invitations')),
  add column if not exists default_invitation_seats integer not null default 2
    constraint providers_default_invitation_seats_range
      check (default_invitation_seats between 1 and 20);

comment on column public.providers.rsvp_mode is
  '''open'' takes bookings from anyone with the link; ''invitations'' takes RSVPs only through invitation links. Events vertical only.';
comment on column public.providers.default_invitation_seats is
  'Seat limit a new invitation starts with.';

alter table public.providers drop constraint if exists providers_vocabulary_known;
alter table public.providers
  add constraint providers_vocabulary_known check (vocabulary in ('tours', 'weddings'));

-- `providers` is granted column by column (see 20261103190000).
grant select (rsvp_mode) on public.providers to anon;
grant insert (rsvp_mode, default_invitation_seats), update (rsvp_mode, default_invitation_seats)
  on public.providers to authenticated;

-- One household or party. The token is kept readable so the owner can copy the
-- link again at any time; strangers find an invitation only by the token's hash.
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  display_name text not null
    constraint invitations_display_name_length
      check (char_length(btrim(display_name)) between 1 and 120),
  contact_phone text not null default ''
    constraint invitations_contact_phone_length check (char_length(contact_phone) <= 40),
  contact_email text not null default ''
    constraint invitations_contact_email_length check (char_length(contact_email) <= 254),
  seat_limit integer not null
    constraint invitations_seat_limit_range check (seat_limit between 1 and 20),
  token text not null unique,
  token_hash text not null unique
    constraint invitations_token_hash_format check (token_hash ~ '^[0-9a-f]{64}$'),
  notes text not null default ''
    constraint invitations_notes_length check (char_length(notes) <= 1000),
  submitted_at timestamptz,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invitations_provider_idx on public.invitations(provider_id, created_at);

comment on table public.invitations is
  'A household invited to an invitation-only events page. Kept until the owner deletes it or the account.';
comment on column public.invitations.submitted_at is
  'When the household (or the owner on its behalf) last answered. Null means no answer yet.';

-- Which of the page's events an invitation covers.
create table public.invitation_events (
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (invitation_id, service_id)
);

create index invitation_events_service_idx on public.invitation_events(service_id);

-- The people on an invitation. A name may be empty: a companion nobody has
-- named yet.
create table public.invitation_guests (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  name text not null default ''
    constraint invitation_guests_name_length check (char_length(name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invitation_guests_invitation_idx on public.invitation_guests(invitation_id, position);

-- One row per guest and event the guest's invitation is invited to.
create table public.guest_attendance (
  guest_id uuid not null references public.invitation_guests(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  attending boolean not null,
  primary key (guest_id, service_id)
);

create index guest_attendance_service_idx on public.guest_attendance(service_id);

create trigger invitations_set_updated_at
  before update on public.invitations
  for each row execute function private.set_updated_at();

create trigger invitation_guests_set_updated_at
  before update on public.invitation_guests
  for each row execute function private.set_updated_at();

-- An invitation may only name events of its own page.
create or replace function private.check_invitation_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.invitations i
    join public.services s on s.provider_id = i.provider_id
    where i.id = new.invitation_id and s.id = new.service_id
  ) then
    raise exception 'service_not_on_this_page' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger invitation_events_same_page
  before insert or update on public.invitation_events
  for each row execute function private.check_invitation_event();

-- An answer may only name an event the guest's invitation covers.
create or replace function private.check_guest_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.invitation_guests g
    join public.invitation_events e on e.invitation_id = g.invitation_id
    where g.id = new.guest_id and e.service_id = new.service_id
  ) then
    raise exception 'service_not_invited' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger guest_attendance_invited_event
  before insert or update on public.guest_attendance
  for each row execute function private.check_guest_attendance();

-- The seat limit is the household's maximum party, whatever a client sends.
-- The invitation row is locked so two inserts cannot both see room for one.
create or replace function private.check_invitation_guest_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_count integer;
begin
  select seat_limit into v_limit
  from public.invitations
  where id = new.invitation_id
  for update;

  select count(*) into v_count
  from public.invitation_guests
  where invitation_id = new.invitation_id;

  if v_count >= v_limit then
    raise exception 'seat_limit_exceeded' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger invitation_guests_within_limit
  before insert on public.invitation_guests
  for each row execute function private.check_invitation_guest_count();

create or replace function private.check_invitation_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.seat_limit < (
    select count(*) from public.invitation_guests where invitation_id = new.id
  ) then
    raise exception 'seat_limit_below_guests' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger invitations_seat_limit_covers_guests
  before update of seat_limit on public.invitations
  for each row
  when (new.seat_limit < old.seat_limit)
  execute function private.check_invitation_seat_limit();

revoke all on function private.check_invitation_event() from public;
revoke all on function private.check_guest_attendance() from public;
revoke all on function private.check_invitation_guest_count() from public;
revoke all on function private.check_invitation_seat_limit() from public;

-- Owner-only. Guests reach their invitation through a server route that looks
-- it up by token hash; no public role reads these tables.
alter table public.invitations enable row level security;
alter table public.invitation_events enable row level security;
alter table public.invitation_guests enable row level security;
alter table public.guest_attendance enable row level security;

revoke all on table public.invitations from public, anon, authenticated;
revoke all on table public.invitation_events from public, anon, authenticated;
revoke all on table public.invitation_guests from public, anon, authenticated;
revoke all on table public.guest_attendance from public, anon, authenticated;

grant select, insert, update, delete on table public.invitations to authenticated, service_role;
grant select, insert, update, delete on table public.invitation_events to authenticated, service_role;
grant select, insert, update, delete on table public.invitation_guests to authenticated, service_role;
grant select, insert, update, delete on table public.guest_attendance to authenticated, service_role;

create policy "Owners manage their invitations"
  on public.invitations
  for all
  to authenticated
  using (private.provider_owner(provider_id))
  with check (private.provider_owner(provider_id));

create or replace function private.invitation_owner(p_invitation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.invitations i
    join public.providers p on p.id = i.provider_id
    where i.id = p_invitation_id
      and p.owner_user_id = (select auth.uid())
  );
$$;

create or replace function private.invitation_guest_owner(p_guest_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.invitation_guests g
    join public.invitations i on i.id = g.invitation_id
    join public.providers p on p.id = i.provider_id
    where g.id = p_guest_id
      and p.owner_user_id = (select auth.uid())
  );
$$;

revoke all on function private.invitation_owner(uuid) from public;
revoke all on function private.invitation_guest_owner(uuid) from public;
grant execute on function private.invitation_owner(uuid) to authenticated;
grant execute on function private.invitation_guest_owner(uuid) to authenticated;

create policy "Owners manage their invitation events"
  on public.invitation_events
  for all
  to authenticated
  using (private.invitation_owner(invitation_id))
  with check (private.invitation_owner(invitation_id));

create policy "Owners manage their invitation guests"
  on public.invitation_guests
  for all
  to authenticated
  using (private.invitation_owner(invitation_id))
  with check (private.invitation_owner(invitation_id));

create policy "Owners manage their guests' attendance"
  on public.guest_attendance
  for all
  to authenticated
  using (private.invitation_guest_owner(guest_id))
  with check (private.invitation_guest_owner(guest_id));

-- The public page reads the mode to show a schedule instead of a booking flow.
-- `create or replace view` can only add columns at the end.
create or replace view public.public_providers with (security_invoker = true) as
select p.id, p.full_name, p.business_name, p.slug, p.vertical, p.language,
  p.timezone, p.booking_window_days, p.availability, p.phone_number_1,
  p.phone_number_2, p.address_1, p.address_2, p.header_image_url, p.hero_text,
  p.gallery_image_urls, p.logo_image_url, p.public_theme, p.max_bookings_per_day,
  private.public_booking_footer(p.id)->>'text' as public_footer_text,
  private.public_booking_footer(p.id)->>'url' as public_footer_url,
  p.vocabulary,
  p.rsvp_mode
from public.providers p
where p.setup_complete = true and (select private.publication_enabled(p.owner_user_id));

grant select on public.public_providers to anon, authenticated;

-- Recreated from 20261103190000 so a switch away from events also turns
-- invitation-only RSVPs off.
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
      vocabulary = case when p_vertical = 'events' then vocabulary else null end,
      rsvp_mode = case when p_vertical = 'events' then rsvp_mode else 'open' end
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
