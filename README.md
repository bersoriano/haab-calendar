# Haab Calendar

Reusable appointment and booking management module built with Next.js `16.2.4`.

## Screen Overview

1. Setup Wizard
   Standalone-first onboarding for provider info, services, weekly availability, and launch.
2. Provider Workspace
   Top navigation for `Dashboard`, `Bookings`, `Calendar`, `Services`, and `Settings`.
3. Public Booking Flow
   Step-by-step client wizard for service selection, date and time, a server-authoritative hold, customer details, confirmation, calendar export, and self-service management.
4. Public Route
   Dedicated hierarchical booking URLs such as `/doctors/dr-maya-alvarez`
   and `/spaces/klcc-meeting-room/hourly-rental`.

## Core Behaviors

- Supports both timed appointments and full-day bookings in the same module.
- Exposes one entry component, `HaabBookingModule`, backed by extracted layers: pure logic in `lib/`, primitives in `components/ui/`, persistence in `components/booking/state/useModuleStore.ts`. See `docs/ARCHITECTURE.md`.
- Runs in standalone mode by default with internal state and local persistence.
- Switches into integrated mode when provider, services, and availability are injected.
- Keeps services and settings visible but read-only when configured by a parent app.
- Lets provider and client reschedule or cancel bookings with instant updates.
- Protects public selections with a visible ten-minute server hold, one optional five-minute grace extension, reconnect validation, and automatic expiry cleanup.

## Booking Process

See [`docs/booking-engine.md`](docs/booking-engine.md) for diagrams of what
removes a candidate slot, who wins the race for the last one, and which database
constraint enforces which kind of service. See
[`docs/booking-process.md`](docs/booking-process.md) for the end-to-end lifecycle: availability, holds, offline/reconnect behavior, confirmation, ICS/QR output, manage links, rescheduling, cancellation, security boundaries, and verification.

## Routes

- `/`
  Provider workspace plus the requested screen-by-screen and flow overview.
- `/[vertical]/[providerSlug]`
  Public provider profile booking page. Supported vertical segments are
  `doctors`, `professionals`, `spaces`, `events`, and `restaurants`.
- `/[vertical]/[providerSlug]/[serviceSlug]`
  Public service-specific booking page.
- `/[vertical]/[providerSlug]/manage/[token]`
  Self-service page to view, reschedule, or cancel an existing booking via its manage token.
- `/gallery`
  Every published example page in one grid. The landing page shows four of them,
  picked per request, and links here.
- `/public/[slug]`
  Standalone local demo booking URL. Production-style public URLs should use
  the hierarchical routes above.

## Public Examples

Seed the published examples with `npm run seed:examples`. The command is
idempotent and gives each example its own non-login owner account.

- Health: `/doctors/dr-maya-rivera`
- Spaces: `/spaces/riverside-padel-club`
- Professional services: `/professionals/northstar-strategy`
- Events with capacity: `/events/makers-workshop`
- Races, single-date and weekly (Spanish): `/events/kilometro-cero-running`
- Beauty appointments (Spanish): `/professionals/nube-rosa-nail-studio`
- Dentist: `/doctors/brightpoint-dental`
- Veterinary (Spanish): `/doctors/clinica-veterinaria-patitas`
- Hair salon: `/professionals/copperline-hair-studio`
- Car service, one bay: `/professionals/northgate-auto-service`
- Personal golf coaching: `/professionals/fairway-lab-golf`
- Restaurant tables, 12 per seating: `/restaurants/casa-mirador`

Casa Mirador is the exception to the rule below: its services sell a fixed
number of tables at each seating, so a reservation takes one table rather than
the hour. Its dining room and terrace hold separate counts, which is why filling
the dining room at 20:00 leaves the terrace bookable. Every other example is a
single-resource business — one room, one chair, one bay, one coach — because a
booked appointment slot blocks that time across all of a provider's services. Hotel stays are deliberately absent; see the note at
the end of this section.

The two race entries are dated relative to the seed run, so re-seeding always
leaves them in the future. Every example is fictional, including the phone
numbers and addresses.

