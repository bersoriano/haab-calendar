create extension if not exists btree_gist with schema extensions;

alter table public.bookings
  add column if not exists location_snapshot text,
  add column if not exists details jsonb not null default '{}'::jsonb,
  add column if not exists details_schema_key text not null default 'base',
  add column if not exists details_schema_version integer not null default 1,
  add column if not exists service_snapshot jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_details_object_check'
  ) then
    alter table public.bookings
      add constraint bookings_details_object_check
      check (jsonb_typeof(details) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'bookings_service_snapshot_object_check'
  ) then
    alter table public.bookings
      add constraint bookings_service_snapshot_object_check
      check (jsonb_typeof(service_snapshot) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'bookings_details_schema_version_check'
  ) then
    alter table public.bookings
      add constraint bookings_details_schema_version_check
      check (details_schema_version > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'bookings_active_appointment_no_overlap'
  ) then
    alter table public.bookings
      add constraint bookings_active_appointment_no_overlap
      exclude using gist (
        provider_id with =,
        date with =,
        tsrange(date + start_time, date + end_time, '[)') with &&
      )
      where (booking_type = 'appointment' and status in ('confirmed', 'rescheduled'));
  end if;
end $$;
