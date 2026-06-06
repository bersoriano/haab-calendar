# Haab Calendar Strategic Product Roadmap

Last updated: 2026-05-30

## Purpose

This document captures the next strategic features and product improvements for Haab Calendar based on the current app audit, existing roadmap docs, and a real browser walkthrough of the setup, public booking, confirmation, manage-booking, provider dashboard, bookings list, and calendar views.

The goal is not to list every possible enhancement. The goal is to identify the product moves that most increase trust, conversion, operational usefulness, and production readiness.

## Product Direction

Haab Calendar should become a lightweight booking operating system for service providers who need fast setup, clean public booking, and practical day-to-day appointment control.

The product should not compete only as a generic scheduling widget. Its stronger path is to feel more business-ready than a form builder, simpler than a full practice-management system, and easier to embed than a heavy marketplace platform.

The best next features should support four principles:

1. Make every booking reliable.
2. Make the public booking flow feel effortless on mobile.
3. Give providers enough operational control to run a real day.
4. Build trust through confirmations, accessibility, and recoverable actions.

## Current Strengths

The current app already has a strong local-product foundation:

- Setup wizard with business profile, service templates, and weekly availability.
- Public booking page with service selection, date/time selection, customer details, and confirmation.
- Ten-minute booking hold behavior.
- QR code, calendar download, manage link, reschedule, and cancel actions.
- Provider dashboard, bookings list, calendar, services, and settings views.
- Local persistence through browser storage.
- A useful automated test suite covering core booking logic and reducers.
- Mobile public booking flow that is visually usable and easy to scan.

These are meaningful strengths. The next phase should preserve this momentum while moving from demo-ready to production-ready.

## Strategic Priority 1: Production Backend, Auth, And Data Model

### Why It Matters

The app currently behaves like a strong local prototype. The biggest strategic gap is that the booking system does not yet have a production data foundation. Without a backend, Haab cannot safely support real public bookings across devices, authenticated providers, shared business accounts, or reliable booking conflict prevention.

### What To Add

- Provider account authentication.
- Business/workspace ownership model.
- Supabase-backed providers, services, availability rules, bookings, holds, customers, and audit events.
- Server-authoritative booking creation, hold creation, hold expiration, token hashing, and conflict checks.
- Public slug lookup from backend data.
- Row-level security policies for provider-owned data.
- Data migration path from existing localStorage demo state.

### Product Requirements

- A provider can sign up, create a business profile, and return later from a different browser.
- A public booking page must load from a real backend slug, not local demo state.
- Bookings must be created on the server with conflict protection and should not appear confirmed until the server transaction succeeds.
- Two customers cannot successfully book the same slot at the same time.
- Provider dashboard and public pages must reflect the same source of truth.

### Success Metrics

- Zero double-booked appointments in normal usage.
- Successful booking creation rate above 99 percent.
- Provider can resume setup or manage bookings across devices.
- Public booking URLs remain stable after browser refresh or device change.

### Suggested Priority

P0. This is the foundation for nearly every other production feature.

## Strategic Priority 2: Reliable Booking Holds And Conflict Protection

### Why It Matters

The booking hold concept is already present and valuable. The next step is making it authoritative. Holds should be enforced by the backend, visible to the customer, and resilient across refreshes and concurrent sessions.

### What To Add

- Server-side hold records with expiration timestamps.
- Hold renewal or release behavior when the customer changes selections.
- Expired-hold state on the public booking form.
- Real conflict validation immediately before confirmation.
- Clear customer messaging when a selected time is no longer available.
- Provider-visible hold state only where operationally useful.

### Product Requirements

- Selecting a time should reserve it temporarily.
- Expired holds should not silently fail at final submission.
- If the slot disappears, the customer should be guided back to the next best available options.
- The hold timer should feel calm but visible.

### Success Metrics

- Fewer abandoned bookings after slot selection.
- No confirmed double bookings.
- Low rate of "slot no longer available" failures at confirmation.

### Suggested Priority

P0. This should be built alongside the backend.

## Strategic Priority 3: Confirmation, Reminder, And Notification Layer

### Why It Matters

The current success screen is useful, especially with QR, manage link, and calendar download. But real customers expect confirmation outside the browser. Providers also need timely alerts. Without notifications, the product feels less trustworthy and requires providers to manually monitor the dashboard.

### What To Add

