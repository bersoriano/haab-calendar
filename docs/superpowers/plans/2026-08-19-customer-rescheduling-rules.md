# Customer Rescheduling Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let providers leave customer rescheduling unrestricted, disable it, or set one provider-wide hour/day cutoff while keeping cancellation unchanged and forbidding every actor from moving started, full-day, or single-occurrence bookings.

**Architecture:** Add canonical provider policy fields and one client-safe pure evaluator. Thread policy through existing provider/store/public DTO boundaries, then enforce it in `rescheduleBookingRow` before availability or writes; UI consumes machine-readable eligibility but never authorizes mutations. Keep admin settings presentational and persist through existing provider store flow.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript, Vitest, Supabase JS, Supabase CLI, PostgreSQL 17

**Spec:** `docs/superpowers/specs/2026-08-19-customer-rescheduling-rules-design.md`

## Global Constraints

- Read spec before each task; spec controls when plan shorthand differs.
- Before code changes, read bundled Next.js guides `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` and `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`.
- Before schema work, fetch `https://supabase.com/changelog.md`, scan relevant breaking changes, read current official table/view/RLS guidance, and run `npx supabase --help` plus relevant subcommand help. Current review found no rescheduling-specific breaking change; public views still need `security_invoker = true` and explicit grants.
- Default policy: `customerReschedulingEnabled: true`, `customerRescheduleCutoffMinutes: undefined`; missing legacy data must normalize to this state.
- Cutoff storage is positive whole-hour minutes. `undefined`/SQL `NULL` means unrestricted until start. Exact boundary blocks: `now >= cutoffAt`.
- Provider timezone owns booking start conversion. Cutoffs are elapsed hours, not business hours or calendar-day arithmetic.
- Customer enabled/cutoff rules never affect cancellation. Provider and Google actors bypass those customer-only rules.
- Every actor is blocked after booking start and for full-day or single-occurrence bookings.
- `rescheduleBookingRow` stays authoritative. Rejection happens before availability, Google checks, booking update, `booking_events`, or integration outbox work.
- Do not add per-service overrides, cancellation rules, fees, approval flows, notifications, live countdowns, or subscriptions.
- Preserve `public.public_providers` as `security_invoker = true`; retain existing RLS. No new table, function, trigger, or `security definer` code.
- Baseline HEAD includes approved QR-scanner work in commit `0ada744`. Preserve it. Inspect `git diff` before each edit and use targeted staging so rescheduling commits never revert or rewrite that feature accidentally.
- Never stage unrelated dirty files. Before each commit run `git diff --cached --check` and `git diff --cached --stat`.

---

### Task 1: Pure rescheduling policy and canonical types

**Files:**
- Create: `lib/rescheduling-policy.ts`
- Create: `lib/__tests__/rescheduling-policy.test.ts`
- Modify: `lib/types.ts`
- Modify: `lib/supabase/bookings.ts` only to import/re-export moved `BookingActorType`

**Interfaces:**
- Consumes: `zonedWallTimeToUtc(dateKey: string, time: string, zone: string): Date | null` from `lib/timezone.ts`
- Produces: `BookingActorType`, `CustomerRescheduleBlockReason`, `CustomerRescheduleEligibility`, `ReschedulingProviderPolicy`, `RescheduleCutoffUnit`, `evaluateRescheduleEligibility`, `normalizeCustomerRescheduleCutoffMinutes`, `toCustomerRescheduleCutoffMinutes`, and `fromCustomerRescheduleCutoffMinutes`

- [ ] **Step 1: Add domain types to `lib/types.ts` and keep old import path compatible**

```ts
export type BookingActorType =
  | "provider"
  | "customer"
  | "system"
  | "google_calendar";

export type CustomerRescheduleBlockReason =
  | "disabled"
  | "cutoff_reached"
  | "already_started"
  | "full_day"
  | "single_occurrence";

export type CustomerRescheduleEligibility =
  | { allowed: true; cutoffAt?: string }
  | {
      allowed: false;
      reason: CustomerRescheduleBlockReason;
      cutoffAt?: string;
    };

export type ReschedulingProviderPolicy = {
  timezone: string;
  customerReschedulingEnabled: boolean;
  customerRescheduleCutoffMinutes?: number;
};
```

Remove local `BookingActorType` declaration from `lib/supabase/bookings.ts`, import it from `@/lib/types`, and add this compatibility export because callers may still import it from bookings:

```ts
export type { BookingActorType } from "@/lib/types";
```

- [ ] **Step 2: Write failing policy tests**

Create table-driven tests covering unrestricted default, disabled customers, allowed-before/exactly-at/after cutoff, provider and Google bypass, started booking for `customer`/`provider`/`google_calendar`, full-day and single-occurrence for all three actors, invalid/missing start, hour/day conversion, invalid normalization, Mexico City timezone, and New York DST change.

Core fixtures and boundary assertions:

```ts
const base = {
  booking: {
    bookingType: "appointment" as const,
    dateKey: "2026-08-20",
    startTime: "10:00",
  },
  occurrenceMode: "periodic" as const,
  provider: {
    timezone: "America/Mexico_City",
    customerReschedulingEnabled: true,
    customerRescheduleCutoffMinutes: 24 * 60,
  },
  actorType: "customer" as const,
};

expect(
  evaluateRescheduleEligibility({
    ...base,
    now: new Date("2026-08-19T15:59:59.999Z"),
  }),
).toEqual({
  allowed: true,
  cutoffAt: "2026-08-19T16:00:00.000Z",
});

expect(
  evaluateRescheduleEligibility({
    ...base,
    now: new Date("2026-08-19T16:00:00.000Z"),
  }),
).toEqual({
  allowed: false,
  reason: "cutoff_reached",
  cutoffAt: "2026-08-19T16:00:00.000Z",
});
```