`lib/demo-pages.ts` is the allowlist these pages are resolved from; the seed
script must stay in sync with it (`lib/__tests__/demo-pages.test.ts` enforces
this).

### Verticals with no example, and why

One common booking business has no example page because the booking model
cannot represent it honestly today:

- **Hotel accommodation.** A stay is a date range. A booking carries one
  `dateKey`, and `full-day` means one whole date, not check-in through
  check-out, so a three-night stay can only be sold as three separate
  bookings that nothing keeps together.

No example uses a `full-day` service either. A full-day booking means an
uninterrupted day, so `isDateAvailable` rejects one on any weekday whose
opening hours are broken by a blocked window, and on any date that already
holds a booking of any kind. That is deliberate — an owner who wants to sell
full days removes the block — and the blocked-times hint in the availability
editor now says so.

### Editing the examples

The super admin edits them in the app: `/super-admin` → **Demo pages** →
**Edit demo**. That sets an httpOnly cookie naming the demo, and the normal
dashboard at `/` then loads and saves that example page instead of the
caller's own booking page, with a banner and an **Exit demo editing** button.

Every request re-checks that the caller is the super admin and that the target
row is still owned by a demo account, so the cookie alone grants nothing. Demo
writes run on a service-role client because RLS scopes writes to the caller's
own rows; only the four allowlisted demos can ever be targeted.

## Reuse

```tsx
import { HaabBookingModule } from "@/components/haab-booking-module";

export default function Example() {
  return (
    <HaabBookingModule
      injectedConfig={{
        provider: {
          fullName: "Dr. Maya Alvarez",
          businessName: "Haab Health Studio",
          email: "bookings@example.com",
          phoneNumber1: "+1 555 010 0123",
          phoneNumber2: "",
          address1: "123 Market Street",
          address2: "",
          publicSlug: "haab-health-studio",
          language: "en",
        },
        services: [
          {
            id: "consult",
            name: "Consultation",
            bookingType: "appointment",
            durationMinutes: 30,
            description: "Private consultation",
          },
        ],
        availability: {
          sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
          monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
          tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
          wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
          thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
          friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
          saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
        },
        vertical: "healthcare",
      }}
    />
  );
}
```

## Local Run

`npm install && npm run dev` is **not** enough on a fresh clone. The app reads
Supabase configuration at startup and throws without it, so the first page load
fails rather than degrading. Do all four steps.

### 1. Node

Node.js 22, the version CI uses. Older majors are untested.

### 2. Install

```bash
npm install
```

Two transitive packages (`sharp`, `unrs-resolver`) print an npm
`allow-scripts` warning about install scripts. Harmless — `sharp` matters only
for self-hosted image optimization and `unrs-resolver` only for ESLint.

### 3. A database

The app needs a Supabase project with this repo's migrations applied. Local is
the recommended default, and the only one the test suites will talk to.

```bash
npx supabase start          # starts Postgres, Auth, PostgREST, Studio in Docker
npx supabase db reset --local   # applies every migration from scratch
npx supabase status             # prints the URL and keys you need next
```

Needs a Docker-compatible runtime. Without one you can still run
`npm run ci` (typecheck, lint, unit tests, build) but not the app itself.

To point at a hosted project instead: `npx supabase link --project-ref <ref>`
then `npx supabase db push`. Never run `test:db` or `test:e2e` against it —
both are destructive and both refuse a non-local host by design.

### 4. Environment

```bash
cp .env.example .env.local
```

Fill these three from `npx supabase status`. Nothing works without them:

| Variable | From |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `API URL` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `anon key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role key` |

Everything else in `.env.example` is optional, and each one's absence disables
exactly one thing rather than breaking the app:

| Unset | Effect |
| --- | --- |
| `STRIPE_*` | The webhook endpoint refuses every request; no subscription grants premium |
| `GOOGLE_*` | The Google integration reports itself unavailable and no route offers it |
| `CRON_SECRET` | Both cron routes answer 401 to everything |
| `BLOB_READ_WRITE_TOKEN` | Image upload is unavailable |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No traces exported; the app runs normally |

