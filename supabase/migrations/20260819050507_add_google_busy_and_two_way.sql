-- Google busy-time blocking and conservative two-way sync.
--
-- Two capabilities, one migration, because they share a spine: the same
-- connection, the same watch channels, and the same rule that a provider's wider
-- calendar is read for *availability* and never for content.
--
-- What is deliberately not stored anywhere here: event titles, descriptions,
-- locations, attendees, organizers, conference links, or any other body of an
-- event Haab did not create. Busy blocking needs intervals, not what fills them.

-- ── Busy sources ───────────────────────────────────────────────────────────
-- The calendars a provider chose to have block their availability. Explicitly
-- chosen, never inferred: silently reading every calendar an account can see
-- would turn a personal appointment into a business rule nobody asked for.
create table if not exists public.provider_google_calendar_busy_sources (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  connection_id uuid not null
    references public.provider_google_calendar_connections(id) on delete cascade,
  connection_generation uuid not null,

  calendar_id text not null,
  -- Shown in the UI so a provider recognises the calendar; the id is often an
  -- email address and stays server-side.
  calendar_summary text,
  calendar_timezone text,
  access_role text not null,
  is_primary boolean not null default false,
  enabled boolean not null default true,

  -- Which snapshot of intervals is currently authoritative for this source.
  active_snapshot_generation uuid,
  last_refreshed_at timestamptz,
  last_error_code text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint provider_google_busy_sources_calendar_unique
    unique (provider_id, connection_generation, calendar_id),
  -- freeBusyReader is enough to read busy time; a source never needs write.
  constraint provider_google_busy_sources_access_role_valid
    check (access_role in ('freeBusyReader', 'reader', 'writer', 'owner')),
  constraint provider_google_busy_sources_calendar_id_bounded
    check (length(btrim(calendar_id)) > 0 and length(calendar_id) <= 1024),
  constraint provider_google_busy_sources_error_bounded
    check (last_error_code is null or (length(btrim(last_error_code)) > 0 and length(last_error_code) <= 64)),
  -- The connection must be this provider's, at the generation claimed.
  constraint provider_google_busy_sources_connection_fkey
    foreign key (connection_id, provider_id, connection_generation)
    references public.provider_google_calendar_connections(id, provider_id, connection_generation)
    on delete cascade
);

create index if not exists provider_google_busy_sources_provider_idx
  on public.provider_google_calendar_busy_sources (provider_id)
  where enabled;

create index if not exists provider_google_busy_sources_connection_idx
  on public.provider_google_calendar_busy_sources (connection_id, provider_id, connection_generation);

-- ── Busy intervals ─────────────────────────────────────────────────────────
-- Opaque time, and nothing else. No title, no attendees, no event id: this
-- table answers "is the provider free" and is incapable of answering anything
-- more, which is the point.
create table if not exists public.provider_google_calendar_busy_intervals (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  busy_source_id uuid not null
    references public.provider_google_calendar_busy_sources(id) on delete cascade,
  -- Written under a new generation, then switched to atomically. A half-written
  -- refresh is never visible as availability.
  snapshot_generation uuid not null,

  starts_at timestamptz not null,
  ends_at timestamptz not null,
  refreshed_at timestamptz not null default now(),

  constraint provider_google_busy_intervals_ordered check (ends_at > starts_at)
);

-- The overlap query's own shape: provider, then time.
create index if not exists provider_google_busy_intervals_lookup_idx
  on public.provider_google_calendar_busy_intervals (provider_id, starts_at, ends_at);

-- Used by the generation switch and by cleanup of superseded snapshots.
create index if not exists provider_google_busy_intervals_snapshot_idx
  on public.provider_google_calendar_busy_intervals (busy_source_id, snapshot_generation);

-- A GiST range index is the textbook answer for overlap, but it earns its cost
-- only past a size this table has never reached. Left out until a query plan on
-- real volume asks for it.

-- ── Watch channels ─────────────────────────────────────────────────────────
create table if not exists public.provider_google_calendar_watch_channels (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  connection_id uuid not null
    references public.provider_google_calendar_connections(id) on delete cascade,
  connection_generation uuid not null,
  busy_source_id uuid
    references public.provider_google_calendar_busy_sources(id) on delete cascade,

  purpose text not null,
  channel_id text not null,
  -- Hashed, never stored raw: a notification proves itself by presenting the
  -- token, and a leaked table should not let anyone forge one.
  channel_token_hash text not null,
  resource_id text,
  calendar_id text not null,
  status text not null default 'creating',
  expires_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  retired_at timestamptz,

  constraint provider_google_watch_channels_channel_id_unique unique (channel_id),
  constraint provider_google_watch_channels_purpose_valid
    check (purpose in ('busy_refresh', 'managed_event_inbound')),
  constraint provider_google_watch_channels_status_valid
    check (status in ('creating', 'active', 'retiring', 'expired', 'stopped', 'failed')),
  constraint provider_google_watch_channels_token_hash_shape
    check (length(channel_token_hash) between 32 and 128),
  constraint provider_google_watch_channels_channel_id_shape
    check (length(btrim(channel_id)) > 0 and length(channel_id) <= 128)
);

