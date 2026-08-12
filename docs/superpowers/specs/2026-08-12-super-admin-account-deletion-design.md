# Super-admin account deletion design

**Date:** 2026-08-12

## Goal

Let the sole super administrator permanently delete any registered account except the sole super-administrator account itself. Deletion removes the target's authentication identity, provider workflow, services, bookings and client details, holds, redirects, publication setting, and currently referenced Haab-owned branding images.

Deletion is irreversible. The super administrator must type the target account's email address before the action becomes available.

## Scope

Included:

- Confirmed and unconfirmed accounts.
- Accounts with or without a provider workflow.
- Synthetic demo-owner accounts. Deleting one also removes its public example page and its bookings. The example URL returns the normal 404 until that demo is seeded again.
- Current provider logo, header, and gallery image URLs hosted in the configured Vercel Blob store.
- Durable retry state when database deletion succeeds but Blob cleanup fails.

Excluded:

- Deleting `bsorianodev@gmail.com`, the sole super administrator.
- Appointing or removing super administrators.
- Recovering deleted accounts or data.
- Deleting externally hosted image URLs.
- Searching, filtering, or paginating users.
- Recovering unreferenced Blob objects from past image replacements. Existing upload paths do not contain an owner identifier, so those objects cannot be attributed safely.

## User experience

Each ordinary account row in the English-only super-admin user table includes a destructive `Delete account` button. The sole super-admin row shows no enabled deletion action.

Selecting deletion opens an accessible modal containing:

- Target email and permanent-deletion warning.
- List of removed data: login, workflow, services, bookings and client details, holds, public URLs, and Haab-hosted branding images.
- Extra warning for demo-owner accounts that their linked public example page will stop working until reseeded.
- Email input requiring an exact normalized match with the target email.
- `Cancel` and `Delete permanently` actions.

The destructive action stays disabled until the email matches. While deletion runs, controls remain disabled and duplicate submissions are prevented.

After success, the deleted row disappears and the server-rendered account summary refreshes. If Blob cleanup remains pending, the UI reports that the account is deleted but asset cleanup still needs retrying.

A small pending-cleanup panel appears only when cleanup jobs exist. It exposes a retry action for each job without displaying or retaining the deleted account's email.

## Authorization and protection

Every deletion and cleanup-retry request verifies the current authenticated user through Supabase Auth and `isSuperAdminEmail`. Unauthorized callers receive the existing concealment response: `404 Not found`.

The server loads the target from Supabase Auth and never trusts client-supplied role, email, demo, or workflow flags. It normalizes the confirmation email and compares it with the target Auth email.

The backend rejects deletion when the target email matches `SUPER_ADMIN_EMAIL`, regardless of UI state. Demo-owner accounts receive no backend exemption and may be deleted.

Supabase secret/service-role credentials remain server-only. Vercel Blob deletion also runs only on the server with `BLOB_READ_WRITE_TOKEN`.

## Data model

Add `public.account_deletion_cleanup_jobs` with:

- `id uuid primary key default gen_random_uuid()`
- `target_user_id uuid not null` without a foreign key, because the Auth user is deleted before cleanup may finish
- `blob_urls text[] not null`
- `attempt_count integer not null default 0`
- `last_error text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

The table stores no email, provider name, booking details, or other deleted account data. Row-level security is enabled. `anon` and `authenticated` receive no privileges. Only `service_role` receives required CRUD privileges.

Jobs are created only when at least one current provider image URL belongs to Vercel Blob. Successful cleanup deletes the job. Failed cleanup increments `attempt_count`, records a bounded operational error, and leaves the job available for retry.

## Server flow

Add `DELETE /api/super-admin/users/[userId]` with JSON body:

```json
{
  "confirmationEmail": "target@example.com"
}
```

Flow:

1. Require sole super-admin caller.
2. Parse body and validate non-empty confirmation email.
3. Load target through `auth.admin.getUserById`.
4. Reject missing target, email mismatch, or sole-super-admin target.
5. Load target-owned providers and collect current `logo_image_url`, `header_image_url`, and `gallery_image_urls` values.
6. Keep only valid Vercel Blob URLs and de-duplicate them.
7. Insert cleanup job when Blob URLs exist.
8. Hard-delete target through `auth.admin.deleteUser(userId, false)`.
9. If Auth deletion fails, remove newly created cleanup job because account and assets still exist, then return failure.
10. Existing `ON DELETE CASCADE` relationships remove provider data, services, bookings, holds, redirects, and publication setting.
11. Delete captured Blob URLs in one server-side `del(urls)` call.
12. Remove successful cleanup job. On Blob failure, retain job and return deletion success with `cleanupPending: true`.

Add a protected retry endpoint for a cleanup job. It requires the sole super admin, loads URLs server-side, calls idempotent Vercel Blob deletion, and removes the job on success. Failed retries update attempt metadata.

Vercel documents that `del()` accepts multiple URLs, does not fail when a Blob no longer exists, and may take up to one minute to disappear from CDN cache. See [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk).

Supabase hard deletion requires a secret/service-role key and must run server-side. Existing account-owned database rows use cascade foreign keys. See [Supabase `deleteUser`](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser) and [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data).

## Response behavior

- `200`: account and Blob cleanup completed.
- `202`: account deleted; Blob cleanup job remains pending.
- `400`: malformed body or confirmation email mismatch.
- `404`: unauthorized caller or missing target/job.
- `409`: attempted sole-super-admin deletion.
- `500`: Auth deletion or cleanup-job persistence failure before account deletion completed.

If a duplicate request arrives after deletion, target lookup returns the safe missing-target response. No destructive action repeats.

## Component boundaries

- `UserPublicationTable`: owns modal state, email confirmation, deletion request, row removal, feedback, and refresh.
- Account-deletion server module: owns authorization, target protection, image discovery, job lifecycle, Supabase hard deletion, and Blob cleanup.
- Route handlers: validate HTTP input, translate domain errors to stable status codes, and avoid exposing internal errors.
- Super-admin page: loads managed users and pending cleanup summaries.
- Pending-cleanup component: retries orphan cleanup without deleted-user personal data.

## Testing

Use test-driven development. Each production behavior begins with a failing test.

Unit and component coverage:

- Email normalization and exact target matching.
- Sole-super-admin deletion blocked.
- Demo-owner deletion allowed.
- Non-super-admin access concealed.
- Accounts with no provider or images delete successfully.
- Current Vercel Blob URLs collected and de-duplicated; external URLs excluded.
- Cleanup job created before Auth deletion when needed.
- Auth deletion failure removes cleanup job and leaves Blob deletion untouched.
- Successful Auth and Blob deletion removes cleanup job.
- Blob failure returns deletion success with pending cleanup.
- Cleanup retry is authorized and idempotent.
- User table renders destructive action, protected state, warning copy, and typed-email requirement.
- Protected-route classification includes deletion and retry endpoints.

Verification gates:

- Targeted tests during red-green cycles.
- Full unit suite.
- TypeScript typecheck.
- ESLint.
- Production build.
- Browser verification of ordinary account deletion confirmation and sole-super-admin protection, using safe test fixtures only.
- Migration history and schema checks through Supabase CLI without deleting real accounts during automated verification.

## Documentation updates

Update backend and schema documentation with:

- Permanent account-deletion behavior.
- Sole-super-admin protection.
- Demo-owner deletion consequences.
- Cascade scope.
- Cleanup-job schema and retry behavior.
- Current-image-only limitation for Vercel Blob cleanup.
