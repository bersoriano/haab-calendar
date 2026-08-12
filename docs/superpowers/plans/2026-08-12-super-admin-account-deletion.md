# Super-admin Account Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let sole super admin permanently delete any other Auth account, cascade owned booking data, delete current Vercel Blob branding assets, and retry partial asset cleanup.

**Architecture:** New service-role-only cleanup table records Blob URLs before Auth hard deletion. Focused server module owns authorization, protection, cascade trigger point, Blob cleanup, and retry. Thin Next Route Handlers map domain errors to HTTP; focused client components own typed-email confirmation and cleanup retry UI.

**Tech Stack:** Next.js 16.2.7 App Router Route Handlers, React 19.2.4, TypeScript 5, Supabase JS 2.107.0, Supabase Postgres/RLS, Vercel Blob 2.4.0, Vitest 4.1.7, Tailwind CSS 4.

## Global Constraints

- Execute directly on `main`, explicitly authorized by user.
- Only `bsorianodev@gmail.com` is protected from deletion.
- Demo-owner accounts may be deleted; linked example pages then return 404 until reseeded.
- Deletion is permanent and requires exact normalized target-email confirmation.
- Remove Auth identity, provider workflow, services, bookings/client details, holds, redirects, publication setting, and current Haab-hosted branding images.
- Never expose Supabase secret/service-role credentials or Vercel Blob token to browser.
- Cleanup job stores no deleted-user email or business/client data.
- Delete only current URLs hosted below `blob.vercel-storage.com`; leave external URLs untouched.
- No search, filtering, or pagination.
- Super-admin UI remains English-only.
- Follow test-driven development: each production behavior gets a failing test first.

## File structure

- Create `supabase/migrations/<timestamp>_add_account_deletion_cleanup_jobs.sql`: durable service-only retry table.
- Create `lib/supabase/account-deletion.ts`: deletion domain logic, typed domain errors, cleanup listing/retry, URL filtering.
- Create `lib/__tests__/account-deletion.test.ts`: server-domain red-green coverage.
- Create `app/api/super-admin/users/[userId]/route.ts`: permanent-delete HTTP boundary.
- Create `app/api/super-admin/account-deletion-cleanups/[jobId]/retry/route.ts`: cleanup-retry HTTP boundary.
- Create `app/api/super-admin/__tests__/account-deletion-routes.test.ts`: HTTP validation/status mapping.
- Create `components/super-admin/DeleteAccountDialog.tsx`: accessible typed-email destructive confirmation.
- Create `components/super-admin/PendingDeletionCleanups.tsx`: pending cleanup list and retry action.
- Modify `components/super-admin/UserPublicationTable.tsx`: deletion action, modal state, row removal, refresh.
- Modify `components/super-admin/__tests__/user-publication-table.test.tsx`: protected and deletable row coverage.
- Create `components/super-admin/__tests__/delete-account-dialog.test.tsx`: warning and confirmation-control coverage.
- Modify `lib/supabase/publication.ts`: expose demo-owner marker in managed rows.
- Modify `app/super-admin/page.tsx`: load/render pending cleanups and broaden account-management copy.
- Modify `lib/__tests__/proxy-routes.test.ts`: deletion/retry paths remain protected.
- Modify `docs/backend-implementation.md` and `docs/supabase-schema-catalog.md`: behavior and schema documentation.

---

### Task 1: Durable cleanup schema

**Files:**
- Create: `supabase/migrations/<CLI timestamp>_add_account_deletion_cleanup_jobs.sql`
- Modify: `docs/supabase-schema-catalog.md`

**Interfaces:**
- Produces table `public.account_deletion_cleanup_jobs(id, target_user_id, blob_urls, attempt_count, last_error, created_at, updated_at)` for service-role CRUD only.

- [ ] **Step 1: Generate migration file through current CLI**

Run:

```bash
npx supabase migration new add_account_deletion_cleanup_jobs
```

Expected: one timestamped file created under `supabase/migrations/`.