DST assertion: `2026-03-08 09:00 America/New_York` resolves to `2026-03-08T13:00:00.000Z`; a 24-hour cutoff is `2026-03-07T13:00:00.000Z`, proving elapsed-hour subtraction crosses offset change without calendar-day reinterpretation.

- [ ] **Step 3: Run policy tests and verify red state**

Run: `npm test -- lib/__tests__/rescheduling-policy.test.ts`

Expected: FAIL because policy module and provider policy properties do not exist.

- [ ] **Step 4: Implement validation and editor conversions**

```ts
export type RescheduleCutoffUnit = "hours" | "days";

export function normalizeCustomerRescheduleCutoffMinutes(
  value: unknown,
): number | undefined {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value % 60 === 0
    ? value
    : undefined;
}

export function toCustomerRescheduleCutoffMinutes(
  value: number,
  unit: RescheduleCutoffUnit,
): number | undefined {
  if (!Number.isInteger(value) || value <= 0) return undefined;
  return value * (unit === "days" ? 1_440 : 60);
}

export function fromCustomerRescheduleCutoffMinutes(minutes: number): {
  value: number;
  unit: RescheduleCutoffUnit;
} {
  const normalized = normalizeCustomerRescheduleCutoffMinutes(minutes);
  if (!normalized) return { value: 1, unit: "hours" };
  return normalized % 1_440 === 0
    ? { value: normalized / 1_440, unit: "days" }
    : { value: normalized / 60, unit: "hours" };
}
```

- [ ] **Step 5: Implement evaluator in required order**

```ts
export function evaluateRescheduleEligibility(input: {
  booking: Pick<BookingRecord, "bookingType" | "dateKey" | "startTime">;
  occurrenceMode?: OccurrenceMode;
  provider: ReschedulingProviderPolicy;
  actorType: BookingActorType;
  now?: Date;
}): CustomerRescheduleEligibility {
  if (input.booking.bookingType === "full-day") {
    return { allowed: false, reason: "full_day" };
  }
  if (input.occurrenceMode === "single") {
    return { allowed: false, reason: "single_occurrence" };
  }

  const startsAt = input.booking.startTime
    ? zonedWallTimeToUtc(
        input.booking.dateKey,
        input.booking.startTime,
        input.provider.timezone,
      )
    : null;
  const now = input.now ?? new Date();

  if (!startsAt || now.getTime() >= startsAt.getTime()) {
    return { allowed: false, reason: "already_started" };
  }
  if (
    input.actorType === "provider" ||
    input.actorType === "google_calendar"
  ) {
    return { allowed: true };
  }
  if (!input.provider.customerReschedulingEnabled) {
    return { allowed: false, reason: "disabled" };
  }

  const cutoffMinutes = normalizeCustomerRescheduleCutoffMinutes(
    input.provider.customerRescheduleCutoffMinutes,
  );
  const cutoffAt = cutoffMinutes
    ? new Date(startsAt.getTime() - cutoffMinutes * 60_000).toISOString()
    : undefined;

  if (cutoffAt && now.getTime() >= Date.parse(cutoffAt)) {
    return { allowed: false, reason: "cutoff_reached", cutoffAt };
  }
  return cutoffAt ? { allowed: true, cutoffAt } : { allowed: true };
}
```

Do not catch unexpected exceptions in evaluator. Null from existing converter is structural invalid data and maps to `already_started`; thrown failures bubble to route handling as unexpected `500`.

- [ ] **Step 6: Run focused tests and typecheck**

Run:

```bash
npm test -- lib/__tests__/rescheduling-policy.test.ts
npm run typecheck
```

Expected: policy tests PASS. Typecheck may identify provider literals that Task 3 must update; record exact list, but do not weaken required types.

- [ ] **Step 7: Commit policy core only**

```bash
git add lib/types.ts lib/rescheduling-policy.ts lib/__tests__/rescheduling-policy.test.ts
git add -p lib/supabase/bookings.ts
git diff --cached --check
git commit -m "feat: define customer rescheduling policy"
```

---

### Task 2: Provider schema, public view, grants, and live database contract

**Files:**
- Create with CLI: migration whose generated basename ends `_customer_rescheduling_rules.sql`
- Create: `lib/supabase/__tests__/customer-rescheduling-migration-contract.test.ts`
- Create: `test/db/customer-rescheduling-rules.test.ts`

**Interfaces:**
- Consumes: existing `public.providers`, `public.public_providers`, provider RLS, and explicit column grants
- Produces: `customer_rescheduling_enabled boolean not null default true` and `customer_reschedule_cutoff_minutes integer null` in table/view access paths

- [ ] **Step 1: Recheck current Supabase guidance and CLI syntax**

Run:

```bash
curl -L --fail --silent --show-error https://supabase.com/changelog.md | rg -n "Breaking Change|Database|Data API" | head -n 80
npx supabase --version
npx supabase migration --help
npx supabase migration new --help
npx supabase db --help
```

Expected: no relevant change invalidates explicit grants or `security_invoker`; use command syntax printed by installed CLI.

- [ ] **Step 2: Generate migration through Supabase CLI**

Run: `npx supabase migration new customer_rescheduling_rules`

Then resolve exact file rather than inventing timestamp:

```bash
reschedule_migration="$(rg --files supabase/migrations | rg '/[0-9]+_customer_rescheduling_rules\.sql$' | tail -n 1)"
test -n "$reschedule_migration"
echo "$reschedule_migration"
```

Expected: one new empty migration path printed.

- [ ] **Step 3: Write failing static migration contract test against generated file**

Resolve file at runtime by suffix and require exactly one match. Assert:

