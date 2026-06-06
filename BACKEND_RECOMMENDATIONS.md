# Haab Calendar - Backend Recommendations

## Target Scale

First versions will serve 1,000-5,000 users per month.

## Recommended: Supabase

The project is already on Next.js + Vercel. Supabase is the natural backend complement.

### Why it fits

- **Postgres database** — relational data is the right model for bookings (services, availability, bookings, holds all have clear relationships and need transactional integrity)
- **Row Level Security** — per-provider data isolation at the database level
- **Realtime subscriptions** — live slot availability updates to prevent double-booking UI mismatches
- **Auth built-in** — provider login is ready when needed
- **Free tier** covers this scale comfortably (50k monthly active users, 500MB database)
- **JS client** integrates directly with the existing callback hooks (`onBookingsChange`, `onStoreChange`)

### Key implementation principle

Supabase should be the source of truth, but public booking writes should not be plain client-side table inserts. Reads can use the Supabase client where the returned data is public-safe, but booking-critical writes should go through Next.js Route Handlers, Server Actions, or Postgres RPCs that run server-side validation in one transaction. The backend is the authority for holds, confirmations, conflicts, and ownership checks.

### Why not alternatives

| Option | Why skip it (for now) |
|--------|----------------------|
| Firebase/Firestore | Document DB is awkward for relational booking data — querying "all available slots on Tuesday across services" gets messy |
| Custom API + standalone DB | Unnecessary infrastructure overhead at this scale |
| Prisma + PlanetScale | More setup and maintenance than Supabase for the same result |
| Serverless functions + DynamoDB | Over-engineered, poor fit for relational queries |

## Suggested Schema

### Tables

```sql
-- Provider profiles and their weekly availability
providers (
  id                  uuid primary key,
  owner_user_id       uuid not null references auth.users(id),
  full_name           text not null,
  business_name       text not null,
  email               text not null,
  slug                text unique not null,
  timezone            text not null default 'UTC',
  booking_window_days int not null default 60,
  availability        jsonb not null,  -- weekly schedule (fixed structure, not queried against)
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
)

-- Services offered by each provider
services (
  id          uuid primary key,
  provider_id uuid not null references providers(id) on delete cascade,
  name        text not null,
  type        text not null,  -- 'appointment' | 'full-day'
  duration    int,            -- minutes, null for full-day
  description text,
  capacity    int default 1,
  cost        numeric(10,2),
  notes       text,
  sort_order  int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
)

-- Confirmed, rescheduled, or cancelled bookings
bookings (
  id                 uuid primary key,
  provider_id        uuid not null references providers(id) on delete cascade,
  service_id         uuid references services(id) on delete set null,
  service_name       text not null, -- snapshot, do not derive historical display from current service row
  cost_snapshot      text,
  capacity_snapshot  text,
  client_name        text not null,
  client_email       text not null,
  client_phone       text,
  date               date not null,
  start_time         time,          -- null for full-day
  end_time           time,          -- null for full-day
  status             text not null, -- 'confirmed' | 'rescheduled' | 'cancelled'
  notes              text,
  manage_token_hash  text unique not null,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
)

-- Temporary slot reservations (10-minute expiry)
booking_holds (
  id          uuid primary key,
  provider_id uuid not null references providers(id) on delete cascade,
  service_id  uuid not null references services(id) on delete cascade,
  date        date not null,
  start_time  time,
  end_time    time,
  expires_at  timestamptz not null,
  created_at  timestamptz default now()
)

-- Provider and customer-visible change history
booking_events (
  id          uuid primary key,
  booking_id  uuid not null references bookings(id) on delete cascade,
  provider_id uuid not null references providers(id) on delete cascade,
  actor_type  text not null, -- 'provider' | 'customer' | 'system'
  event_type  text not null, -- 'created' | 'rescheduled' | 'cancelled' | etc.
  metadata    jsonb not null default '{}',
  created_at  timestamptz default now()
)
```

### Design decisions

- **Availability as JSONB** — it's a fixed 7-day weekly structure, not something queried with SQL filters. Keeping it as a JSON column on the provider row avoids unnecessary normalization.
- **Everything else is relational** — bookings, services, and holds benefit from foreign keys, indexes, and SQL queries (e.g., "all bookings for provider X on date Y where status = confirmed").
- **`sort_order` on services** — enables drag-to-reorder in the admin UI.
- **`booking_holds.expires_at`** — replaces the client-side timer with a server-authoritative expiration.
- **`owner_user_id` on providers** — anchors RLS and authenticated admin ownership to `auth.users`.
- **Booking snapshot fields** — `service_name`, `cost_snapshot`, and `capacity_snapshot` preserve historical display even if a service is renamed, repriced, or deleted.
- **`manage_token_hash` instead of plaintext token** — the client receives the raw manage token once; the database stores only a hash.
- **`timezone` and `booking_window_days`** — these are needed early for production-safe availability and public booking windows.
- **`booking_events`** — keeps reschedule/cancellation history and gives support/debugging a durable audit trail.

