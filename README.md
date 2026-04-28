# Haab Calendar

Reusable appointment and booking management module built with Next.js `16.2.4`.

## Screen Overview

1. Setup Wizard
   Standalone-first onboarding for provider info, services, weekly availability, and launch.
2. Provider Workspace
   Top navigation for `Dashboard`, `Bookings`, `Calendar`, `Services`, and `Settings`.
3. Public Booking Flow
   Step-by-step client wizard for service selection, date and time, client details, review, success, and iCal export.
4. Public Route
   Dedicated `/public/[slug]` page for the generated booking URL.

## Core Behaviors

- Supports both timed appointments and full-day bookings in the same module.
- Uses one self-contained exported component: `HaabBookingModule`.
- Runs in standalone mode by default with internal state and local persistence.
- Switches into integrated mode when provider, services, and availability are injected.
- Keeps services and settings visible but read-only when configured by a parent app.
- Lets provider and client reschedule or cancel bookings with instant updates.

## Routes

- `/`
  Provider workspace plus the requested screen-by-screen and flow overview.
- `/public/[slug]`
  Public booking page for the current standalone setup.

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
          publicSlug: "haab-health-studio",
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
