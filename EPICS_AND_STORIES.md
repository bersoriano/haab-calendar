# Haab Calendar - Epics & User Stories

## How to read this document

Each epic groups related work. Stories follow the format:
- **As a** [role] **I want** [goal] **so that** [benefit]
- **Acceptance Criteria** — testable conditions that must be true for the story to be complete

Priorities: **P0** (must-have for launch), **P1** (important, next iteration), **P2** (nice-to-have)

---

## Epic 1: Supabase Backend Integration

> Migrate from localStorage to Supabase so data persists server-side, supports multiple clients simultaneously, and enables future features like notifications and booking management links.

### 1.1 — Project setup and schema migration (P0)

**As a** developer **I want** Supabase configured with the database schema **so that** the app has a persistent, relational backend.

**Acceptance Criteria:**
- [ ] Supabase project is created and environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) are configured in `.env.local`
- [ ] `@supabase/supabase-js` is installed and a shared client instance is exported
- [ ] Tables `providers`, `services`, `bookings`, and `booking_holds` are created matching the schema in `BACKEND_RECOMMENDATIONS.md`
- [ ] Foreign key constraints and indexes exist on `provider_id`, `service_id`, `slug`, `date`, and `status`
- [ ] Row Level Security is enabled on all tables (policies can be permissive for now — no auth epic yet)
- [ ] A seed script or SQL file exists to populate a test provider with services and availability

### 1.2 — Provider and service data reads from Supabase (P0)

**As a** client visiting the public booking page **I want** provider info and services loaded from the database **so that** I see real, up-to-date data.

**Acceptance Criteria:**
- [ ] Public booking page (`/public/[slug]`) fetches provider + services from Supabase by slug
- [ ] Setup wizard writes provider, services, and availability to Supabase on completion
- [ ] Provider management reads from Supabase on mount instead of localStorage
- [ ] If the Supabase query fails, an error state is shown (not a blank screen)
- [ ] Loading skeleton is displayed while data is being fetched

### 1.3 — Booking writes to Supabase (P0)

**As a** client confirming a booking **I want** my booking saved to the database **so that** it persists and the provider can see it.

**Acceptance Criteria:**
- [ ] Booking confirmation inserts a row into the `bookings` table
- [ ] Booking includes `provider_id`, `service_id`, `client_name`, `client_email`, `client_phone`, `date`, `start_time`, `end_time`, `status`, and `notes`
- [ ] A unique booking ID (UUID) is generated server-side and returned to the client
- [ ] The confirmation screen displays the booking ID as a confirmation number
- [ ] Cancellation and rescheduling update the booking row's `status` field
- [ ] Optimistic UI updates the local state immediately; on failure, the UI rolls back and shows an error toast

### 1.4 — Server-side booking holds (P0)

**As a** client selecting a time slot **I want** the slot held in the database **so that** another client cannot book it while I fill in my details.

**Acceptance Criteria:**
- [ ] Selecting a time slot inserts a row into `booking_holds` with `expires_at` set to now + 10 minutes
- [ ] Availability queries exclude slots that have an active (non-expired) hold
- [ ] On booking confirmation, the corresponding hold is deleted
- [ ] On hold expiry (client-side timer runs out), the hold row is deleted
- [ ] A Supabase cron job or edge function deletes expired holds every minute
- [ ] If hold creation fails (slot already held), the UI shows "This slot was just taken" and refreshes available slots

### 1.5 — Realtime availability sync (P1)

**As a** client viewing available slots **I want** the calendar to update in real time **so that** I don't try to book a slot that was just taken.

**Acceptance Criteria:**
- [ ] A Supabase Realtime subscription listens for changes on `bookings` and `booking_holds` filtered by `provider_id`
- [ ] When a new booking or hold is created by another client, the available slots update without page refresh
- [ ] When a hold expires, the slot reappears as available
- [ ] The subscription is cleaned up on component unmount
- [ ] If the realtime connection drops, the UI falls back to polling on user interaction (e.g., re-fetch on date click)

---

## Epic 2: Component Architecture Refactor

