-- Provider dashboards subscribe to booking changes so customer-created,
-- rescheduled, and cancelled bookings appear without a manual refresh. RLS on
-- public.bookings still limits each authenticated provider to owned rows.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;
end
$$;
