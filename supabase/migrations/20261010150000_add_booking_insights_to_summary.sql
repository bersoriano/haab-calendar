-- Booking insights on the analytics dashboard.
--
-- Adds to the summary, without changing anything it already returned:
--   previousTotals  the same totals for the equal-length window just before,
--                   for "+23% vs previous 30 days"
--   bookingHealth   bookings made in the window (any channel), how many were
--                   cancelled and how many were ever rescheduled
--   popularTimes    weekday x hour of the appointments those bookings are for,
--                   cancelled ones excluded; full-day bookings have no hour
--
-- `bookings(provider_id, created_at)` backs the cohort scan; the rescheduled
-- lookup uses the existing booking_events foreign-key index.

create index if not exists bookings_provider_created_idx
  on public.bookings(provider_id, created_at desc);

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
  -- The previous window is the same number of days immediately before it.
  with bounds as (
    select
      (now() at time zone p_time_zone)::date - (greatest(p_days, 1) - 1) as first_day,
      (now() at time zone p_time_zone)::date as last_day,
      (now() at time zone p_time_zone)::date - (2 * greatest(p_days, 1) - 1) as previous_first_day
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
  previous_scoped as (
    select
      e.visitor_hash,
      e.event,
      e.event = 'booking_confirmed' and bk.status is distinct from 'cancelled' as booking_live
    from public.public_page_events e
    cross join bounds b
    left join public.bookings bk on bk.id = e.booking_id
    where e.provider_id = p_provider_id
      and e.occurred_at >= (b.previous_first_day::timestamp at time zone p_time_zone)
      and e.occurred_at < (b.first_day::timestamp at time zone p_time_zone)
  ),
  -- Every booking made in the window, from any channel: the page, the
  -- dashboard, or a link shared before analytics existed. Cancellation and
  -- reschedule rates describe the bookings, not the page.
  cohort as (
    select
      bk.id,
      bk.status,
      bk.date,
      bk.start_time,
      exists (
        select 1
        from public.booking_events be
        where be.booking_id = bk.id and be.event_type = 'rescheduled'
      ) as was_rescheduled
    from public.bookings bk
    cross join bounds b
    where bk.provider_id = p_provider_id
      and bk.created_at >= (b.first_day::timestamp at time zone p_time_zone)
  ),
  popular_times as (
    select
      extract(isodow from c.date)::int as weekday,
      extract(hour from c.start_time)::int as hour,
      count(*) as bookings
    from cohort c
    where c.status <> 'cancelled' and c.start_time is not null
    group by 1, 2
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
    'previousTotals', (
      select jsonb_build_object(
        'views', count(*) filter (where event = 'page_view'),
        'visitors', count(distinct visitor_hash) filter (where event = 'page_view'),
        'bookings', count(*) filter (where booking_live),
        'bookingVisitors', count(distinct visitor_hash) filter (where booking_live)
      )
      from previous_scoped
    ),
    'bookingHealth', (
      select jsonb_build_object(
        'created', count(*),
        'cancelled', count(*) filter (where status = 'cancelled'),
        'rescheduled', count(*) filter (where was_rescheduled)
      )
      from cohort
    ),
    'popularTimes', coalesce((
      select jsonb_agg(to_jsonb(pt) order by pt.weekday, pt.hour) from popular_times pt
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