```ts
expect(sql).toContain(
  "add column if not exists customer_rescheduling_enabled boolean not null default true",
);
expect(sql).toContain(
  "add column if not exists customer_reschedule_cutoff_minutes integer null",
);
expect(sql).toMatch(/customer_reschedule_cutoff_minutes > 0/);
expect(sql).toMatch(/customer_reschedule_cutoff_minutes % 60 = 0/);
expect(sql).toContain("with (security_invoker = true)");
expect(sql).toContain("p.customer_rescheduling_enabled");
expect(sql).toContain("p.customer_reschedule_cutoff_minutes");
expect(sql).toMatch(/grant select \([\s\S]*customer_rescheduling_enabled[\s\S]*\) on table public\.providers to anon/);
expect(sql).toContain(
  "grant insert (customer_rescheduling_enabled, customer_reschedule_cutoff_minutes) on table public.providers to authenticated",
);
expect(sql).toContain(
  "grant update (customer_rescheduling_enabled, customer_reschedule_cutoff_minutes) on table public.providers to authenticated",
);
expect(sql).not.toMatch(/security definer/i);
```

- [ ] **Step 4: Run static test and verify red state**

Run: `npm test -- lib/supabase/__tests__/customer-rescheduling-migration-contract.test.ts`

Expected: FAIL because generated migration is empty.

- [ ] **Step 5: Fill generated migration**

Add columns and named check constraint idempotently:

```sql
alter table public.providers
  add column if not exists customer_rescheduling_enabled boolean not null default true,
  add column if not exists customer_reschedule_cutoff_minutes integer null;

do $$
begin
  alter table public.providers
    add constraint providers_customer_reschedule_cutoff_valid
    check (
      customer_reschedule_cutoff_minutes is null
      or (
        customer_reschedule_cutoff_minutes > 0
        and customer_reschedule_cutoff_minutes % 60 = 0
      )
    );
exception
  when duplicate_object then null;
end;
$$;
```

Recreate `public.public_providers` by copying current ordered select from `20260815180000_add_public_theme.sql` and appending both new columns after `public_theme`. Keep `security_invoker = true`, existing publication predicate, and view grant. Extend anon underlying-table SELECT column grant and authenticated INSERT/UPDATE column grants with two explicit `grant` statements. Do not grant table-level writes.

- [ ] **Step 6: Add local database tests**

Use `localAdminClient()` and `localAnonClient()` from `test/db/local-client.ts`. Create one owner/provider in `beforeAll`, delete provider/user in `afterAll`, and assert:

```ts
expect(provider.customer_rescheduling_enabled).toBe(true);
expect(provider.customer_reschedule_cutoff_minutes).toBeNull();

expect((await setCutoff(0)).error?.code).toBe("23514");
expect((await setCutoff(-60)).error?.code).toBe("23514");
expect((await setCutoff(90)).error?.code).toBe("23514");
expect((await setCutoff(60)).error).toBeNull();
expect((await setCutoff(1_440)).error).toBeNull();
expect((await setCutoff(null)).error).toBeNull();
```

Also read published provider through anon `public_providers` and assert both values are visible. Sign in a local owner-scoped client with the test user's email/password and prove authenticated update of both columns succeeds; do not use service role for this grant check.

- [ ] **Step 7: Run migration and database checks**

First inspect installed help, then start local stack and apply migrations with supported local command. Run:

```bash
npx supabase start
npx supabase migration list --local
npm test -- lib/supabase/__tests__/customer-rescheduling-migration-contract.test.ts
npm run test:db -- test/db/customer-rescheduling-rules.test.ts
npx supabase db advisors --local
```

Expected: static and live tests PASS; migration listed locally; advisors report no new security/performance issue. If `db advisors` is unavailable in installed CLI, record version/output and use configured Supabase advisor tool; never report advisor success without evidence.

- [ ] **Step 8: Commit schema slice**

```bash
git add "$reschedule_migration" \
  lib/supabase/__tests__/customer-rescheduling-migration-contract.test.ts \
  test/db/customer-rescheduling-rules.test.ts
git diff --cached --check
git commit -m "feat: store customer rescheduling rules"
```

---

### Task 3: Provider normalization, persistence, dashboard/public DTOs, and demo seeds

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/store.ts`
- Modify: `lib/__tests__/store.test.ts`
- Modify: `lib/supabase/provider-store.ts`
- Modify: `lib/__tests__/provider-store.test.ts`
- Modify: `lib/supabase/bookings.ts`
- Modify: `lib/__tests__/provider-dashboard-context.test.ts`
- Modify: `lib/public-booking-resolver.ts`
- Modify: `lib/__tests__/public-booking-resolver-session.test.ts`
- Modify: `app/api/public/providers/[slug]/route.ts`
- Modify: `scripts/seed-public-examples.mjs`
- Modify: `components/provider/__tests__/provider-settings-surface.test.tsx`
- Modify: `components/provider/__tests__/appearance-split.test.tsx`
- Modify: `lib/__tests__/ics.test.ts`
- Modify: `lib/__tests__/provider-store-owner-uniqueness.test.ts`

**Interfaces:**
- Consumes: database columns from Task 2 and normalizer from Task 1
- Produces: required `ProviderInfo.customerReschedulingEnabled: boolean`, optional `ProviderInfo.customerRescheduleCutoffMinutes?: number`, and complete dashboard/public store round-trip

- [ ] **Step 1: Add required provider properties**

```ts
export type ProviderInfo = {
  // existing fields
  customerReschedulingEnabled: boolean;
  customerRescheduleCutoffMinutes?: number;
};
```

- [ ] **Step 2: Write failing normalization tests**

Add assertions:

```ts
expect(createEmptyStore().provider).toMatchObject({
  customerReschedulingEnabled: true,
  customerRescheduleCutoffMinutes: undefined,
});
expect(normalizeProvider({})).toMatchObject({
  customerReschedulingEnabled: true,
  customerRescheduleCutoffMinutes: undefined,
});
expect(
  normalizeProvider({
    customerReschedulingEnabled: false,
    customerRescheduleCutoffMinutes: 2_880,
  }),
).toMatchObject({
  customerReschedulingEnabled: false,
  customerRescheduleCutoffMinutes: 2_880,
});
expect(
  normalizeProvider({ customerRescheduleCutoffMinutes: 90 })
    .customerRescheduleCutoffMinutes,
).toBeUndefined();
```

- [ ] **Step 3: Run store tests and verify red state**

Run: `npm test -- lib/__tests__/store.test.ts`

Expected: FAIL until defaults and normalization are wired.

- [ ] **Step 4: Implement store defaults and normalization**

In `createEmptyStore().provider`, add enabled `true`. In `normalizeProvider`, preserve explicit `false` and normalize cutoff:

```ts
customerReschedulingEnabled:
  source?.customerReschedulingEnabled !== false,
