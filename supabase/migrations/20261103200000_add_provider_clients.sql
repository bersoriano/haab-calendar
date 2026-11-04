-- A provider's own list of the people who have booked with them.
--
-- Bookings are purged on a schedule (see purge_expired_bookings). This table
-- deliberately is not tied to them, so a client's contact details outlive the
-- booking and stay until the provider deletes the record or closes the account.
--
-- It holds contact details and counts only. Notes, date of birth and traveler
-- answers (passport, emergency contact, diet) stay on the booking and are purged
-- with it, as is the service name: for a clinic, keeping what someone came in
-- for would be keeping health information for as long as this list lives.
--
-- Nothing is backfilled. People who already booked were told their booking would
-- be deleted and were not shown the notice on the booking form, so the list
-- starts with the first booking made after this migration.

create table public.provider_clients (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  client_name text not null,
  client_email text not null,
  client_phone text not null default '',
  -- What makes two bookings the same person. Guests have no account, and
  -- `Ana@Example.com ` and `ana@example.com` are one mailbox.
  email_key text generated always as (lower(btrim(client_email))) stored,
  first_booked_at timestamptz not null,
  last_booked_at timestamptz not null,
  booking_count integer not null default 1 check (booking_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_clients_one_per_email unique (provider_id, email_key)
);

comment on table public.provider_clients is
  'People who booked with a provider. Survives the booking purge; removed by the provider or with the account.';

create trigger provider_clients_set_updated_at
  before update on public.provider_clients
  for each row
  execute function private.set_updated_at();

alter table public.provider_clients enable row level security;

-- Written only by the trigger below. An owner reads and deletes, and has no way
-- to add or edit a record, so the list only ever says what bookings said.
revoke all on table public.provider_clients from public, anon, authenticated;
grant select, delete on table public.provider_clients to authenticated;
grant select, delete on table public.provider_clients to service_role;

create policy "Provider owners can read clients"
  on public.provider_clients
  for select
  to authenticated
  using (private.provider_owner(provider_id));

create policy "Provider owners can delete clients"
  on public.provider_clients
  for delete
  to authenticated
  using (private.provider_owner(provider_id));

-- SECURITY DEFINER because public bookings arrive through whichever role made
-- the insert, and none of them may write this table directly. A rejected booking
-- rolls this back with it, so a full slot leaves no record behind.
create or replace function private.record_provider_client()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.provider_clients (
    provider_id, client_name, client_email, client_phone, first_booked_at, last_booked_at
  )
  values (
    new.provider_id, btrim(new.client_name), btrim(new.client_email),
    btrim(new.client_phone), new.created_at, new.created_at
  )
  on conflict (provider_id, email_key) do update
  set client_name = excluded.client_name,
      client_email = excluded.client_email,
      -- The phone is optional, so leaving it blank is not removing it.
      client_phone = coalesce(nullif(excluded.client_phone, ''), public.provider_clients.client_phone),
      first_booked_at = least(public.provider_clients.first_booked_at, excluded.first_booked_at),
      last_booked_at = greatest(public.provider_clients.last_booked_at, excluded.last_booked_at),
      booking_count = public.provider_clients.booking_count + 1;

  return null;
end;
$$;

revoke all on function private.record_provider_client() from public, anon, authenticated;

create trigger bookings_record_provider_client
  after insert on public.bookings
  for each row
  execute function private.record_provider_client();
