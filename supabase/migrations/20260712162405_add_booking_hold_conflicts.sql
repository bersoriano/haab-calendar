create extension if not exists btree_gist with schema extensions;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'booking_holds_appointment_no_overlap'
  ) then
    alter table public.booking_holds
      add constraint booking_holds_appointment_no_overlap
      exclude using gist (
        provider_id with =,
        date with =,
        tsrange(date + start_time, date + end_time, '[)') with &&
      )
      where (booking_type = 'appointment');
  end if;

end $$;

create unique index if not exists booking_holds_full_day_unique_idx
  on public.booking_holds(provider_id, date)
  where booking_type = 'full-day';