> Break the 5000-line monolith into focused sub-components to enable parallel development and maintainability.

### 2.1 — Extract sub-components (P0)

**As a** developer **I want** the module split into logical sub-components **so that** I can work on features independently without merge conflicts in a single file.

**Acceptance Criteria:**
- [ ] The following are extracted as separate files: `SetupWizard`, `PublicBookingFlow`, `ProviderDashboard`, `CalendarGrid`, `BookingList`, `ServiceEditor`, `SettingsPanel`
- [ ] Shared UI primitives (`ActionButton`, `ActionLink`, `ToneBadge`, `SectionTitle`, `SummaryField`, `EmptyState`, `PublicProgressIndicator`) are extracted to a `components/ui/` directory
- [ ] The main `HaabBookingModule` remains as the orchestrator, managing top-level state and passing props
- [ ] All existing functionality works identically after the refactor (no visual or behavioral changes)
- [ ] Types and interfaces are extracted to a shared `types.ts` file
- [ ] Helper/utility functions (date formatting, slot calculation, iCal generation) are extracted to a `lib/` directory

---

## Epic 3: Unified Feedback System

> Implement consistent loading states, toast notifications, and error handling across the app.

### 3.1 — Toast notification system (P0)

**As a** user **I want** clear, consistent feedback for my actions **so that** I know what happened without confusion.

**Acceptance Criteria:**
- [ ] A `Toast` component renders at the bottom-right of the viewport (bottom-center on mobile)
- [ ] Toasts support four tones: `success`, `error`, `warning`, `info`
- [ ] Toasts auto-dismiss after 4 seconds (configurable)
- [ ] Multiple toasts stack vertically with newest on top
- [ ] A `useToast()` hook is available for triggering toasts from any component
- [ ] Toasts have an `aria-live="polite"` region for screen reader announcements
- [ ] Toasts include a manual dismiss button

### 3.2 — Loading states for async actions (P0)

**As a** user **I want** buttons to show a loading state when processing **so that** I know my action is being handled and don't click twice.

**Acceptance Criteria:**
- [ ] `ActionButton` accepts a `loading` boolean prop
- [ ] When `loading` is true, the button shows a spinner, its text changes to a loading label, and it is disabled
- [ ] Booking confirmation, cancellation, and rescheduling use the loading state
- [ ] Service save/delete uses the loading state
- [ ] Settings save uses the loading state

### 3.3 — Undo for destructive actions (P1)

**As a** provider **I want** an undo window after cancelling a booking **so that** I can recover from accidental cancellations.

**Acceptance Criteria:**
- [ ] After clicking "Cancel booking", a toast appears with an "Undo" button and a 5-second countdown
- [ ] If "Undo" is clicked within 5 seconds, the booking status is not changed
- [ ] If the toast expires without undo, the cancellation is committed to Supabase
- [ ] The booking list shows a "cancelling..." state on the affected row during the undo window
- [ ] Undo toast uses `aria-live="assertive"` for screen reader announcement

---

## Epic 4: Enhanced Public Booking Flow

> Improve the client-facing booking experience to reduce drop-off and increase trust.

### 4.1 — Booking hold urgency indicator (P0)

**As a** client filling in my details **I want** to clearly see how much time I have left **so that** I don't lose my selected slot.

**Acceptance Criteria:**
- [ ] A persistent countdown bar is visible at the top of steps 3 and 4
- [ ] The bar is color-coded: green (> 5 min), yellow (2–5 min), red (< 2 min)
- [ ] When under 2 minutes, a warning toast fires: "Your hold expires soon"
- [ ] When the hold expires, a modal appears: "Your slot has been released" with a "Pick a new time" button
- [ ] The countdown updates every second
- [ ] The countdown bar is announced to screen readers via `aria-live="polite"` at each color threshold change

### 4.2 — Confirmation number and receipt (P0)

**As a** client who just booked **I want** a confirmation number and a printable summary **so that** I have proof of my booking.