customerRescheduleCutoffMinutes:
  normalizeCustomerRescheduleCutoffMinutes(
    source?.customerRescheduleCutoffMinutes,
  ),
```

- [ ] **Step 5: Write failing provider persistence tests**

Extend fake provider rows and insert/update assertions:

```ts
expect(supabase.providerUpdates[0]).toMatchObject({
  customer_rescheduling_enabled: false,
  customer_reschedule_cutoff_minutes: 1_440,
});
expect(persisted.provider).toMatchObject({
  customerReschedulingEnabled: false,
  customerRescheduleCutoffMinutes: 1_440,
});
```

Add malformed raw save tests for `0`, `90`, and `-60`, expecting `ProviderStoreWriteError` with status `400`, while `undefined` persists as SQL `null`.

- [ ] **Step 6: Implement provider save validation and payload mapping**

Validate raw store value before `normalizeProvider` can sanitize it:

```ts
function requireCustomerRescheduleCutoffMinutes(value: unknown) {
  if (value === undefined || value === null) return null;
  const normalized = normalizeCustomerRescheduleCutoffMinutes(value);
  if (!normalized) {
    throw new ProviderStoreWriteError(
      "Rescheduling cutoff must be a positive whole number of hours.",
      400,
    );
  }
  return normalized;
}
```

Add to `editablePayload`:

```ts
customer_rescheduling_enabled: provider.customerReschedulingEnabled,
customer_reschedule_cutoff_minutes:
  requireCustomerRescheduleCutoffMinutes(
    options.store.provider.customerRescheduleCutoffMinutes,
  ),
```

- [ ] **Step 7: Write failing dashboard/public DTO tests**

Update fake rows with snake-case fields. Assert dashboard store and public resolver store map them to camel case. Assert `PUBLIC_PROVIDER_SELECT` and bookings `PROVIDER_SELECT` contain both exact database column names. Add one test proving missing legacy fixture values still normalize unrestricted.

- [ ] **Step 8: Thread fields through all provider reads**

Update:

```ts
type ProviderRow = {
  customer_rescheduling_enabled: boolean | null;
  customer_reschedule_cutoff_minutes: number | null;
};
```

Both mappings use:

```ts
customerReschedulingEnabled: row.customer_rescheduling_enabled !== false,
customerRescheduleCutoffMinutes:
  normalizeCustomerRescheduleCutoffMinutes(
    row.customer_reschedule_cutoff_minutes,
  ),
```

Append both columns to explicit selects in `lib/supabase/bookings.ts`, `lib/public-booking-resolver.ts`, and public provider route boundary. Keep private email excluded from public DTOs.

- [ ] **Step 9: Make demo seeds explicit**

In `upsertProvider`, layer defaults before each example provider:

```js
const provider = {
  owner_user_id: ownerUserId,
  customer_rescheduling_enabled: true,
  customer_reschedule_cutoff_minutes: null,
  ...example.provider,
  setup_complete: true,
};
```

This preserves per-example override ability while current demos remain unrestricted.

- [ ] **Step 10: Run focused tests and typecheck**

Run:

```bash
npm test -- \
  lib/__tests__/store.test.ts \
  lib/__tests__/provider-store.test.ts \
  lib/__tests__/provider-dashboard-context.test.ts \
  lib/__tests__/public-booking-resolver-session.test.ts
