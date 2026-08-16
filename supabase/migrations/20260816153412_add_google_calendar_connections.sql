-- One-way Google Calendar projection: the connection, and what it has written.
--
-- Two tables. The connection holds the provider's grant — encrypted refresh
-- token, granted scopes, the one calendar Haab writes to. The mapping records
-- which Google event corresponds to which booking, and which booking version
-- that event last reflected.
--
-- Neither is reachable by anon or authenticated. A provider manages the
-- connection through server routes that check ownership and entitlement; it
-- must never read its own encrypted token, and must never write the row that
-- says which calendar it is entitled to.

-- ── Connection ─────────────────────────────────────────────────────────────
create table if not exists public.provider_google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,

  -- Rotated on every reconnect. Anything carrying an older generation is stale
  -- by definition, which is how a reconnect invalidates work already in flight
  -- without having to find and cancel it.
  connection_generation uuid not null default gen_random_uuid(),

  google_account_email text,
  -- Google's stable subject id. Not an email: a user can change theirs.
  google_account_subject text,

  -- Sealed with AES-256-GCM in the application. The database never sees the
  -- token, so a dump of this table yields nothing usable.
  refresh_token_ciphertext text not null,
  refresh_token_iv text not null,
  refresh_token_auth_tag text not null,
  refresh_token_key_version integer not null default 1,

  granted_scopes text[] not null default '{}',

  -- The single calendar this connection writes to. Chosen explicitly by the
  -- provider from calendars they can write to.
  target_calendar_id text,
  target_calendar_summary text,
  target_calendar_timezone text,

  status text not null default 'connected',
  last_error_code text,
  last_synced_at timestamptz,
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One Google connection per provider. Multiple accounts is explicitly out of
  -- scope, and a unique constraint says so rather than leaving the handler to
  -- choose between rows.
  constraint provider_google_calendar_connections_provider_unique unique (provider_id),
  constraint provider_google_calendar_connections_status_valid
    check (status in ('connected', 'needs_reauth', 'paused', 'disconnected')),
  constraint provider_google_calendar_connections_error_bounded
    check (last_error_code is null or (length(btrim(last_error_code)) > 0 and length(last_error_code) <= 64)),
  constraint provider_google_calendar_connections_calendar_bounded
    check (target_calendar_id is null or length(target_calendar_id) <= 1024),
  constraint provider_google_calendar_connections_key_version_positive
    check (refresh_token_key_version > 0)
);

create index if not exists provider_google_calendar_connections_status_idx
  on public.provider_google_calendar_connections (status);

drop trigger if exists provider_google_calendar_connections_set_updated_at
  on public.provider_google_calendar_connections;
create trigger provider_google_calendar_connections_set_updated_at
  before update on public.provider_google_calendar_connections
  for each row
  execute function private.set_updated_at();

-- ── Event mapping ──────────────────────────────────────────────────────────
-- The Google event id is derived, not stored to be looked up — but the mapping
-- still records it, because the id alone cannot tell you whether the event was
-- ever written, or which booking version it reflects.
create table if not exists public.provider_google_calendar_event_mappings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  connection_id uuid not null
    references public.provider_google_calendar_connections(id) on delete cascade,
  connection_generation uuid not null,
  booking_id uuid not null references public.bookings(id) on delete cascade,

  google_calendar_id text not null,
  google_event_id text not null,
  google_event_etag text,
  google_event_status text,

  -- Which booking version this event currently reflects. An outbox delivery
  -- carrying an older version is a replay and can be answered without calling
  -- Google at all.
  last_projected_booking_version bigint not null default 0,
  last_projected_at timestamptz,
  last_error_code text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint provider_google_calendar_event_mappings_booking_unique
    unique (booking_id, connection_generation),
  constraint provider_google_calendar_event_mappings_event_unique
    unique (google_calendar_id, google_event_id),
  constraint provider_google_calendar_event_mappings_version_nonnegative
    check (last_projected_booking_version >= 0),
  constraint provider_google_calendar_event_mappings_error_bounded
    check (last_error_code is null or (length(btrim(last_error_code)) > 0 and length(last_error_code) <= 64)),
  constraint provider_google_calendar_event_mappings_event_id_bounded
    check (length(google_event_id) between 5 and 1024)
);

-- Foreign keys used for joins and cascade deletion, each indexed.
create index if not exists provider_google_calendar_event_mappings_provider_idx
  on public.provider_google_calendar_event_mappings (provider_id);

create index if not exists provider_google_calendar_event_mappings_connection_idx
  on public.provider_google_calendar_event_mappings (connection_id);

create index if not exists provider_google_calendar_event_mappings_booking_idx
  on public.provider_google_calendar_event_mappings (booking_id);

drop trigger if exists provider_google_calendar_event_mappings_set_updated_at
  on public.provider_google_calendar_event_mappings;
create trigger provider_google_calendar_event_mappings_set_updated_at
  before update on public.provider_google_calendar_event_mappings
  for each row
  execute function private.set_updated_at();

-- ── Access ─────────────────────────────────────────────────────────────────
-- RLS on, no policies, nothing granted to anon or authenticated. Providers
-- reach these rows only through server routes that verify ownership and
-- entitlement; the encrypted token is never readable by a client role at all.
alter table public.provider_google_calendar_connections enable row level security;
alter table public.provider_google_calendar_event_mappings enable row level security;

revoke all on table public.provider_google_calendar_connections
  from public, anon, authenticated;
revoke all on table public.provider_google_calendar_event_mappings
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.provider_google_calendar_connections to service_role;
grant select, insert, update, delete
  on table public.provider_google_calendar_event_mappings to service_role;