**Acceptance Criteria:**
- [ ] The success screen prominently displays a confirmation number (short format, e.g., `HB-A3F8`)
- [ ] The confirmation number is derived from the booking UUID (first 4 hex chars, uppercased, prefixed)
- [ ] The .ics file description includes the confirmation number
- [ ] The QR code data includes the confirmation number
- [ ] A "Print summary" button triggers `window.print()` with a print-friendly layout

### 4.3 — Self-service booking management (P1)

**As a** client **I want** to view, reschedule, or cancel my booking via a link **so that** I don't need to contact the provider.

**Acceptance Criteria:**
- [ ] Each booking generates a unique management token (UUID stored in `bookings.manage_token`)
- [ ] The confirmation screen includes a "Manage my booking" link: `/booking/[manage_token]`
- [ ] The .ics file description includes the management link
- [ ] The management page shows booking details, status, and provider info
- [ ] The client can cancel their booking from the management page (with confirmation prompt)
- [ ] The client can request a reschedule, which shows available slots and lets them pick a new time
- [ ] After cancellation or reschedule, the page updates to reflect the new status
- [ ] Invalid or expired tokens show a "Booking not found" page

### 4.4 — Configurable booking window (P1)

**As a** provider **I want** to set how far in advance clients can book **so that** I control my schedule visibility.

**Acceptance Criteria:**
- [ ] A new field "Booking window" is added to provider settings with options: 2 weeks, 1 month, 2 months, 3 months, 6 months
- [ ] The public calendar respects this setting — dates beyond the window are disabled
- [ ] The default booking window is 1 month
- [ ] The setting is stored in the `providers` table (new `booking_window_days` integer column)
- [ ] Natural language input rejects dates beyond the booking window with a clear message

### 4.5 — Timezone display (P1)

**As a** client **I want** to see the timezone next to time slots **so that** I know exactly when my appointment is.

**Acceptance Criteria:**
- [ ] The provider's timezone is stored in the `providers` table (new `timezone` text column, e.g., `America/New_York`)
- [ ] During setup, the provider's browser timezone is auto-detected and pre-filled
- [ ] Time slots display the timezone abbreviation (e.g., "2:00 PM EST")
- [ ] The booking confirmation shows the full timezone name
- [ ] If the client's timezone differs from the provider's, both times are shown: "2:00 PM EST (3:00 PM your time)"

### 4.6 — Grouped time slots (P1)

**As a** client **I want** time slots grouped by morning, afternoon, and evening **so that** I can quickly find a time that works for me.

**Acceptance Criteria:**
- [ ] Time slots are grouped into: Morning (before 12:00), Afternoon (12:00–17:00), Evening (after 17:00)
- [ ] Each group has a header label and shows the count of available slots
- [ ] Groups with no available slots are collapsed with a "No slots available" label
- [ ] Slots within each group are displayed in a 3-column grid (not a vertical list)
- [ ] On mobile, the grid collapses to 2 columns

### 4.7 — Slot scarcity indicator (P2)

**As a** client **I want** to know when availability is limited **so that** I can make a timely decision.

**Acceptance Criteria:**
- [ ] When a date has 3 or fewer available slots, a "X slots left" label appears on the calendar cell
- [ ] The label uses a muted, non-aggressive style (not red/urgent)
- [ ] Dates with no slots show "Full" on the calendar cell
- [ ] The indicator only appears on future dates within the booking window

### 4.8 — Enhanced service cards (P2)

**As a** client choosing a service **I want** to see duration, cost, and details upfront **so that** I can pick the right option.

**Acceptance Criteria:**
- [ ] Service cards in the public flow display: name, description, duration (e.g., "30 min"), and cost (e.g., "$50")
- [ ] If the service has notes, an expandable "More details" section is available
- [ ] Full-day services show "Full day" instead of a duration
- [ ] Services with no cost show "Free" or omit the cost field

### 4.9 — Natural language input discoverability (P2)

**As a** client **I want** to discover the natural language date input **so that** I can book faster.