### Recommended constraints and indexes

- `providers.slug` unique.
- `bookings(provider_id, date, status)` for admin schedule queries.
- `booking_holds(provider_id, date, expires_at)` for availability checks and cleanup.
- `bookings.manage_token_hash` unique.
- A partial unique index on confirmed, non-cancelled booking slots is useful for final double-booking protection.
- Active-hold uniqueness needs careful implementation: Postgres cannot use `now()` in an ordinary partial unique index. Use a server transaction and either a deterministic slot lock (for example, transaction-scoped advisory locks keyed by provider/service/date/time) or a separate active-hold model that can be uniquely constrained without a volatile predicate.

## Integration Path

The module already has the right hooks. Migration from localStorage to Supabase follows four steps, with booking-critical writes routed through server-authoritative code rather than direct public table inserts:

### 1. Replace localStorage reads with Supabase queries

```typescript
// Before
const store = JSON.parse(localStorage.getItem(storageKey));

// After
const { data: provider } = await supabase
  .from('providers')
  .select('*, services(*)')
  .eq('slug', slug)
  .single();
```

### 2. Replace localStorage writes with Supabase inserts/updates

Provider-owned admin writes can use authenticated Supabase operations protected by RLS. Public booking writes should call a Route Handler, Server Action, or RPC that performs validation and writes in a transaction.

```typescript
// Before
localStorage.setItem(storageKey, JSON.stringify(store));

// After
await fetch(`/api/public/providers/${slug}/bookings`, {
  method: 'POST',
  body: JSON.stringify({ hold_id, client_name, client_email, client_phone, notes, idempotency_key }),
});
```

### 3. Replace the client-side hold timer with a DB row

```typescript
// Create hold through server-side validation.
// The server re-runs availability checks, takes a slot lock, and sets expires_at.
const response = await fetch(`/api/public/providers/${slug}/holds`, {
  method: 'POST',
  body: JSON.stringify({ service_id, date, start_time, end_time }),
});

const hold = await response.json();

// Clean expired holds via Supabase cron or edge function
// DELETE FROM booking_holds WHERE expires_at < now();
```

### 4. Use Supabase Realtime for live availability

```typescript
// Subscribe to booking changes for a provider
const channel = supabase
  .channel('bookings')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'bookings',
    filter: `provider_id=eq.${providerId}`,
  }, (payload) => {
    // Update local state — keeps multiple clients' calendars in sync
    refreshAvailability();
  })
  .subscribe();
```

### Server-authoritative booking flow

Treat client-side availability as a preview, not authority:

1. Public client requests a hold.
2. Server re-runs availability checks from the database, takes a slot lock, creates the hold, and returns `expires_at`.
3. Public client submits booking details with `hold_id` and an idempotency key.
4. Server transaction verifies the hold is unexpired, belongs to the same slot, and no active booking conflicts.
5. Server creates the booking, stores snapshot fields, stores only `manage_token_hash`, deletes/releases the hold, records a `booking_events` row, and returns the booking plus the raw manage token once.

Do not show a customer a booking as confirmed until step 5 succeeds. Optimistic UI is still useful for pending states, drafts, local admin edits, and retry queues, but confirmed bookings must be server-confirmed.

### Security and RLS notes

- Public reads must return only provider, services, availability, and computed slot lists. Never return raw bookings or holds to the public booking page.
- Public manage-link routes should look up bookings by hashing the presented token and comparing it to `manage_token_hash`.
- Admin reads/writes must require Supabase Auth and RLS scoped through `providers.owner_user_id = auth.uid()`.
- Avoid storing authorization roles in user-editable metadata. Use provider ownership rows or app metadata for authorization decisions.
- If server code uses a service-role key for transactional writes, keep it server-only and never expose it through `NEXT_PUBLIC_` variables.

## Scaling Notes

- Supabase free tier handles everything at 1k-5k users/month
- Paid tier ($25/month) kicks in around 10k+ users or if file storage is needed (e.g., provider logos)
- The Postgres database underneath is fully portable — if you outgrow Supabase, migrate to any managed Postgres provider (Neon, RDS, Railway) without schema changes