create index if not exists provider_google_watch_channels_renewal_idx
  on public.provider_google_calendar_watch_channels (expires_at)
  where status in ('creating', 'active');

create index if not exists provider_google_watch_channels_provider_idx
  on public.provider_google_calendar_watch_channels (provider_id);

create index if not exists provider_google_watch_channels_connection_idx
  on public.provider_google_calendar_watch_channels (connection_id);

create index if not exists provider_google_watch_channels_busy_source_idx
  on public.provider_google_calendar_watch_channels (busy_source_id);

-- ── Notification inbox ─────────────────────────────────────────────────────
-- Google's push body is empty and its headers say only "something changed".
-- The row records that a nudge arrived; the worker is what asks Google what for.
create table if not exists public.google_calendar_webhook_inbox (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null,
  resource_id text,
  message_number bigint not null,
  resource_state text not null,

  status text not null default 'pending',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  lease_token uuid,
  leased_by text,
  lease_expires_at timestamptz,
  last_error_code text,

  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz,

  -- Exact deduplication. Google retries notifications, and the pair is what
  -- makes a retry recognisable rather than a second unit of work.
  constraint google_webhook_inbox_channel_message_unique
    unique (channel_id, message_number),
  constraint google_webhook_inbox_status_valid
    check (status in ('pending', 'processing', 'processed', 'skipped', 'failed', 'dead_letter')),
  constraint google_webhook_inbox_resource_state_valid
    check (resource_state in ('sync', 'exists', 'not_exists')),
  constraint google_webhook_inbox_message_number_nonnegative
    check (message_number >= 0),
  constraint google_webhook_inbox_attempts_nonnegative check (attempt_count >= 0),
  constraint google_webhook_inbox_error_bounded
    check (last_error_code is null or (length(btrim(last_error_code)) > 0 and length(last_error_code) <= 64)),
  constraint google_webhook_inbox_processing_holds_lease
    check (
      status <> 'processing'
      or (lease_token is not null and leased_by is not null and lease_expires_at is not null)
    ),
  constraint google_webhook_inbox_idle_has_no_lease
    check (
      status = 'processing'
      or (lease_token is null and leased_by is null and lease_expires_at is null)
    )
);

create index if not exists google_webhook_inbox_claimable_idx
  on public.google_calendar_webhook_inbox (available_at, received_at)
  where status in ('pending', 'failed');

create index if not exists google_webhook_inbox_channel_idx
  on public.google_calendar_webhook_inbox (channel_id, received_at desc);

-- ── Sync cursors ───────────────────────────────────────────────────────────
-- Google's sync token, which is internal state rather than a credential but is
-- treated like one anyway: backend-only, never logged, never sent to a browser.
create table if not exists public.provider_google_calendar_sync_cursors (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  connection_id uuid not null
    references public.provider_google_calendar_connections(id) on delete cascade,
  connection_generation uuid not null,
  calendar_id text not null,

  sync_token text,
  sync_mode text not null default 'full',
  -- Bumped in code when the query's shape changes. A token fetched under a
  -- different query is not valid for this one, and replaying it would silently
  -- miss events.
  query_version integer not null default 1,

  last_full_sync_at timestamptz,
  last_incremental_sync_at timestamptz,
  last_notification_at timestamptz,
  last_error_code text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint provider_google_sync_cursors_calendar_unique
    unique (provider_id, connection_generation, calendar_id),
  constraint provider_google_sync_cursors_mode_valid
    check (sync_mode in ('full', 'incremental', 'resyncing')),
  constraint provider_google_sync_cursors_query_version_positive
    check (query_version > 0),
  constraint provider_google_sync_cursors_error_bounded
    check (last_error_code is null or (length(btrim(last_error_code)) > 0 and length(last_error_code) <= 64))
);

create index if not exists provider_google_sync_cursors_connection_idx
  on public.provider_google_calendar_sync_cursors (connection_id);

create index if not exists provider_google_sync_cursors_provider_idx
  on public.provider_google_calendar_sync_cursors (provider_id);