**Acceptance Criteria:**
- [ ] The natural language input has animated placeholder text cycling through 3 examples every 3 seconds: "next Monday at 2pm", "tomorrow morning", "May 15 at 3:30"
- [ ] The input is positioned prominently above the calendar grid
- [ ] A subtle label reads "Type a date or pick from the calendar"
- [ ] The cycling animation pauses when the input is focused

---

## Epic 5: Provider Dashboard Improvements

> Give providers actionable insights and efficient booking management tools.

### 5.1 — Dashboard metrics (P0)

**As a** provider **I want** to see key stats on my dashboard **so that** I understand my booking activity at a glance.

**Acceptance Criteria:**
- [ ] The dashboard shows four metric cards: "Today's bookings", "This week", "This month", "Cancellation rate"
- [ ] Each card shows the current count/percentage
- [ ] Metrics are calculated from the `bookings` table filtered by `provider_id`
- [ ] Cards use a compact layout that fits in a single row on desktop, 2x2 grid on mobile
- [ ] Metrics update when navigating to the dashboard tab (fresh query)

### 5.2 — Share booking page prominently (P0)

**As a** provider **I want** my public booking link front and center **so that** I can easily share it with clients.

**Acceptance Criteria:**
- [ ] The dashboard shows a "Share your booking page" card above the metrics
- [ ] The card displays the full public URL with a copy button
- [ ] A QR code of the public URL is shown next to the link
- [ ] A "Preview" button opens the public page in a new tab
- [ ] After copying, a toast confirms "Link copied"

### 5.3 — Provider onboarding checklist (P1)

**As a** new provider **I want** guidance on what to do after setup **so that** I get my first booking quickly.

**Acceptance Criteria:**
- [ ] After completing setup, the dashboard shows a checklist: "Share your booking link", "Test a booking yourself", "Add more services"
- [ ] Each item has a checkbox that can be manually dismissed
- [ ] "Share your booking link" auto-completes when the copy button is used
- [ ] "Test a booking yourself" auto-completes when the provider creates a booking via the calendar tab
- [ ] The entire checklist is dismissible with a "Got it, hide this" link
- [ ] The checklist state is stored in the `providers` table (new `onboarding_complete` boolean column)

### 5.4 — Date range filter for bookings (P1)

**As a** provider **I want** to filter bookings by date range **so that** I can see my schedule for a specific period.

**Acceptance Criteria:**
- [ ] The bookings tab has a date range picker with "Start date" and "End date" fields
- [ ] Quick presets are available: "Today", "This week", "This month", "Next 7 days"
- [ ] The date range filter works in combination with the existing search, status, and type filters
- [ ] The default view shows all future bookings (no date filter applied)
- [ ] The result count updates to reflect filtered results (e.g., "Showing 12 bookings")

### 5.5 — Day and week calendar views (P1)

**As a** provider **I want** day and week calendar views **so that** I can see my detailed schedule.

**Acceptance Criteria:**
- [ ] The calendar tab has a view switcher: "Month", "Week", "Day"
- [ ] **Day view:** Vertical timeline from provider's start time to end time, with booked slots as blocks and free time as gaps. Each block shows service name, client name, and time range.
- [ ] **Week view:** 7-column timeline (Mon–Sun) with the same block layout as day view
- [ ] Clicking a booking block in day/week view opens the booking details
- [ ] Clicking a free slot in day/week view starts a new booking flow for that time
- [ ] The current day is highlighted in week view
- [ ] Navigation arrows move by day/week respectively

### 5.6 — Bulk booking cancellation (P1)

**As a** provider **I want** to cancel all bookings for a specific date **so that** I can handle sick days or closures quickly.

**Acceptance Criteria:**
- [ ] The calendar tab (month view) has a right-click or long-press context menu on dates with bookings
- [ ] The context menu includes "Cancel all bookings for [date]"
- [ ] A confirmation modal shows the count and list of affected bookings
- [ ] On confirm, all bookings for that date are updated to `status: 'cancelled'`
- [ ] A success toast shows "X bookings cancelled for [date]"
- [ ] The undo toast (from Epic 3) applies to bulk cancellations as well

### 5.7 — Improved rescheduling modal (P2)