- Customer confirmation email.
- Provider new-booking email.
- Optional SMS or WhatsApp confirmation later.
- Reminder schedule, such as 24 hours before and 2 hours before.
- Reschedule and cancellation notifications.
- Confirmation number or short booking reference.
- Email-safe manage-booking link.

### Product Requirements

- Customers receive a confirmation that includes service, date, time, location or meeting info, provider name, manage link, and calendar attachment/link.
- Providers receive a concise booking alert with customer contact details and booking notes.
- Reschedule and cancellation messages should be sent to both sides.
- Notification delivery status should be recorded for support and debugging.

### Success Metrics

- Reduced no-show rate.
- Reduced customer support questions about booking status.
- Higher customer trust after booking.
- Provider sees new bookings without needing to refresh the app.

### Suggested Priority

P0 for email confirmations and provider alerts. P1 for reminders. P2 for SMS/WhatsApp.

## Strategic Priority 4: Provider Dashboard As An Operations Center

### Why It Matters

The dashboard currently gives a helpful starting summary, but it does not yet feel like the daily command center for a business. The provider should be able to answer: What is happening today? What needs attention? Where am I losing bookings? What should I do next?

### What To Add

- Today, tomorrow, and this-week schedule summaries.
- Upcoming appointment timeline.
- New, confirmed, cancelled, and rescheduled booking counts.
- Booking conversion metrics once public analytics exist.
- No-show and cancellation trends when attendance tracking exists.
- Revenue estimate when services have prices.
- Alerts for gaps, overbooked days, unconfigured services, or missing availability.
- Quick actions: copy booking link, add service, block time, create manual booking.

### Product Requirements

- Dashboard should prioritize the next operational action, not just totals.
- Metrics should be date-range aware.
- The provider should not need to visit three tabs to understand their day.
- Empty states should guide setup completion and first booking creation.

### Success Metrics

- Higher provider return rate.
- More providers copy/share public booking URL.
- More providers add or refine services after setup.
- Shorter time from login to understanding today's schedule.

### Suggested Priority

P1. Start after backend and notifications, but design the data model now.

## Strategic Priority 5: Public Booking Conversion Improvements

### Why It Matters

The public booking flow is already functional. Strategic improvements should focus on confidence, speed, and clarity, especially on mobile. The customer should quickly know what they are booking, when it is available, what it costs, and what happens after confirmation.

### What To Add

- Timezone display and timezone-aware scheduling.
- Configurable booking window, such as next 30, 60, or 90 days.
- Grouped time slots by morning, afternoon, evening.
- Scarcity indicators, such as "2 left" or "Few times left today".
- Richer service details, including description, location, duration, price, requirements, and cancellation policy.
- Better unavailable-state messaging when dates have no slots.
- Optional natural-language entry point, such as "I need a consult next Tuesday afternoon".
- Trust cues near confirmation: cancellation policy, reminder note, secure confirmation copy.

### Product Requirements

- Customers should not need to guess which timezone a slot uses.
- Slot lists should be easy to scan on mobile.
- Empty states should suggest the next available date.
- Service cards should help customers choose, not merely list options.

### Success Metrics

- Higher service-selection to booking-confirmation conversion.
- Lower abandonment on date/time step.
- Lower customer confusion about time and policy.
- More bookings completed on mobile.

### Suggested Priority

P1. Timezone and booking window should come before richer discovery features.

## Strategic Priority 6: Stronger Booking Management

### Why It Matters

Customers can already manage a booking through a tokenized link, which is a major usability win. The next step is to make booking management safer, more policy-aware, and more supportive of provider operations.

### What To Add

- Provider-configurable reschedule and cancellation windows.
- Cancellation reasons.
- Undo or grace period for cancellations in the provider app.
- Booking status history.
- Audit trail for customer and provider changes.
- Customer-facing policy display before cancellation or reschedule.
- Manual provider booking creation.
- Provider-side edit of customer details and internal notes.

### Product Requirements

- Cancellation should not feel accidental or irreversible.
- Reschedule options should respect business rules and availability.
- Providers should know who changed what and when.
- Internal notes should not appear on the public manage page.

### Success Metrics

- Lower accidental cancellation rate.
- Fewer support questions around rescheduling.
- Higher provider confidence in letting customers self-manage.

### Suggested Priority

P1. Policy controls should be early. Audit history can follow soon after.

## Strategic Priority 7: Calendar View Upgrades

### Why It Matters

The calendar is central to provider trust. The current month view is useful, but day and week views are needed for actual daily operations, especially for businesses with multiple appointments per day.

### What To Add