npm run typecheck
```

Expected: PASS. The four listed typed fixtures use `customerReschedulingEnabled: true`; any additional compiler-reported complete `ProviderInfo` literal gets the same explicit default. Do not make property optional to silence fixtures.

- [ ] **Step 11: Commit provider data path**

Stage only listed task files. Use `git add -p lib/supabase/bookings.ts` because QR work overlaps.

```bash
git diff --cached --check
git commit -m "feat: persist provider rescheduling policy"
```

---

### Task 4: Authoritative server enforcement and manage API eligibility

**Files:**
- Create: `lib/supabase/__tests__/rescheduling-policy-enforcement.test.ts`
- Create: `app/api/public/[verticalSegment]/[providerSlug]/manage/[token]/__tests__/route.test.ts`
- Modify: `lib/supabase/bookings.ts`
- Modify: `app/api/public/[verticalSegment]/[providerSlug]/manage/[token]/route.ts`

**Interfaces:**
- Consumes: `evaluateRescheduleEligibility` and provider policy DTO from Tasks 1–3
- Produces: manage GET `{ booking, rescheduleEligibility }`; policy conflict PATCH `{ userMessage, reason }` with HTTP `409`; mutation guard shared by customer/provider/Google

- [ ] **Step 1: Write failing enforcement tests with a write-recording fake client**

Base test client should return provider, service, booking, publication state, active-booking lists, and record `update`/`insert` calls. Freeze time with `vi.useFakeTimers()` and `vi.setSystemTime(new Date("2026-08-19T16:00:00.000Z"))`.

Test matrix:

```ts
it.each([
  ["customer disabled", "customer", false, undefined, "disabled"],
  ["customer at cutoff", "customer", true, 1_440, "cutoff_reached"],
  ["started customer", "customer", true, undefined, "already_started"],
  ["started provider", "provider", false, 1_440, "already_started"],
  ["started google", "google_calendar", false, 1_440, "already_started"],
])("blocks %s before writes", async (_label, actorType, enabled, cutoff, reason) => {
  // invoke reschedule path
  await expect(result).rejects.toMatchObject({ status: 409, reason });
  expect(writes).toEqual([]);
  expect(assertGoogleAvailabilityForBooking).not.toHaveBeenCalled();
});
```

Add separate full-day and single-occurrence `it.each(["customer", "provider", "google_calendar"])` cases. Assert provider and Google can reschedule future timed booking despite disabled/cutoff, and do produce booking update + audit insert. Assert cancellation path remains successful with customer rescheduling disabled.

- [ ] **Step 2: Write failing manage lookup eligibility tests**

For `getManagedBooking`, assert future unrestricted booking returns `{allowed:true}`, disabled returns `{allowed:false,reason:"disabled"}`, and cutoff response includes ISO `cutoffAt`. Manage lookup must load service occurrence mode server-side; browser request supplies no policy data.

- [ ] **Step 3: Run server tests and verify red state**

Run: `npm test -- lib/supabase/__tests__/rescheduling-policy-enforcement.test.ts`

Expected: FAIL because current reschedule path has no policy guard and lookup returns booking only.

- [ ] **Step 4: Extend conflict error without breaking existing callers**

Preserve current third `cause` argument:

```ts
export class PublicBookingWriteError extends Error {
  constructor(
    readonly userMessage: string,
    readonly status: number,
    readonly cause?: unknown,
    readonly reason?: CustomerRescheduleBlockReason,
  ) {
    super(userMessage);
    this.name = "PublicBookingWriteError";
  }
}
```

Add exhaustive server fallback messages:

```ts
const RESCHEDULE_BLOCK_MESSAGES: Record<CustomerRescheduleBlockReason, string> = {
  disabled: "Customer rescheduling is disabled for this provider.",
  cutoff_reached: "The rescheduling deadline has passed.",
  already_started: "This booking has already started.",
  full_day: "Full-day bookings can be cancelled but not rescheduled.",
  single_occurrence: "Single-occurrence events can be cancelled but not rescheduled.",
};
```

- [ ] **Step 5: Add one shared server policy assertion before availability work**

```ts
function assertBookingCanBeRescheduled(input: {
  booking: BookingRow;
  service: Service;
  provider: ProviderRow;
  actorType: BookingActorType;
}) {
  const eligibility = evaluateRescheduleEligibility({
    booking: {
      bookingType: input.booking.booking_type,
      dateKey: input.booking.date,
      startTime: toTimeKey(input.booking.start_time),
    },
    occurrenceMode: input.service.occurrenceMode,
    provider: toProviderInfo(input.provider, false),
    actorType: input.actorType,
  });
  if (!eligibility.allowed) {
    throw new PublicBookingWriteError(
      RESCHEDULE_BLOCK_MESSAGES[eligibility.reason],
      409,
      undefined,
      eligibility.reason,
    );
  }
  return eligibility;
}
```

Call immediately after booking/provider/service reads and before `validateDateWindow`, availability queries, Google availability, update, audit event, and outbox-triggering mutation. Keep canceled/service-missing checks intact.

- [ ] **Step 6: Return server eligibility from manage GET**

Load provider, token booking, and current service. Evaluate with actor `customer` and return:

```ts
return {
  booking: toBookingRecord(booking, input.token),
  rescheduleEligibility: evaluateRescheduleEligibility({
    booking: {
      bookingType: booking.booking_type,
      dateKey: booking.date,
      startTime: toTimeKey(booking.start_time),
    },
    occurrenceMode: service.occurrenceMode,
    provider: toProviderInfo(provider, false),
    actorType: "customer",
  }),
};
```

- [ ] **Step 7: Write route tests for stable reason payload**

Mock `rescheduleManagedBooking` to throw a policy `PublicBookingWriteError`. Call `PATCH` with valid params/body and assert:

```ts
expect(response.status).toBe(409);
await expect(response.json()).resolves.toEqual({
  userMessage: "The rescheduling deadline has passed.",
  reason: "cutoff_reached",
});
```

Also assert unrelated `PublicBookingWriteError` lacks `reason`, and GET passes through `rescheduleEligibility` unchanged.

- [ ] **Step 8: Include reason in route conflict response**

In both GET/PATCH catch blocks, emit reason only when present:

```ts
return NextResponse.json(
  {
    userMessage: error.userMessage,
    ...(error.reason ? { reason: error.reason } : {}),
  },
  { status: error.status },
);
```

- [ ] **Step 9: Run enforcement, Google inbound, route, and cancellation tests**

Run:

```bash
npm test -- \
  lib/supabase/__tests__/rescheduling-policy-enforcement.test.ts \
  lib/supabase/__tests__/booking-google-guard.test.ts \
  lib/google/__tests__/apply-inbound.test.ts \
  'app/api/public/[verticalSegment]/[providerSlug]/manage/[token]/__tests__/route.test.ts'
```

Expected: PASS; blocked cases have no writes and no Google guard call; provider/Google eligible timed cases remain green.

- [ ] **Step 10: Commit authoritative server slice**

```bash
git add -p lib/supabase/bookings.ts
git add \
  lib/supabase/__tests__/rescheduling-policy-enforcement.test.ts \
  'app/api/public/[verticalSegment]/[providerSlug]/manage/[token]/route.ts' \
  'app/api/public/[verticalSegment]/[providerSlug]/manage/[token]/__tests__/route.test.ts'