**As a** provider **I want** quick reschedule suggestions **so that** I can move a booking without hunting for available slots.

**Acceptance Criteria:**
- [ ] The reschedule modal shows the next 5 available slots as quick-pick buttons
- [ ] Quick-pick slots are ordered by proximity to the original booking time
- [ ] Clicking a quick-pick slot fills in the new date and time
- [ ] The provider can still manually pick a different date and time via the calendar
- [ ] The modal shows the original booking details for reference

### 5.8 — Service templates in Services tab (P2)

**As a** provider adding a new service **I want** to start from a template **so that** I don't have to fill in everything from scratch.

**Acceptance Criteria:**
- [ ] The "Add service" action in the Services tab shows two options: "Blank service" and "Start from template"
- [ ] "Start from template" shows the same templates available during setup (Doctor, Padel, Advisor, Banquet Hall, Coworking)
- [ ] Selecting a template pre-fills the service form with template values
- [ ] The provider can edit all pre-filled values before saving

### 5.9 — Service ordering (P2)

**As a** provider **I want** to reorder my services **so that** the most important ones appear first for clients.

**Acceptance Criteria:**
- [ ] Services in the Services tab can be reordered via drag-and-drop or up/down arrow buttons
- [ ] The new order is persisted to the `services.sort_order` column in Supabase
- [ ] The public booking flow displays services in the saved order
- [ ] A "Featured" toggle on each service highlights it visually in the public flow

---

## Epic 6: Booking Data & History

> Track booking lifecycle events and recognize returning clients.

### 6.1 — Booking audit trail (P1)

**As a** provider **I want** to see the history of changes on a booking **so that** I can track rescheduling, cancellations, and when they happened.

**Acceptance Criteria:**
- [ ] A new `booking_events` table stores lifecycle events: `id`, `booking_id`, `event_type`, `details_json`, `created_at`
- [ ] Event types: `created`, `rescheduled`, `cancelled`
- [ ] Rescheduled events store the original date/time in `details_json`
- [ ] The booking detail view (in admin) shows a timeline of events
- [ ] Events are displayed in chronological order with timestamps

### 6.2 — Returning client recognition (P2)

**As a** returning client **I want** my details pre-filled **so that** I don't have to type them every time.

**Acceptance Criteria:**
- [ ] When a client enters their email on the booking form, a lookup checks for previous bookings with the same email
- [ ] If a match is found, name and phone are pre-filled (client can still edit)
- [ ] A subtle "Welcome back, [Name]" message is shown
- [ ] The lookup is debounced (500ms after typing stops)
- [ ] No data is exposed if the email doesn't match (no error, no indication)

### 6.3 — Enriched iCal export (P2)

**As a** client **I want** my calendar event to include the provider's contact info and a management link **so that** I have everything I need in one place.

**Acceptance Criteria:**
- [ ] The .ics file includes `LOCATION` (if provider has an address — future field)
- [ ] The .ics file includes `URL` pointing to the booking management page
- [ ] The `DESCRIPTION` includes: confirmation number, provider name, provider email, and management link
- [ ] The QR code encodes the same enriched iCal data

---

## Epic 7: Accessibility

> Meet WCAG 2.1 AA standards across the entire module.

### 7.1 — Accessible calendar grid (P0)

**As a** screen reader user **I want** to navigate the calendar with my keyboard **so that** I can select a date without a mouse.

**Acceptance Criteria:**
- [ ] The calendar is rendered as a `<table role="grid">` with `<th scope="col">` for day-of-week headers
- [ ] Each cell has an `aria-label` describing the date and availability (e.g., "Friday, May 2, 2026, 5 slots available")
- [ ] Arrow keys navigate between cells (left/right for days, up/down for weeks)
- [ ] Enter or Space selects the focused date
- [ ] Disabled dates (unavailable, past) are marked with `aria-disabled="true"`
- [ ] The focused cell has a visible focus ring (not just color change)
- [ ] Month navigation is keyboard-accessible

### 7.2 — ARIA labels for all interactive elements (P0)