- Day view with appointment blocks.
- Week view with time grid.
- Month view density improvements.
- Service filtering.
- Status filtering.
- Click appointment to open details.
- Blocked time and unavailable periods.
- Manual booking from a selected calendar time.
- Export or sync path to Google Calendar later.

### Product Requirements

- Providers should be able to run their day from the calendar.
- Dense days must remain legible.
- Calendar interactions should be keyboard accessible.
- Filters should not make the provider lose context.

### Success Metrics

- More provider sessions begin on the calendar view.
- More manual changes performed from calendar interactions.
- Fewer booking-management actions require returning to the bookings list.

### Suggested Priority

P1. Week/day views become much more valuable after backend persistence.

## Strategic Priority 8: Share And Distribution Tools

### Why It Matters

A booking app only creates value when providers share the booking link. The app already has a public URL, but distribution should become an intentional product surface.

### What To Add

- Provider share center.
- QR code for the public booking page.
- Downloadable QR image.
- Copy link with toast confirmation.
- Preview public page action.
- Social share snippets.
- Embed widget snippet for websites.
- Business profile completeness checklist.
- Optional branded landing card for print or Instagram bio use.

### Product Requirements

- Providers should know exactly where and how to share their booking page.
- Copy and QR actions should provide visible feedback.
- Public-page preview should open quickly from settings or dashboard.
- Embed code should be safe, simple, and documented.

### Success Metrics

- More providers copy or download their booking link/QR.
- More public booking page visits.
- More bookings per activated provider.

### Suggested Priority

P1. Lightweight share tools can ship before deeper analytics.

## Strategic Priority 9: Accessibility And Inclusive UX

### Why It Matters

Booking is a high-intent flow. Accessibility issues directly block revenue and trust. Calendar widgets, slot grids, forms, timers, and success states need stronger keyboard and screen-reader behavior before production launch.

### What To Add

- Keyboard navigable calendar grid.
- ARIA labels for dates, unavailable days, selected dates, and slot buttons.
- Live regions for hold expiration, confirmation success, and errors.
- Fieldsets and legends for grouped form controls.
- Clear focus states across public and provider surfaces.
- Reduced-motion considerations.
- Error summaries for customer details form.
- Automated accessibility checks in tests where practical.

### Product Requirements

- A customer should be able to complete the public booking flow using only the keyboard.
- Screen-reader users should understand selected service, date, time, and confirmation state.
- Errors should be announced clearly and visually connected to fields.

### Success Metrics

- Keyboard-only booking completion works end to end.
- Fewer accessibility violations in automated scans.
- Better form completion rate on mobile and assistive technologies.

### Suggested Priority

P0 for public booking blockers. P1 for provider admin refinements.

## Strategic Priority 10: Feedback, Loading, And Recovery States

### Why It Matters

The app needs clear feedback for actions like copying a link, saving settings, confirming a booking, cancelling, and rescheduling. Without feedback, users repeat actions or lose confidence.

### What To Add

- Toast system.
- Button-level loading states.
- Save-success and save-error states.
- Undo affordance for reversible provider actions.
- Friendly network-error messages once backend exists.
- Retry flows for booking creation failures.
- Optimistic UI only where recovery is clear.

### Product Requirements

- Every meaningful action should provide visible feedback.
- Destructive actions should require confirmation and, where possible, support undo.
- Failed booking creation should preserve entered customer details.

### Success Metrics

- Lower repeated-click behavior.
- Lower support issues around "did it save?".
- Higher completion after transient errors.

### Suggested Priority

P0 for booking confirmation and error states. P1 for admin-wide polish.

## Strategic Priority 11: Service And Availability Management

### Why It Matters

Provider setup is not a one-time activity. Providers need to adjust services, pricing, capacity, and schedules as their business changes. The service model should become powerful without becoming heavy.

### What To Add

- Service ordering on public page.
- Service categories.
- Service-specific availability.
- Service-specific cancellation and booking windows.
- Buffer time before and after services.
- Capacity controls for group sessions.
- Optional location per service.
- Draft/inactive service state.
- Duplicate service action.

### Product Requirements

- Providers should be able to tailor availability by service.
- Public page should only show active, bookable services.
- Buffer and capacity rules should be enforced during slot generation.
- Editing a service should not break existing bookings.

### Success Metrics

- More providers create multiple services.
- Fewer providers abandon setup due to schedule complexity.
- Reduced manual workarounds for buffers and service-specific hours.

### Suggested Priority