-- ── Inbound staging ────────────────────────────────────────────────────────
-- Minimal, allowlisted fields from events Haab itself created. Retrieval is
-- separated from application so a Google read never sits inside a booking
-- transaction, and a failed apply does not force a re-fetch.
create table if not exists public.google_calendar_inbound_changes (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  connection_id uuid not null
    references public.provider_google_calendar_connections(id) on delete cascade,
  connection_generation uuid not null,
  booking_id uuid references public.bookings(id) on delete cascade,

  google_event_id text not null,
  google_event_etag text,
  google_updated_at timestamptz,
  google_status text not null,

  -- Times only, in Google's own shape. Never summary, description, location,
  -- attendees, organizer, or conference data.
  start_payload jsonb,
  end_payload jsonb,
  event_type text,
  recurring_event_id text,
  haab_properties jsonb,

  status text not null default 'pending',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  lease_token uuid,
  leased_by text,
  lease_expires_at timestamptz,
  last_error_code text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz,

  -- Identity plus version: the same event at the same revision is one unit of
  -- work however many notifications announced it.
  constraint google_inbound_changes_event_version_unique
    unique (connection_generation, google_event_id, google_event_etag),
  constraint google_inbound_changes_status_valid
    check (status in ('pending', 'processing', 'applied', 'rejected', 'skipped', 'failed', 'dead_letter')),
  constraint google_inbound_changes_google_status_valid
    check (google_status in ('confirmed', 'tentative', 'cancelled')),
  constraint google_inbound_changes_attempts_nonnegative check (attempt_count >= 0),
  constraint google_inbound_changes_error_bounded
    check (last_error_code is null or (length(btrim(last_error_code)) > 0 and length(last_error_code) <= 64)),
  constraint google_inbound_changes_start_object
    check (start_payload is null or jsonb_typeof(start_payload) = 'object'),
  constraint google_inbound_changes_end_object
    check (end_payload is null or jsonb_typeof(end_payload) = 'object'),
  constraint google_inbound_changes_properties_object
    check (haab_properties is null or jsonb_typeof(haab_properties) = 'object'),
  -- A staged change is identifiers and times. Anything larger means somebody
  -- started copying the event body in.
  constraint google_inbound_changes_payload_bounded
    check (
      octet_length(coalesce(start_payload, '{}'::jsonb)::text)
        + octet_length(coalesce(end_payload, '{}'::jsonb)::text)
        + octet_length(coalesce(haab_properties, '{}'::jsonb)::text) <= 4096
    ),
  constraint google_inbound_changes_processing_holds_lease
    check (
      status <> 'processing'
      or (lease_token is not null and leased_by is not null and lease_expires_at is not null)
    ),
  constraint google_inbound_changes_idle_has_no_lease
    check (
      status = 'processing'
      or (lease_token is null and leased_by is null and lease_expires_at is null)
    )
);

create index if not exists google_inbound_changes_claimable_idx
  on public.google_calendar_inbound_changes (available_at, created_at)
  where status in ('pending', 'failed');

create index if not exists google_inbound_changes_provider_idx
  on public.google_calendar_inbound_changes (provider_id);

create index if not exists google_inbound_changes_connection_idx
  on public.google_calendar_inbound_changes (connection_id);

create index if not exists google_inbound_changes_booking_idx
  on public.google_calendar_inbound_changes (booking_id);

-- ── Conflicts ──────────────────────────────────────────────────────────────
-- What a provider is shown when Google asked for something Haab would not do.
-- Safe details only: a code and the schedules, never the Google event's content
-- and never the client's.
create table if not exists public.google_calendar_sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  event_mapping_id uuid
    references public.provider_google_calendar_event_mappings(id) on delete set null,
  inbound_change_id uuid
    references public.google_calendar_inbound_changes(id) on delete set null,

  conflict_type text not null,
  booking_version bigint not null,
  google_event_etag text,
  status text not null default 'open',
  safe_details jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text,

  constraint google_sync_conflicts_type_valid
    check (conflict_type in (
      'duration_changed', 'outside_business_hours', 'haab_booking_overlap',
      'google_busy_overlap', 'capacity_conflict', 'invalid_timezone',
      'recurrence_not_supported', 'calendar_changed', 'ownership_mismatch',
      'stale_google_change', 'booking_not_mutable', 'deletion_not_allowed'
    )),
  constraint google_sync_conflicts_status_valid
    check (status in ('open', 'repairing', 'auto_repaired', 'resolved_haab', 'resolved_google', 'ignored')),
  constraint google_sync_conflicts_details_object
    check (jsonb_typeof(safe_details) = 'object'),
  constraint google_sync_conflicts_details_bounded
    check (octet_length(safe_details::text) <= 2048),
  constraint google_sync_conflicts_resolved_has_time
    check ((status in ('open', 'repairing')) = (resolved_at is null))
);

create index if not exists google_sync_conflicts_open_idx
  on public.google_calendar_sync_conflicts (provider_id, created_at desc)
  where status in ('open', 'repairing');

create index if not exists google_sync_conflicts_booking_idx
  on public.google_calendar_sync_conflicts (booking_id);