**As a** screen reader user **I want** all buttons and inputs to have descriptive labels **so that** I know what each control does.

**Acceptance Criteria:**
- [ ] All icon-only buttons have `aria-label` (e.g., "Previous month", "Next month", "Close", "Delete service [name]")
- [ ] All ghost-tone action buttons have `aria-label` with context (e.g., "Cancel booking for [client name] on [date]")
- [ ] Search inputs have `aria-label="Search bookings"`
- [ ] Filter selects have associated `<label>` elements or `aria-label`
- [ ] The natural language date input has `aria-label="Type a date in natural language"`

### 7.3 — ARIA live regions (P0)

**As a** screen reader user **I want** dynamic content changes announced **so that** I know when errors appear or actions complete.

**Acceptance Criteria:**
- [ ] Form validation errors are wrapped in `role="alert"`
- [ ] Toast notifications use `aria-live="polite"` (info/success) or `aria-live="assertive"` (error/warning)
- [ ] Booking hold countdown announces at color threshold changes (5 min, 2 min, 1 min, expired)
- [ ] Search result count is announced via `aria-live="polite"` when the filter changes
- [ ] Step transitions announce the new step title

### 7.4 — Focus management on step transitions (P1)

**As a** keyboard user **I want** focus moved to the new content when I advance a step **so that** I don't lose my place.

**Acceptance Criteria:**
- [ ] When advancing a setup or booking step, focus moves to the step heading
- [ ] Step headings have `tabIndex={-1}` to receive programmatic focus
- [ ] When opening a modal (reschedule, cancel confirmation), focus moves to the modal heading
- [ ] When closing a modal, focus returns to the element that triggered it
- [ ] Tab trapping is implemented inside open modals

### 7.5 — Color contrast and non-color indicators (P1)

**As a** user with low vision or color blindness **I want** status information conveyed through text and shape, not just color **so that** I can understand the interface.

**Acceptance Criteria:**
- [ ] All text meets WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
- [ ] Booking status badges include both color and text label (already partially done — verify all cases)
- [ ] Calendar event indicators use shape differentiation (circle for appointment, bar for full-day — already partially done — verify consistency)
- [ ] Error states use an icon (e.g., warning triangle) in addition to red color
- [ ] The booking hold countdown bar includes a text label alongside the color change

### 7.6 — Form field grouping (P1)

**As a** screen reader user **I want** related form fields grouped **so that** I understand the form structure.

**Acceptance Criteria:**
- [ ] Client details (name, email, phone) are wrapped in `<fieldset>` with `<legend>Client Details</legend>`
- [ ] Weekly availability days are wrapped in `<fieldset>` with `<legend>Weekly Availability</legend>`
- [ ] Provider info (name, business, email) is wrapped in `<fieldset>` with `<legend>Provider Information</legend>`
- [ ] Service details are wrapped in `<fieldset>` with `<legend>Service Details</legend>`

---

## Epic 8: Mobile Experience

> Optimize the booking flow and provider management for touch devices.

### 8.1 — Mobile-friendly calendar (P0)

**As a** mobile user **I want** calendar cells large enough to tap accurately **so that** I can select a date without frustration.

**Acceptance Criteria:**
- [ ] On screens < 640px, calendar cells have a minimum tap target of 44x44px
- [ ] Day-of-week headers are abbreviated to single letters (M, T, W, T, F, S, S) on small screens
- [ ] The calendar grid allows horizontal scrolling if cells would be smaller than 44px
- [ ] Month navigation arrows have a minimum tap target of 44x44px

### 8.2 — Swipe gestures for calendar navigation (P1)

**As a** mobile user **I want** to swipe left/right to change months **so that** navigation feels natural.

**Acceptance Criteria:**
- [ ] Swiping left on the calendar advances to the next month
- [ ] Swiping right goes to the previous month
- [ ] Swipe detection requires a minimum horizontal distance of 50px and is faster than vertical movement
- [ ] Arrow buttons remain functional as fallback
- [ ] Swipe animation provides visual feedback (subtle slide transition)

### 8.3 — Bottom sheet for booking details (P1)

