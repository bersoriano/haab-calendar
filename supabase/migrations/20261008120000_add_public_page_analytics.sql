-- Public booking page analytics.
--
-- Providers want to know whether a campaign link is working: how many people
-- opened the booking page, how far they got, and which source brought the
-- bookings. This records one row per funnel step on a published page.
--
-- Privacy by construction. No cookie, no IP address, no user agent is stored.
-- A visitor is a SHA-256 of a secret, the UTC day, the provider, the IP and the
-- user agent, computed by the server before the insert. The day is part of the
-- input, so the same person yields an unrelated value tomorrow and nothing here
-- can follow anyone across days or across providers.

create table if not exists public.public_page_events (
  id bigint generated always as identity primary key,
  provider_id uuid not null references public.providers(id) on delete cascade,
  event text not null check (
    event in ('page_view', 'service_selected', 'slot_selected', 'booking_confirmed')
  ),
  -- Deliberately no foreign key: a visitor's request names the service, and a
  -- stale or forged id must not turn a page view into a failed insert. The
  -- summary joins on (provider_id, id), so a foreign id never resolves.
  service_id uuid,
  visitor_hash text not null check (visitor_hash ~ '^[0-9a-f]{64}$'),
  utm_source text check (utm_source is null or length(utm_source) between 1 and 100),
  utm_medium text check (utm_medium is null or length(utm_medium) between 1 and 100),
  utm_campaign text check (utm_campaign is null or length(utm_campaign) between 1 and 100),
  referrer_host text check (referrer_host is null or length(referrer_host) between 1 and 255),
  device_class text not null check (device_class in ('mobile', 'tablet', 'desktop')),
  occurred_at timestamptz not null default now()
);

-- Every read is "one provider, a time window".
create index if not exists public_page_events_provider_occurred_idx
  on public.public_page_events(provider_id, occurred_at desc);

-- ── Access ──────────────────────────────────────────────────────────────────
-- RLS on with no policies: neither visitors nor providers reach rows through
-- the Data API. The ingest route writes and the analytics route reads with the
-- service role, after checking ownership and the `analytics` entitlement.
alter table public.public_page_events enable row level security;

revoke all on table public.public_page_events from public, anon, authenticated;

grant select, insert, delete on table public.public_page_events to service_role;

-- ── Retention ───────────────────────────────────────────────────────────────
-- Thirteen months: enough for a year-over-year comparison, no more.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'purge-public-page-events',
  '17 3 * * *',
  $$delete from public.public_page_events where occurred_at < now() - interval '13 months'$$
);

-- ── Summary ─────────────────────────────────────────────────────────────────
-- One round trip for the whole dashboard. Days are bucketed in the provider's
-- time zone so "Tuesday" means the provider's Tuesday. SECURITY INVOKER and
-- granted only to the service role: the caller has already decided that this
-- provider's owner may see this provider's numbers.

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
    select e.*
    from public.public_page_events e, bounds b
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
      count(*) filter (where s.event = 'booking_confirmed') as bookings
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
      count(*) filter (where s.event = 'booking_confirmed') as bookings
    from scoped s
    group by 1, 2, 3
  ),
  referrers as (
    select
      s.referrer_host as host,
      count(*) filter (where s.event = 'page_view') as views,
      count(*) filter (where s.event = 'booking_confirmed') as bookings
    from scoped s
    where s.referrer_host is not null
    group by 1
  ),
  service_stats as (
    select
      s.service_id,
      sv.name,
      count(distinct s.visitor_hash) filter (where s.event = 'service_selected') as selections,
      count(*) filter (where s.event = 'booking_confirmed') as bookings
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
        'bookings', count(*) filter (where event = 'booking_confirmed'),
        'bookingVisitors', count(distinct visitor_hash) filter (where event = 'booking_confirmed')
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