git diff --cached --check
git commit -m "feat: enforce customer rescheduling rules"
```

---

### Task 5: Admin settings editor in English and Spanish

**Files:**
- Create: `components/provider/CustomerReschedulingSettings.tsx`
- Create: `components/provider/__tests__/customer-rescheduling-settings.test.tsx`
- Modify: `components/provider/ProviderSettingsSurface.tsx`
- Modify: `components/provider/__tests__/provider-settings-surface.test.tsx`
- Modify: `components/booking/i18n/translations.ts`
- Modify: `components/booking/i18n/__tests__/translations.test.ts`

**Interfaces:**
- Consumes: `ProviderInfo`, conversion helpers from Task 1, existing `onProviderChange`, existing settings save/error surface
- Produces: presentational `<CustomerReschedulingSettings provider lang disabled onChange />`

- [ ] **Step 1: Add typed translation keys and failing parity tests**

Add these exact `admin` keys to translation type and both languages:

```ts
customerReschedulingTitle
customerReschedulingBody
customerReschedulingEnabledLabel
customerReschedulingDisabledLabel
customerReschedulingAnytime
customerReschedulingCutoffSummary
customerReschedulingAddCutoff
customerReschedulingRemoveCutoff
customerReschedulingCutoffValue
customerReschedulingHours
customerReschedulingDays
```

English core copy:

```ts
customerReschedulingTitle: "Customer rescheduling",
customerReschedulingAnytime: "Customers can reschedule anytime before start.",
customerReschedulingDisabledLabel: "Customers cannot reschedule bookings.",
customerReschedulingAddCutoff: "Add cutoff rule",
customerReschedulingRemoveCutoff: "Remove cutoff rule",
```

Spanish core copy:

```ts
customerReschedulingTitle: "Reprogramación por clientes",
customerReschedulingAnytime: "Los clientes pueden reprogramar en cualquier momento antes del inicio.",
customerReschedulingDisabledLabel: "Los clientes no pueden reprogramar reservas.",
customerReschedulingAddCutoff: "Agregar límite",
customerReschedulingRemoveCutoff: "Eliminar límite",
```

Extend translation parity test so every new English key has Spanish counterpart and neither locale contains blank values.

- [ ] **Step 2: Write failing static component tests**

Render with `renderToStaticMarkup` and assert:

- enabled/no cutoff shows unrestricted summary and Add cutoff action;
- disabled with saved cutoff shows disabled summary and keeps cutoff controls/value rendered, proving toggle does not erase cutoff;
- 1,440 minutes renders value `1` with Days selected;
- 180 minutes renders value `3` with Hours selected;
- Spanish render contains Spanish title, labels, and helper copy;
- disabled prop disables toggle/input/select/buttons.

- [ ] **Step 3: Run component tests and verify red state**

Run:

```bash
npm test -- \
  components/provider/__tests__/customer-rescheduling-settings.test.tsx \
  components/booking/i18n/__tests__/translations.test.ts
```

Expected: FAIL because component/keys do not exist.

- [ ] **Step 4: Implement focused settings component**

Use native checkbox, positive integer number input, and Hours/Days select. Component owns only editor display unit/draft; parent remains source of persisted canonical minutes.

```ts
export type CustomerReschedulingSettingsProps = {
  provider: ProviderInfo;
  lang: Lang;
  disabled?: boolean;
  onChange: <K extends keyof ProviderInfo>(
    key: K,
    value: ProviderInfo[K],
  ) => void;
};
```

Required handlers:

```ts
function toggleEnabled(enabled: boolean) {
  onChange("customerReschedulingEnabled", enabled);
  // Never touch customerRescheduleCutoffMinutes here.
}

function addCutoff() {
  onChange("customerRescheduleCutoffMinutes", 1_440);
}

function removeCutoff() {
  onChange("customerRescheduleCutoffMinutes", undefined);
}

function commitCutoff(value: number, unit: RescheduleCutoffUnit) {
  const minutes = toCustomerRescheduleCutoffMinutes(value, unit);
  if (minutes) onChange("customerRescheduleCutoffMinutes", minutes);
}
```

On existing value change, initialize/sync editor with `fromCustomerRescheduleCutoffMinutes`. Unit changes must commit a valid positive whole-number interpretation; never emit `0`, fractional, or non-hour minutes.

- [ ] **Step 5: Render editor in settings surface**

Place after public booking URL and before standalone reset/integrations:

```tsx
<CustomerReschedulingSettings
  provider={provider}
  lang={lang}
  disabled={isSaving}
  onChange={onProviderChange}
/>
```

Existing Save Changes action persists policy. No separate endpoint or autosave.

- [ ] **Step 6: Run settings tests and typecheck**

Run:

```bash
npm test -- \
  components/provider/__tests__/customer-rescheduling-settings.test.tsx \
  components/provider/__tests__/provider-settings-surface.test.tsx \
  components/booking/i18n/__tests__/translations.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit admin settings slice**

```bash
git add \
  components/provider/CustomerReschedulingSettings.tsx \
  components/provider/__tests__/customer-rescheduling-settings.test.tsx \
  components/provider/ProviderSettingsSurface.tsx \
  components/provider/__tests__/provider-settings-surface.test.tsx \
  components/booking/i18n/__tests__/translations.test.ts
git add -p components/booking/i18n/translations.ts
git diff --cached --check
git commit -m "feat: add customer rescheduling settings"
```

---

### Task 6: Customer blocked-state messaging and all UI reschedule guards