**As a** mobile user **I want** booking details in a bottom sheet **so that** the content doesn't awkwardly overlay the page.

**Acceptance Criteria:**
- [ ] On screens < 1024px, the booking details side panel renders as a bottom sheet
- [ ] The bottom sheet slides up from the bottom with a drag handle
- [ ] The sheet can be dismissed by swiping down or tapping a close button
- [ ] The success screen after booking renders as a full-screen overlay on mobile
- [ ] The bottom sheet has a backdrop that dims the content behind it

### 8.4 — Form state persistence (P1)

**As a** mobile user **I want** my form progress saved if I leave the page **so that** I don't lose my input.

**Acceptance Criteria:**
- [ ] Client details (name, email, phone, notes) are saved to `sessionStorage` on every input change
- [ ] When returning to the booking flow, saved details are restored
- [ ] A subtle "We saved your progress" message appears when details are restored
- [ ] The saved state is cleared on successful booking confirmation
- [ ] The saved state is scoped to the provider slug (different providers don't share state)

### 8.5 — Touch-friendly time slots (P1)

**As a** mobile user **I want** time slot buttons large enough to tap **so that** I can select a time without mis-tapping.

**Acceptance Criteria:**
- [ ] All time slot buttons have a minimum height of 44px
- [ ] Spacing between slot buttons is at least 8px
- [ ] On mobile, slots display in a 2-column grid (not 3) to maintain adequate size
- [ ] The selected slot has a clear visual state (not just a subtle border change)

---

## Epic 9: Notification System

> Enable providers to be notified of new bookings and changes.

### 9.1 — New booking callback hook (P1)

**As a** developer integrating the module **I want** a callback when a new booking is created **so that** I can trigger notifications in my app.

**Acceptance Criteria:**
- [ ] A new `onNewBooking(booking: BookingRecord)` callback prop is added to `HaabBookingModule`
- [ ] The callback fires after a booking is successfully persisted to Supabase
- [ ] The callback includes the full booking record with client details and service info
- [ ] The callback also fires for reschedules and cancellations with the updated record

### 9.2 — Browser notifications for standalone mode (P2)

**As a** provider using standalone mode **I want** browser notifications for new bookings **so that** I don't have to keep the tab open.

**Acceptance Criteria:**
- [ ] When a new booking is detected via Realtime subscription, a browser notification is triggered
- [ ] The provider is prompted for notification permission on the dashboard
- [ ] The notification shows: "[Client name] booked [Service] on [Date]"
- [ ] Clicking the notification focuses the Haab Calendar tab
- [ ] A "New bookings" badge appears on the Dashboard tab when unread bookings exist
- [ ] The badge count resets when the provider opens the Dashboard tab

---

## Summary

| Epic | Stories | P0 | P1 | P2 |
|------|---------|----|----|-----|
| 1. Supabase Backend | 5 | 4 | 1 | 0 |
| 2. Component Refactor | 1 | 1 | 0 | 0 |
| 3. Feedback System | 3 | 2 | 1 | 0 |
| 4. Public Booking Flow | 9 | 2 | 4 | 3 |
| 5. Provider Dashboard | 9 | 2 | 4 | 3 |
| 6. Booking Data & History | 3 | 0 | 1 | 2 |
| 7. Accessibility | 6 | 3 | 3 | 0 |
| 8. Mobile Experience | 5 | 1 | 4 | 0 |
| 9. Notification System | 2 | 0 | 1 | 1 |
| **Total** | **43** | **15** | **19** | **9** |

## Suggested Implementation Order

**Phase 1 — Foundation (P0):**
Epics 1 (Supabase) → 2 (Refactor) → 3.1–3.2 (Toast + Loading) → 7.1–7.3 (Core Accessibility)

**Phase 2 — Core UX (P1):**
Epics 4.1–4.6 (Booking Flow) → 5.1–5.6 (Dashboard) → 8 (Mobile) → 7.4–7.6 (A11y)

**Phase 3 — Polish (P2):**
Remaining stories from Epics 4, 5, 6, 9
