# Booking Retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce one-month booking history with an optional, default-off Premium year and clear user notices.

**Architecture:** Extend the existing entitlement catalog and provider save flow. Database authorization and bounded deletion live in one migration; a daily authenticated worker invokes cleanup. Presentational components show the effective saved policy.

**Tech Stack:** Next.js 16.2.7, React 19, Supabase JS, PostgreSQL, Vitest, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-09-booking-retention-design.md`

## Global Constraints

- One calendar month normally; one calendar year only with preference and entitlement.
- Preference defaults false. Age uses scheduled date in provider timezone, not creation date.
- Keep seven-day Archive. Do not change authentication sessions, services or external Google events.
- No live database cleanup during implementation. Tests target local database only.
- Owner-visible English and Spanish notices. Billing and manual overrides use existing precedence.

## Review Focus

- An unreadable entitlement must abort deletion, never silently shorten history.
- Month ends, leap days and timezone midnight must preserve exact-boundary bookings.
- Direct authenticated writes must not bypass the Premium gate.
- A pending edit must not advertise an unsaved extended retention policy.
- Cleanup must delete dependents safely and leave future bookings intact.

### Task 1: Retention schema, entitlement and persistence

**Files:** `lib/entitlements/catalog.ts`, `lib/types.ts`, `lib/store.ts`, `lib/supabase/bookings.ts`, `lib/supabase/provider-store.ts`, a CLI-created migration, and `test/db/booking-retention.test.ts`.

**Interfaces:** Provider preference `keepBookingHistoryOneYear?: boolean`; persisted column `keep_booking_history_one_year boolean not null default false`; catalog key `booking_history_retention`; RPC `purge_expired_bookings(p_now timestamptz default now(), p_batch_size integer default 500)` returns `{deletedBookings: number, hasMore: boolean}`.

- [ ] Write failing unit tests for Premium access, default-off normalization, and preference persistence. Write local SQL integration tests with literal dates for the review focus.
  ```ts
  expect(resolveEntitlements({providerId: "p", planTier: "premium", overrides: []}).features.booking_history_retention.enabled).toBe(true);
  expect(normalizeProvider({keepBookingHistoryOneYear: "true" as never}).keepBookingHistoryOneYear).toBe(false);
  ```
- [ ] Run `npm test -- lib/entitlements lib/__tests__/provider-store.test.ts` and local database tests. Expected: new cases fail before implementation.
- [ ] Implement the boolean round trip, private SQL entitlement helper, enabling trigger, and service-role-only bounded cleanup. Use `date < (provider_today - interval '1 month')::date`, or `interval '1 year'` when enabled and entitled; protect provider policy with row locks.
- [ ] Run focused unit and local database tests. Expected: exact dates survive, older rows and cascaded dependents disappear, unauthorized writes fail, repeated batches finish.
- [ ] Commit schema and policy as one atomic change.

### Task 2: Scheduled cleanup

**Files:** `lib/booking-retention/worker.ts`, `app/api/cron/booking-retention/route.ts`, focused worker/route tests, `.github/workflows/booking-retention.yml`.

**Interfaces:** `runBookingRetentionWorker(client?: SupabaseClient)` returns the RPC counters or throws on database failure. `GET /api/cron/booking-retention` requires `Authorization: Bearer CRON_SECRET` and returns counters only.

- [ ] Write failing tests for absent/wrong secrets, success, RPC errors and malformed responses.
  ```ts
  expect((await GET(new Request("http://localhost/api/cron/booking-retention"))).status).toBe(401);
  ```
- [ ] Run focused tests. Expected: missing modules/behavior fail.
- [ ] Implement the worker and authenticated route. Add daily Production workflow using `WORKERS_BASE_URL` and `CRON_SECRET`; drain up to 20 batches, fail on HTTP/error/backlog, never log secrets or booking identifiers.
- [ ] Run focused tests. Expected: unauthorized calls never reach cleanup, RPC failures return 500, successful response preserves counters.
- [ ] Commit worker and scheduler.

### Task 3: Settings, notices and documentation

**Files:** new `components/provider/BookingRetentionSettings.tsx`, `ProviderSettingsSurface.tsx`, `BookingsList.tsx`, `haab-booking-module.tsx`, `dashboard-copy.ts`, `lib/booking-retention.ts`, surface tests, privacy and booking/operations/Premium docs.

**Interfaces:** `isExtendedBookingRetentionEnabled(preference, entitlements)` returns effective saved one-year access; use existing `onProviderChange` callback and save bar.

- [ ] Write failing component tests for free/Premium/unknown access, default-off, enabled effective policy, downgrade and both languages. Test saved policy notices independently of draft preference.
  ```ts
  expect(isExtendedBookingRetentionEnabled(true, undefined)).toBe(false);
  ```
- [ ] Run focused tests. Expected: new controls/notices missing.
- [ ] Implement accessible checkbox, current-policy notices and Settings link. Explain permanent deletion, default-off and downgrade behavior. Update privacy and operational docs, including deployment steps and rollback limits.
- [ ] Run typecheck, lint, full unit suite, local SQL tests and production build; check mobile UI and toggle/save behavior. Expected: all checks pass, no overflow, only saved entitled preference shows active year.
- [ ] Commit UI and docs. Request whole-branch review and repair material findings before final report.
