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

See [`docs/booking-process.md`](docs/booking-process.md) for the current end-to-end lifecycle: availability, holds, offline/reconnect behavior, confirmation, ICS/QR output, manage links, rescheduling, cancellation, security boundaries, and verification.

## Routes

- `/`
  Provider workspace plus the requested screen-by-screen and flow overview.
- `/[vertical]/[providerSlug]`
  Public provider profile booking page. Supported vertical segments are
  `doctors`, `professionals`, `spaces`, and `events`.
- `/[vertical]/[providerSlug]/[serviceSlug]`
  Public service-specific booking page.
- `/[vertical]/[providerSlug]/manage/[token]`
  Self-service page to view, reschedule, or cancel an existing booking via its manage token.
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

The two race entries are dated relative to the seed run, so re-seeding always
leaves them in the future. Every example is fictional, including the phone
numbers and addresses.

`lib/demo-pages.ts` is the allowlist these pages are resolved from; the seed
script must stay in sync with it (`lib/__tests__/demo-pages.test.ts` enforces
this).

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

```bash
npm install
npm run dev
```
