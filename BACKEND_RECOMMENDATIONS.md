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
  id            uuid primary key,
  full_name     text not null,
  business_name text not null,
  email         text not null,
  slug          text unique not null,
  availability  jsonb not null,  -- weekly schedule (fixed structure, not queried against)
  created_at    timestamptz default now()
)

-- Services offered by each provider
services (
  id          uuid primary key,
  provider_id uuid references providers(id),
  name        text not null,
  type        text not null,  -- 'appointment' | 'full-day'
  duration    int,            -- minutes, null for full-day
  description text,
  capacity    int default 1,
  cost        numeric(10,2),
  notes       text,
  sort_order  int default 0,
  created_at  timestamptz default now()
)

-- Confirmed, rescheduled, or cancelled bookings
bookings (
  id           uuid primary key,
  provider_id  uuid references providers(id),
  service_id   uuid references services(id),
  client_name  text not null,
  client_email text not null,
  client_phone text,
  date         date not null,
  start_time   time,          -- null for full-day
  end_time     time,          -- null for full-day
  status       text not null, -- 'confirmed' | 'rescheduled' | 'cancelled'
  notes        text,
  created_at   timestamptz default now()
)

-- Temporary slot reservations (10-minute expiry)
booking_holds (
  id          uuid primary key,
  provider_id uuid references providers(id),
  service_id  uuid references services(id),
  date        date not null,
  start_time  time,
  end_time    time,
  expires_at  timestamptz not null,
  created_at  timestamptz default now()
)
```

### Design decisions

- **Availability as JSONB** — it's a fixed 7-day weekly structure, not something queried with SQL filters. Keeping it as a JSON column on the provider row avoids unnecessary normalization.
- **Everything else is relational** — bookings, services, and holds benefit from foreign keys, indexes, and SQL queries (e.g., "all bookings for provider X on date Y where status = confirmed").
- **`sort_order` on services** — enables drag-to-reorder in the admin UI.
- **`booking_holds.expires_at`** — replaces the client-side timer with a server-authoritative expiration.

## Integration Path

The module already has the right hooks. Migration from localStorage to Supabase follows four steps:

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

```typescript
// Before
localStorage.setItem(storageKey, JSON.stringify(store));

// After
await supabase
  .from('bookings')
  .insert({ provider_id, service_id, client_name, client_email, date, start_time, end_time, status: 'confirmed' });
```

### 3. Replace the client-side hold timer with a DB row

```typescript
// Create hold with server-side expiration
const { data: hold } = await supabase
  .from('booking_holds')
  .insert({
    provider_id,
    service_id,
    date,
    start_time,
    end_time,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })
  .select()
  .single();

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

## Scaling Notes

- Supabase free tier handles everything at 1k-5k users/month
- Paid tier ($25/month) kicks in around 10k+ users or if file storage is needed (e.g., provider logos)
- The Postgres database underneath is fully portable — if you outgrow Supabase, migrate to any managed Postgres provider (Neon, RDS, Railway) without schema changes