**Files:**
- Create: `components/booking/reschedule-message.ts`
- Create: `components/booking/__tests__/reschedule-message.test.ts`
- Modify: `components/booking/ManageBookingPanel.tsx`
- Modify: `components/booking/i18n/translations.ts`
- Modify: `components/booking/i18n/__tests__/components.test.tsx`
- Modify: `components/haab-booking-module.tsx`

**Interfaces:**
- Consumes: server `rescheduleEligibility`, pure evaluator, provider policy, service occurrence mode, stable PATCH `reason`
- Produces: localized `getCustomerRescheduleBlockedMessage`, blocked manage/success notices, and actor-correct action visibility

- [ ] **Step 1: Add customer translation keys and failing copy tests**

Add exact `manage` keys in English and Spanish:

```ts
rescheduleDisabled
rescheduleCutoffReached
rescheduleCutoffDeadline
rescheduleAlreadyStarted
rescheduleFullDay
rescheduleSingleOccurrence
```

English meanings:

```ts
rescheduleDisabled: "This provider does not allow customers to reschedule. Contact them for help.",
rescheduleCutoffReached: "The rescheduling deadline has passed.",
rescheduleCutoffDeadline: "Reschedule before {deadline}.",
rescheduleAlreadyStarted: "This booking has already started and cannot be rescheduled.",
rescheduleFullDay: "Full-day bookings can be cancelled but not rescheduled.",
rescheduleSingleOccurrence: "This event can be cancelled but not rescheduled.",
```

Provide natural Spanish equivalents and add translation parity assertions.

- [ ] **Step 2: Write failing message-helper tests**

`getCustomerRescheduleBlockedMessage` signature:

```ts
export function getCustomerRescheduleBlockedMessage(input: {
  eligibility: CustomerRescheduleEligibility;
  providerTimeZone: string;
  lang: Lang;
}): string | undefined;
```

Assert each blocked reason maps to correct locale. For `cutoff_reached` with `cutoffAt`, assert formatted deadline uses provider timezone, not process/browser timezone:

```ts
expect(
  getCustomerRescheduleBlockedMessage({
    eligibility: {
      allowed: false,
      reason: "cutoff_reached",
      cutoffAt: "2026-08-19T16:00:00.000Z",
    },
    providerTimeZone: "America/Mexico_City",
    lang: "en",
  }),
).toContain("10:00");
```

Format with `Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: providerTimeZone })`. If deadline/zone is invalid, return generic cutoff-reached copy without throwing.

- [ ] **Step 3: Change `ManageBookingPanel` contract and write failing render tests**

Replace `canReschedule: boolean` with:

```ts
rescheduleEligibility: CustomerRescheduleEligibility;
providerTimeZone: string;
```

Assert allowed renders “Pick a new time.” Assert each blocked reason hides action, renders reason, and still renders Cancel booking. Assert canceled booking behavior remains unchanged.

- [ ] **Step 4: Run message/manage tests and verify red state**

Run:

```bash
npm test -- \
  components/booking/__tests__/reschedule-message.test.ts \
  components/booking/i18n/__tests__/components.test.tsx
```

Expected: FAIL until helper, translations, and panel contract exist.

- [ ] **Step 5: Implement localized helper and panel blocked notice**

Render reschedule action only when `rescheduleEligibility.allowed`. When blocked and booking is not canceled, render localized explanation near actions. Never hide or disable cancellation because of eligibility.

- [ ] **Step 6: Capture server eligibility on private manage lookup**

Add state typed `CustomerRescheduleEligibility | undefined`. Parse GET payload:

```ts
const payload = (await response.json().catch(() => ({}))) as {
  booking?: BookingRecord;
  rescheduleEligibility?: CustomerRescheduleEligibility;
};
```

Store server eligibility when booking is found. For standalone manage mode, calculate with pure evaluator and actor `customer`. Reset eligibility when manage token changes so one booking never inherits another booking's state.

- [ ] **Step 7: Add one local actor-aware eligibility helper in module**

```ts
function getBookingRescheduleEligibility(
  booking: BookingRecord,
  actorType: BookingActorType,
) {
  const service = services.find((item) => item.id === booking.serviceId);
  return evaluateRescheduleEligibility({
    booking,
    occurrenceMode: service?.occurrenceMode,
    provider,
    actorType,
  });
}
```

Use customer actor for private manage and post-confirmation public actions. Use provider actor for dashboard, bookings list, and calendar actions. Replace every `isServiceSingleOccurrence(...) ? null : <Reschedule>` gate with `eligibility.allowed`, thereby also hiding full-day and started actions. Keep cancellation next to each blocked/hidden reschedule action.

- [ ] **Step 8: Add post-confirmation blocked explanation**

For public success screen, calculate customer eligibility. If blocked, omit Reschedule button and render same localized reason used by manage panel. Private link stays visible. Full-day and single-occurrence success screens remain cancellable.

- [ ] **Step 9: Consume stale PATCH conflict reason**

Extend response payload type:

```ts
type RescheduleErrorPayload = {
  booking?: BookingRecord;
  userMessage?: string;
  reason?: CustomerRescheduleBlockReason;
};
```

When manage reschedule receives `409` and a recognized reason, build blocked eligibility, store it, exit reschedule flow, leave booking unchanged, and display localized reason. Slot/date conflicts without policy reason continue using existing unavailable copy. Admin structural conflicts display localized reason but do not mutate customer manage state.

- [ ] **Step 10: Add regression tests for module rules without expanding browser tooling**

Keep component tests static. Add pure evaluator assertions used by module for:

- public timed future booking allowed by default;
- public full-day and single event blocked but cancellation copy remains;
- provider future timed booking bypasses disabled/cutoff;
- provider started/full-day/single event blocked;
- exact cutoff stale response maps to deadline reason in English and Spanish.

Do not install a DOM testing dependency for this feature.

- [ ] **Step 11: Run focused customer/admin UI tests**

Run:

