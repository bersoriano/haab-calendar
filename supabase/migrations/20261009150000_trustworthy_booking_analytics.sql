-- Analytics that providers can trust.
--
-- 1. Bookings cancelled afterwards no longer count as conversions; they are
--    reported separately as `cancelledBookings`.
-- 2. Each booking keeps the campaign the visitor arrived with, so the provider
--    can see where a specific client came from, not only totals. Copied onto
--    the booking because analytics rows are purged after 13 months and a
--    booking's history should not be.
-- 3. An index for the per-visitor rate cap the ingest route applies.

alter table public.bookings
  add column if not exists utm_source text
    check (utm_source is null or length(utm_source) between 1 and 100),
  add column if not exists utm_medium text
    check (utm_medium is null or length(utm_medium) between 1 and 100),
  add column if not exists utm_campaign text
    check (utm_campaign is null or length(utm_campaign) between 1 and 100),
  add column if not exists referrer_host text
    check (referrer_host is null or length(referrer_host) between 1 and 255);

create index if not exists public_page_events_provider_visitor_occurred_idx
  on public.public_page_events(provider_id, visitor_hash, occurred_at desc);

create or replace function public.provider_analytics_summary(
  p_provider_id uuid,
  p_days integer,
  p_time_zone text
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  -- The window is whole local days: today so far plus the p_days - 1 before it.
  with bounds as (
    select
      (now() at time zone p_time_zone)::date - (greatest(p_days, 1) - 1) as first_day,
      (now() at time zone p_time_zone)::date as last_day
  ),
  scoped as (
    select
      e.*,
      -- A conversion still counts while its booking stands. Older rows have no
      -- booking id, and a deleted booking leaves none, so both keep counting:
      -- only an explicit cancellation takes a booking out.
      e.event = 'booking_confirmed' and bk.status is distinct from 'cancelled' as booking_live,
      e.event = 'booking_confirmed' and bk.status = 'cancelled' as booking_cancelled
    from public.public_page_events e
    cross join bounds b
    left join public.bookings bk on bk.id = e.booking_id
    where e.provider_id = p_provider_id
      and e.occurred_at >= (b.first_day::timestamp at time zone p_time_zone)
  ),
  days as (
    select generate_series(b.first_day, b.last_day, interval '1 day')::date as day
    from bounds b
  ),
  daily as (
    select
      (s.occurred_at at time zone p_time_zone)::date as day,
      count(*) filter (where s.event = 'page_view') as views,
      count(distinct s.visitor_hash) filter (where s.event = 'page_view') as visitors,
      count(*) filter (where s.booking_live) as bookings
    from scoped s
    group by 1
  ),
  campaigns as (
    select
      s.utm_source as source,
      s.utm_medium as medium,
      s.utm_campaign as campaign,
      count(*) filter (where s.event = 'page_view') as views,
      count(distinct s.visitor_hash) filter (where s.event = 'page_view') as visitors,
      count(*) filter (where s.booking_live) as bookings
    from scoped s
    group by 1, 2, 3
  ),
  referrers as (
    select
      s.referrer_host as host,
      count(*) filter (where s.event = 'page_view') as views,
      count(*) filter (where s.booking_live) as bookings
    from scoped s
    where s.referrer_host is not null
    group by 1
  ),
  service_stats as (
    select
      s.service_id,
      sv.name,
      count(distinct s.visitor_hash) filter (where s.event = 'service_selected') as selections,
      count(*) filter (where s.booking_live) as bookings
    from scoped s
    join public.services sv
      on sv.id = s.service_id and sv.provider_id = p_provider_id
    group by 1, 2
  ),
  devices as (
    select s.device_class as device, count(*) as views
    from scoped s
    where s.event = 'page_view'
    group by 1
  )
  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'views', count(*) filter (where event = 'page_view'),
        'visitors', count(distinct visitor_hash) filter (where event = 'page_view'),
        'serviceSelected', count(distinct visitor_hash) filter (where event = 'service_selected'),
        'slotSelected', count(distinct visitor_hash) filter (where event = 'slot_selected'),
        'bookings', count(*) filter (where booking_live),
        'bookingVisitors', count(distinct visitor_hash) filter (where booking_live),
        'cancelledBookings', count(*) filter (where booking_cancelled)
      )
      from scoped
    ),
    'daily', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'day', to_char(d.day, 'YYYY-MM-DD'),
          'views', coalesce(x.views, 0),
          'visitors', coalesce(x.visitors, 0),
          'bookings', coalesce(x.bookings, 0)
        )
        order by d.day
      )
      from days d
      left join daily x on x.day = d.day
    ), '[]'::jsonb),
    'campaigns', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.bookings desc, c.views desc)
      from (select * from campaigns order by bookings desc, views desc limit 20) c
    ), '[]'::jsonb),
    'referrers', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.views desc)
      from (select * from referrers order by views desc limit 10) r
    ), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'serviceId', v.service_id,
          'name', v.name,
          'selections', v.selections,
          'bookings', v.bookings
        )
        order by v.bookings desc, v.selections desc
      )
      from (select * from service_stats order by bookings desc, selections desc limit 10) v
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(to_jsonb(dv) order by dv.views desc) from devices dv
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.provider_analytics_summary(uuid, integer, text)
  from public, anon, authenticated;
grant execute on function public.provider_analytics_summary(uuid, integer, text)
  to service_role;