- [ ] **Step 2: Write migration**

Add exact schema, checks, RLS, grants, and update trigger:

```sql
create table public.account_deletion_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null,
  blob_urls text[] not null check (cardinality(blob_urls) > 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_deletion_cleanup_jobs enable row level security;
revoke all on public.account_deletion_cleanup_jobs from anon, authenticated;
grant select, insert, update, delete on public.account_deletion_cleanup_jobs to service_role;

create trigger account_deletion_cleanup_jobs_set_updated_at
  before update on public.account_deletion_cleanup_jobs
  for each row execute function private.set_updated_at();
```

- [ ] **Step 3: Verify migration syntax/history**

Run:

```bash
npx supabase migration list --local
```

Expected: new migration appears after `20260804164334` with no duplicate version.

- [ ] **Step 4: Document table and no-PII rule**

Add schema catalog section listing all columns, service-only access, no Auth foreign key, and job lifecycle.

- [ ] **Step 5: Commit schema slice**

```bash
git add supabase/migrations docs/supabase-schema-catalog.md
git commit -m "feat: add account deletion cleanup jobs"
```

### Task 2: Account-deletion domain service

**Files:**
- Create: `lib/supabase/account-deletion.ts`
- Create: `lib/__tests__/account-deletion.test.ts`
- Modify: `lib/supabase/publication.ts`

**Interfaces:**
- Produces `AccountDeletionError` with codes `not_found | confirmation_mismatch | protected_account | deletion_failed | cleanup_persistence_failed`.
- Produces `deleteManagedAccount(userId: string, confirmationEmail: string): Promise<{ userId: string; cleanupPending: boolean }>`.
- Produces `listAccountDeletionCleanupJobs(): Promise<AccountDeletionCleanupSummary[]>`.
- Produces `retryAccountDeletionCleanup(jobId: string): Promise<{ jobId: string; cleanupPending: false }>`.
- Produces `isVercelBlobUrl(value: string): boolean` and `collectVercelBlobUrls(rows): string[]` for deterministic URL filtering tests.
- Extends `ManagedUserSummary` with `demoOwner: boolean` using `isDemoOwnerEmail`.

- [ ] **Step 1: Write failing pure-policy tests**

Cover normalization, sole-admin rejection, demo-owner allowance, Vercel-host filtering, HTTPS requirement, external-host rejection, gallery flattening, and URL de-duplication. Assert production function names above are missing/failing for intended reasons.

- [ ] **Step 2: Run policy tests and verify RED**

Run:

```bash
npm test -- lib/__tests__/account-deletion.test.ts
```

Expected: FAIL because account-deletion module/exports do not exist.

- [ ] **Step 3: Implement pure helpers and domain error**

Use `new URL(value)` safely. Accept only `https:` hosts ending in `.blob.vercel-storage.com`. Normalize emails with `trim().toLowerCase()`. Compare target against `SUPER_ADMIN_EMAIL` server-side.

- [ ] **Step 4: Run policy tests and verify GREEN**

Run same targeted command. Expected: policy tests PASS.

- [ ] **Step 5: Write failing deletion orchestration tests**

Mock server client, admin client, and Vercel `del`. Cover:

```ts
await expect(deleteManagedAccount(targetId, "wrong@example.com"))
  .rejects.toMatchObject({ code: "confirmation_mismatch" });
expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
```

Also assert:

- Unauthorized caller fails before admin mutation.
- Protected target returns `protected_account`.
- Demo target reaches `deleteUser(targetId, false)`.
- No-provider/no-image target deletes without job or Blob call.
- Image target inserts job before Auth deletion, then deletes Blobs and job.
- Auth deletion failure removes inserted job and never deletes Blobs.
- Blob failure updates job attempt/error and resolves `{ cleanupPending: true }`.
- Cleanup listing omits URLs and target user ID from returned summary except opaque job ID/timestamps/attempt count.
- Retry calls `del`, removes job, and handles missing job as `not_found`.

