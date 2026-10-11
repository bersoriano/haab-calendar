-- A provider-side "seen" flag on each booking. Null means the provider has not
-- reviewed the booking yet, which the dashboard shows as new.
--
-- Bookings that already exist are not news to anyone, so they start reviewed.
-- The default does that without touching a row: a non-volatile default is
-- stored once as the column's value for existing rows, so no row is rewritten,
-- no trigger fires (updated_at, capacity, daily limit, integration outbox) and
-- no Google Calendar sync is queued. The default is then dropped, so every
-- booking made from here on starts as new.
--
-- The flag is deliberately absent from private.set_booking_integration_version:
-- marking a booking seen is not a change an integration cares about.
alter table public.bookings
  add column if not exists reviewed_at timestamptz default now();

alter table public.bookings
  alter column reviewed_at drop default;

comment on column public.bookings.reviewed_at is
  'When the provider marked this booking as seen. Null: not reviewed yet (new).';

-- The dashboard counts and filters unreviewed bookings per provider.
create index if not exists bookings_provider_unreviewed_idx
  on public.bookings (provider_id)
  where reviewed_at is null;