P1. Some items depend on the backend availability engine.

## Strategic Priority 12: Analytics And Product Intelligence

### Why It Matters

Once bookings are real, providers will want to know whether the booking page is working. Product analytics also help Haab identify where users drop off and which features increase activation.

### What To Add

- Public page views.
- Service selection rate.
- Date/time step abandonment.
- Booking completion rate.
- Cancellation and reschedule rates.
- Top services.
- Popular booking times.
- Provider activation funnel.
- Lightweight event tracking with privacy-conscious defaults.

### Product Requirements

- Analytics should be useful without overwhelming the provider.
- Metrics should explain behavior and suggest action.
- Customer privacy should be protected.

### Success Metrics

- Providers can identify their most booked services and strongest time slots.
- Product team can see onboarding and booking funnel drop-off.
- Dashboard insights lead to provider actions.

### Suggested Priority

P2. Build after production booking data exists.

## Recommended Build Sequence

### Phase 1: Production Trust

Focus: make the app safe for real bookings.

- Backend data model.
- Provider auth.
- Server-side booking creation.
- Server-side holds and conflict protection.
- Public slug backed by database.
- Email confirmation and provider alert.
- Public booking accessibility blockers.
- Core feedback and loading states.

### Phase 2: Provider Operations

Focus: help providers run their day.

- Better dashboard metrics.
- Date-range-aware bookings list.
- Day and week calendar views.
- Manual booking creation.
- Booking audit trail.
- Provider cancellation and reschedule policies.
- Share center with public QR and preview.

### Phase 3: Booking Conversion

Focus: improve customer completion and provider growth.

- Timezone display.
- Configurable booking window.
- Grouped slots.
- Service detail expansion.
- Scarcity indicators.
- Reminder notifications.
- Public page analytics.
- Embed widget.

### Phase 4: Business Intelligence And Scale

Focus: make Haab smarter and more scalable.

- Provider insights.
- Conversion funnel reporting.
- Service performance trends.
- Google Calendar sync.
- SMS or WhatsApp reminders.
- Multi-user business roles.
- Advanced service-specific scheduling rules.

## Highest-Leverage Next 90 Days

If the team can only choose a few strategic bets, prioritize these:

1. Supabase backend with provider auth and server-side booking creation.
2. Server-enforced booking holds, hashed manage tokens, audit events, and conflict protection.
3. Email confirmation for customers and provider alerts.
4. Timezone-aware public booking flow.
5. Dashboard and bookings list improvements for real daily operations.
6. Public booking accessibility and feedback-state pass.

This sequence moves the product from impressive local booking demo to credible production booking tool.

## Product Quality Checklist

Before calling the next version production-ready, the app should pass this checklist:

- A provider can create an account and manage the same business from multiple devices.
- A customer can book from a public URL without relying on provider localStorage.
- Duplicate bookings for the same slot are prevented on the server.
- Customer and provider both receive confirmation messages.
- Customer can reschedule or cancel using a stable manage link.
- Provider can see today's appointments quickly.
- Provider can filter bookings by date, status, and service.
- Provider can view schedule by day and week.
- Public booking flow works with keyboard navigation.
- Important actions provide success, loading, error, and recovery states.
- The product has a clear path for backup, monitoring, and support debugging.

## Suggested Product Metrics

Track these once backend analytics exist:

- Provider setup completion rate.
- Time to first public booking link copied.
- Time to first customer booking.
- Public page visit to booking conversion rate.
- Service selection to slot selection conversion rate.
- Slot selection to confirmed booking conversion rate.
- Booking cancellation rate.
- Reschedule rate.
- No-show rate if attendance tracking is added.
- Provider weekly active usage.
- Bookings per active provider.

## Strategic Non-Goals For The Next Phase

These may be useful later, but they should not distract from production reliability and core booking operations:

- Full marketplace discovery.
- Complex CRM features.
- Payroll, invoicing, or accounting.
- Deep AI scheduling automation before reliable booking data exists.
- Multi-location enterprise workflows before single-business workflows are strong.
- Heavy customization that weakens the simplicity of setup.

## Summary

Haab Calendar already has a convincing booking experience. The most important next move is to make it real: persistent, authenticated, server-backed, conflict-safe, and confirmed through external notifications.

Once that foundation is in place, the product should invest in provider operations, mobile booking conversion, sharing tools, accessibility, and analytics. Those improvements will make Haab feel less like a demo calendar and more like a dependable booking system that a small business can run on every day.