- [ ] **Step 6: Run orchestration tests and verify RED**

Run targeted test. Expected: FAIL because orchestration functions lack behavior.

- [ ] **Step 7: Implement minimal orchestration**

Call `requireSuperAdmin()` first. Load target through `auth.admin.getUserById`. Load provider image fields with service-role client. Insert cleanup job before `auth.admin.deleteUser(userId, false)`. Roll back new job on Auth failure. Call Vercel `del(blobUrls)` only after successful Auth deletion. Bound persisted error text to 500 characters.

- [ ] **Step 8: Run orchestration tests and verify GREEN**

Run targeted test. Expected: all account-deletion tests PASS.

- [ ] **Step 9: Extend managed-user summaries**

Import `isDemoOwnerEmail`, add `demoOwner` property, and assert existing publication table fixture types compile with explicit true/false values.

- [ ] **Step 10: Commit domain slice**

```bash
git add lib/supabase/account-deletion.ts lib/__tests__/account-deletion.test.ts lib/supabase/publication.ts
git commit -m "feat: add permanent account deletion service"
```

### Task 3: Protected HTTP routes

**Files:**
- Create: `app/api/super-admin/users/[userId]/route.ts`
- Create: `app/api/super-admin/account-deletion-cleanups/[jobId]/retry/route.ts`
- Create: `app/api/super-admin/__tests__/account-deletion-routes.test.ts`
- Modify: `lib/__tests__/proxy-routes.test.ts`

**Interfaces:**
- `DELETE /api/super-admin/users/:userId` consumes `{ confirmationEmail: string }`.
- `POST /api/super-admin/account-deletion-cleanups/:jobId/retry` consumes no body.
- Both return JSON domain results; route errors map to 400/404/409/500 without internal messages.

- [ ] **Step 1: Write failing route tests**

Mock domain functions. Assert malformed JSON and missing confirmation return 400; success returns 200; `cleanupPending: true` returns 202; mismatch returns 400; unauthorized/missing returns 404; protected returns 409; internal failures return stable 500 copy. Assert retry success/error mappings.

- [ ] **Step 2: Add failing proxy classification cases**

Add exact paths:

```ts
"/api/super-admin/users/user-id",
"/api/super-admin/account-deletion-cleanups/job-id/retry",
```

Run:

```bash
npm test -- app/api/super-admin/__tests__/account-deletion-routes.test.ts lib/__tests__/proxy-routes.test.ts
```

Expected: route tests FAIL because handlers do not exist; proxy cases already pass through protected prefix.

- [ ] **Step 3: Implement thin Route Handlers**

Use Next 16 async params via `context: { params: Promise<{ userId: string }> }` / `jobId`. Export `dynamic = "force-dynamic"`, `runtime = "nodejs"`. Parse DELETE JSON before domain call. Never return stack traces or Supabase/Vercel error text.

- [ ] **Step 4: Run route tests and verify GREEN**

Run targeted command. Expected: all route and proxy tests PASS.

- [ ] **Step 5: Commit route slice**

```bash
git add app/api/super-admin lib/__tests__/proxy-routes.test.ts
git commit -m "feat: expose guarded account deletion routes"
```

### Task 4: Typed-email deletion UI and cleanup retry UI

**Files:**
- Create: `components/super-admin/DeleteAccountDialog.tsx`
- Create: `components/super-admin/PendingDeletionCleanups.tsx`
- Create: `components/super-admin/__tests__/delete-account-dialog.test.tsx`
- Modify: `components/super-admin/UserPublicationTable.tsx`
- Modify: `components/super-admin/__tests__/user-publication-table.test.tsx`
- Modify: `app/super-admin/page.tsx`

**Interfaces:**
- `DeleteAccountDialog` consumes `user`, `busy`, `onCancel`, `onDeleted` and submits target confirmation.
- `PendingDeletionCleanups` consumes opaque `AccountDeletionCleanupSummary[]` and retries by job ID.
- `UserPublicationTable` removes successful target locally and calls `router.refresh()` to refresh counters/jobs.