`HAAB_DEPLOYMENT_NAMESPACE` defaults to `local` and should stay distinct per
environment — it is stamped into every Google Calendar event Haab creates, and
two deployments sharing a namespace will each treat the other's events as their
own.

Then:

```bash
npm run dev
```

### First sign-in

Auth is email + password through Supabase. Locally, `npx supabase start` runs
Inbucket for mail capture on <http://127.0.0.1:54324> — confirmation links land
there rather than in a real inbox.

Super-admin access is a single hardcoded address in `lib/super-admin-policy.ts`.
To reach `/super-admin` on your own machine, sign up with that address or change
the constant locally.

## Quality checks

```bash
npm ci
npm run typecheck      # tsc --noEmit
npm run lint
npm run test:unit      # Vitest, no browser and no database
npm run test:webhooks  # Stripe webhook, billing, and config tests
npm run test:coverage  # enforces thresholds on the premium-critical modules
npm run test:db        # needs a local Supabase (see below)
npm run test:e2e       # Playwright premium suite, needs local Supabase
npm run build
```

`npm run ci` chains typecheck, lint, coverage, and build — the checks that need
no container runtime.

### Prerequisites

- Node.js 22 (the version CI uses)
- A Docker-compatible runtime, for `npm run test:db` and `npm run test:e2e`
- Supabase CLI: `npx supabase start`
- Playwright browsers: `npx playwright install chromium`

`test:db` reads `SUPABASE_URL` and `SUPABASE_ANON_KEY`, falling back to the
`NEXT_PUBLIC_*` names — but `SUPABASE_SERVICE_ROLE_KEY` has no fallback and must
be set explicitly. If `.env.local` points at a hosted project, pass the local
values on the command line rather than exporting them globally:

```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=<local service_role key> \
SUPABASE_ANON_KEY=<local anon key> \
npm run test:db
```

Playwright starts its own server, but `reuseExistingServer` is on locally — stop
any `npm run dev` first, or the browser tests drive a server configured for a
different database than the one they seeded.

`--with-deps` is deliberately omitted above: it runs `apt-get`, which hung for a
full job timeout twice in CI, and the runner image already carries Chromium's
libraries.

The database and E2E suites refuse to run against anything but a local Supabase
host, and there is no HTTP seed or reset endpoint anywhere in the application.

### Continuous integration

`.github/workflows/ci.yml` runs three jobs — `quality`, `database`, and
`premium-e2e` — on every pull request and on `main`. It uses `npm ci`, pins every
action to a commit SHA, holds a read-only token, and needs no repository secrets,
so pull requests from forks run the full suite without touching anything remote.

Recommended (must be set by hand in GitHub settings — this repository's
configuration is not modified by any script here): require `quality`, `database`,
and `premium-e2e` as status checks on `main`.

### Background workers

`.github/workflows/scheduled-workers.yml` drives the two cron routes every five
minutes:

```
GET /api/cron/integration-outbox   Authorization: Bearer $CRON_SECRET
GET /api/cron/google-workers       Authorization: Bearer $CRON_SECRET
```

Not Vercel cron: the Hobby plan permits one run per day, which for a booking app
means a change reaching Google the following night. The routes are plain
authenticated GETs, so the driver is replaceable.

A deployment needs two secrets, and the job reads them from the `Production`
GitHub **environment** rather than from repository secrets:

| Secret | Value |
| --- | --- |
| `WORKERS_BASE_URL` | Deployment origin, no trailing slash |
| `CRON_SECRET` | The same value set on the host |

Repository-level secrets will not be seen by that job unless you also drop the
`environment:` key from it. If the two `CRON_SECRET`s ever drift, every call
answers 401 and the workflow fails loudly rather than quietly doing nothing.

> GitHub disables scheduled workflows after 60 days without a commit to the
> repository, silently. On a quiet repo that is the likeliest way delivery stops
> — check it first when a backlog appears with no errors anywhere.

Without this workflow the app still works; outbound Google delivery and the
inbound queues simply do not drain.

Operational events, redaction rules, alert thresholds, and investigation steps:
`docs/operations/premium-observability.md`.