```bash
npm test -- \
  lib/__tests__/rescheduling-policy.test.ts \
  components/booking/__tests__/reschedule-message.test.ts \
  components/booking/i18n/__tests__/components.test.tsx \
  components/booking/i18n/__tests__/translations.test.ts
npm run typecheck
```

Expected: PASS. Search remaining reschedule buttons:

```bash
rg -n "openReschedule|startManageReschedule|canReschedule|publicFlow\.reschedule" components/haab-booking-module.tsx components/booking
```

Every result must be actor-aware or a non-action translation/reference.

- [ ] **Step 12: Commit UI policy slice**

```bash
git add \
  components/booking/reschedule-message.ts \
  components/booking/__tests__/reschedule-message.test.ts \
  components/booking/ManageBookingPanel.tsx \
  components/booking/i18n/__tests__/components.test.tsx
git add -p components/booking/i18n/translations.ts
git add -p components/haab-booking-module.tsx
git diff --cached --check
git commit -m "feat: show rescheduling eligibility to customers"
```

---

### Task 7: Documentation, full verification, and clean handoff

**Files:**
- Modify: `docs/booking-process.md`
- Modify: `docs/supabase-schema-catalog.md`
- Create: `docs/manual-tests/customer-rescheduling-rules.md`
- Review: every file and commit from Tasks 1–6

**Interfaces:**
- Consumes: completed feature
- Produces: operator/developer documentation, manual acceptance script, and fresh verification evidence

- [ ] **Step 1: Document booking policy and server boundary**

In `docs/booking-process.md`, document:

- unrestricted default until start;
- provider-wide enabled/cutoff settings;
- full-day and single-occurrence cancellation-only behavior;
- provider/Google customer-rule bypass;
- `rescheduleBookingRow` server recheck and stable conflict reasons;
- cancellation unchanged.

Use targeted staging and confirm documentation still describes both QR scanning and rescheduling.

- [ ] **Step 2: Update schema catalog**

Document both provider columns, defaults, null semantics, named check constraint, authenticated owner write grants, anon public read grant, `public_providers` exposure, and manual rollback:

```sql
alter table public.providers
  drop constraint if exists providers_customer_reschedule_cutoff_valid,
  drop column if exists customer_reschedule_cutoff_minutes,
  drop column if exists customer_rescheduling_enabled;
```

State rollback restores old unrestricted customer behavior and requires recreating `public_providers` without dropped fields if database rejects dependent-column drop.

- [ ] **Step 3: Write manual acceptance script**

Include these exact cases in both dashboard and customer manage link:

1. New/existing provider with no rule: future timed booking reschedules.
2. Disable: customer sees reason and cancellation; provider can still reschedule timed booking.
3. Re-enable: prior cutoff remains.
4. Add 24 Hours; customer before boundary succeeds, at/after boundary gets blocked.
5. Switch/display Days; remove cutoff restores unrestricted state.
6. Full-day booking: no reschedule for customer/provider; cancellation succeeds.
7. Single-occurrence event: no reschedule for customer/provider; cancellation succeeds.
8. Started timed booking: no actor can reschedule.
9. Google inbound timed future move bypasses customer policy; structural invalid moves fail.
10. Repeat admin/customer states in English and Spanish.

- [ ] **Step 4: Run focused suite first**

```bash
npm test -- \
  lib/__tests__/rescheduling-policy.test.ts \
  lib/supabase/__tests__/customer-rescheduling-migration-contract.test.ts \
  lib/__tests__/store.test.ts \
  lib/__tests__/provider-store.test.ts \
  lib/__tests__/provider-dashboard-context.test.ts \
  lib/__tests__/public-booking-resolver-session.test.ts \
  lib/supabase/__tests__/rescheduling-policy-enforcement.test.ts \
  lib/supabase/__tests__/booking-google-guard.test.ts \
  lib/google/__tests__/apply-inbound.test.ts \
  components/provider/__tests__/customer-rescheduling-settings.test.tsx \
  components/provider/__tests__/provider-settings-surface.test.tsx \
  components/booking/__tests__/reschedule-message.test.ts \
  components/booking/i18n/__tests__/components.test.tsx \
  components/booking/i18n/__tests__/translations.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Run complete application gates**

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Expected: all exit `0`. Do not claim completion from old output.

- [ ] **Step 6: Run local database verification**

```bash
npx supabase migration list --local
npm run test:db
npx supabase db advisors --local
```

Expected: migration applied, database tests PASS, no new advisor issue. If local stack/container or advisor command is unavailable, quote exact failure and mark database verification unexecuted; do not silently skip.

- [ ] **Step 7: Audit requirements and side-effect ordering**

Run:

```bash
rg -n "customerReschedulingEnabled|customerRescheduleCutoffMinutes|customer_rescheduling_enabled|customer_reschedule_cutoff_minutes" \
  app components lib scripts supabase docs
rg -n "openReschedule|startManageReschedule|rescheduleBookingRow" components lib app
git diff --check
git status --short
```

Review `rescheduleBookingRow` manually: policy assertion must precede active booking/hold reads, Google guard, booking update, event insert, and trigger-backed outbox. Review every UI Reschedule action for actor-aware eligibility. Confirm cancellation path contains no new policy check.

- [ ] **Step 8: Commit documentation only**

```bash
git add docs/supabase-schema-catalog.md docs/manual-tests/customer-rescheduling-rules.md
git add -p docs/booking-process.md
git diff --cached --check
git commit -m "docs: explain customer rescheduling rules"
```

- [ ] **Step 9: Final handoff**

Report:

- policy behavior and storage;
- server enforcement point and stable reasons;
- English/Spanish UI surfaces;
- focused/full/database command results;
- any skipped database/manual checks;
- confirmation that baseline QR-scanner behavior was preserved.