- [ ] **Step 1: Write failing component tests**

Assert ordinary rows contain `Delete account`; sole-super-admin row contains `Protected account`; dialog renders permanent warning, all deletion categories, exact target email instruction, demo-page warning when `demoOwner: true`, disabled destructive submit at initial render, and no demo warning for ordinary users. Assert cleanup panel uses opaque job labels and renders no email.

- [ ] **Step 2: Run component tests and verify RED**

Run:

```bash
npm test -- components/super-admin/__tests__/user-publication-table.test.tsx components/super-admin/__tests__/delete-account-dialog.test.tsx
```

Expected: FAIL because components/actions are missing.

- [ ] **Step 3: Implement accessible deletion dialog**

Render `role="dialog"`, `aria-modal="true"`, labelled title, warning list, controlled email input with `autoComplete="off"`, focus-ready input, cancel, and disabled-until-normalized-match destructive button. Submit DELETE request and expose stable server `userMessage` on failure.

- [ ] **Step 4: Wire user table deletion**

Keep publication action. Add separate destructive action. Never enable it for `user.superAdmin`. On 200/202 remove row and show table-level status; on 202 say asset cleanup remains pending. Call `router.refresh()` after success.

- [ ] **Step 5: Implement pending cleanup panel and page loading**

Call `listAccountDeletionCleanupJobs()` beside existing managed-user/demo reads. Render attempt count, created/updated UTC time, last operational error only if safe/bounded, and retry button. Remove completed job locally and refresh server data.

- [ ] **Step 6: Run component tests and verify GREEN**

Run targeted command. Expected: all component tests PASS.

- [ ] **Step 7: Commit UI slice**

```bash
git add components/super-admin app/super-admin/page.tsx
git commit -m "feat: add super-admin account deletion UI"
```

### Task 5: Documentation and end-to-end verification

**Files:**
- Modify: `docs/backend-implementation.md`
- Modify: `docs/supabase-schema-catalog.md` if implementation details changed from Task 1

**Interfaces:**
- Documents permanent deletion, sole-admin protection, demo consequences, cascade scope, retry state, and current-image-only limitation.

- [ ] **Step 1: Update backend documentation**

Describe both protected endpoints, typed-email confirmation, service-role boundary, hard-delete cascade, `202 cleanupPending`, retry behavior, and current-image-only Blob limitation.

- [ ] **Step 2: Run fresh focused verification**

```bash
npm test -- lib/__tests__/account-deletion.test.ts app/api/super-admin/__tests__/account-deletion-routes.test.ts components/super-admin/__tests__/user-publication-table.test.tsx components/super-admin/__tests__/delete-account-dialog.test.tsx lib/__tests__/proxy-routes.test.ts
```

Expected: all targeted tests PASS.

- [ ] **Step 3: Run full gates**

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
git diff --check
```

Expected: every command exits 0; Vitest reports zero failed tests; build route table includes both account-deletion endpoints.

- [ ] **Step 4: Browser-check safe UI behavior**

Run local app and use Playwright CLI. Verify sole-super-admin row cannot open deletion dialog. Open an ordinary or synthetic fixture row only when deletion request is intercepted in browser; verify warning, disabled submit, wrong email remains disabled, exact email enables action, cancel closes dialog, no horizontal overflow, and browser console has zero errors. Do not delete any real remote account during verification.

- [ ] **Step 5: Review acceptance checklist**

Re-read committed design. Confirm every included, excluded, security, error, cleanup, demo-owner, testing, and documentation requirement has implementation evidence.

- [ ] **Step 6: Commit final docs/verification adjustments**

```bash
git add docs components app lib supabase
git commit -m "docs: document account deletion operations"
```

- [ ] **Step 7: Report main-branch commits without pushing unless requested**

Show commit IDs, migration filename, verification counts, and deployment requirement to run migration before using deletion in production.