create index if not exists google_sync_conflicts_mapping_idx
  on public.google_calendar_sync_conflicts (event_mapping_id);

create index if not exists google_sync_conflicts_inbound_idx
  on public.google_calendar_sync_conflicts (inbound_change_id);

-- ── Deletion policy ────────────────────────────────────────────────────────
-- Off by default, and only a provider can turn it on. Deleting a calendar entry
-- is a gesture people make casually; cancelling a customer's booking is not, so
-- the two are not equated without an explicit, informed choice.
alter table public.provider_google_calendar_connections
  add column if not exists two_way_enabled boolean not null default false,
  add column if not exists deletion_cancels_booking boolean not null default false,
  add column if not exists busy_blocking_enabled boolean not null default false;

-- ── Mapping state for loop prevention ──────────────────────────────────────
-- Enough to recognise Haab's own outbound write coming back as an inbound
-- notification. Explicit origin tracking, not a time window: "recent" is a
-- guess, and a guess here means either an ignored real edit or an endless loop.
alter table public.provider_google_calendar_event_mappings
  add column if not exists last_google_etag text,
  add column if not exists last_google_updated_at timestamptz,
  add column if not exists last_applied_inbound_change_id uuid,
  add column if not exists google_applied_booking_version bigint,
  add column if not exists last_outbound_booking_version bigint;

-- ── Updated-at triggers ────────────────────────────────────────────────────
do $$
declare
  target text;
begin
  foreach target in array array[
    'provider_google_calendar_busy_sources',
    'provider_google_calendar_watch_channels',
    'google_calendar_webhook_inbox',
    'provider_google_calendar_sync_cursors',
    'google_calendar_inbound_changes',
    'google_calendar_sync_conflicts'
  ]
  loop
    execute format(
      'drop trigger if exists %I_set_updated_at on public.%I',
      target, target
    );
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
         for each row execute function private.set_updated_at()',
      target, target
    );
  end loop;
end;
$$;

-- ── Access ─────────────────────────────────────────────────────────────────
-- Same rule as every operational table here: RLS on, no policies, nothing for
-- anon or authenticated. A provider sees busy state and conflicts through a
-- server route that shapes a safe DTO; none of these rows are ever sent raw.
alter table public.provider_google_calendar_busy_sources enable row level security;
alter table public.provider_google_calendar_busy_intervals enable row level security;
alter table public.provider_google_calendar_watch_channels enable row level security;
alter table public.google_calendar_webhook_inbox enable row level security;
alter table public.provider_google_calendar_sync_cursors enable row level security;
alter table public.google_calendar_inbound_changes enable row level security;
alter table public.google_calendar_sync_conflicts enable row level security;

revoke all on table public.provider_google_calendar_busy_sources from public, anon, authenticated;
revoke all on table public.provider_google_calendar_busy_intervals from public, anon, authenticated;
revoke all on table public.provider_google_calendar_watch_channels from public, anon, authenticated;
revoke all on table public.google_calendar_webhook_inbox from public, anon, authenticated;
revoke all on table public.provider_google_calendar_sync_cursors from public, anon, authenticated;
revoke all on table public.google_calendar_inbound_changes from public, anon, authenticated;
revoke all on table public.google_calendar_sync_conflicts from public, anon, authenticated;

grant select, insert, update, delete on table public.provider_google_calendar_busy_sources to service_role;
grant select, insert, update, delete on table public.provider_google_calendar_busy_intervals to service_role;
grant select, insert, update, delete on table public.provider_google_calendar_watch_channels to service_role;
grant select, insert, update on table public.google_calendar_webhook_inbox to service_role;
grant select, insert, update, delete on table public.provider_google_calendar_sync_cursors to service_role;
grant select, insert, update on table public.google_calendar_inbound_changes to service_role;
grant select, insert, update on table public.google_calendar_sync_conflicts to service_role;

-- ── Snapshot switch ────────────────────────────────────────────────────────
-- The whole point of snapshot generations: a refresh writes a new generation,
-- then this makes it authoritative and drops the old one in one statement.
-- Availability never sees a half-written refresh, and the previous snapshot
-- stays valid until its replacement is complete.
create or replace function public.activate_google_busy_snapshot(
  p_busy_source_id uuid,
  p_snapshot_generation uuid
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  removed integer;
begin
  update public.provider_google_calendar_busy_sources
  set active_snapshot_generation = p_snapshot_generation,
      last_refreshed_at = now(),
      last_error_code = null,
      updated_at = now()
  where id = p_busy_source_id;

  delete from public.provider_google_calendar_busy_intervals
  where busy_source_id = p_busy_source_id
    and snapshot_generation <> p_snapshot_generation;

  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.activate_google_busy_snapshot(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.activate_google_busy_snapshot(uuid, uuid) to service_role;
