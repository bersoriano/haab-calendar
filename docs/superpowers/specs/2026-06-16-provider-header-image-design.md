# Provider header image (+ future gallery) — design

Date: 2026-06-16
Status: approved (design)
Scope: all verticals. Provider uploads a header image, shown at the public root
above the service-selection list. Storage = Vercel Blob.

## Problem

A provider's public booking page opens straight into the service list with no
branding. Providers want a **header banner image** at the public root, shown
above the events/services to choose from — including when only one service
exists (so it's effectively the page's hero). Wanted for every vertical.

## Decisions (locked via brainstorming)

1. **Page/provider-level, one header per booking page** — not per-service. The
   header renders at the root above the whole selection list. ("One header per
   event" = one header for the page, in events-vertical framing.)
2. **Vercel Blob storage**, client-upload via a token route (so the 5 MB cap
   isn't constrained by Vercel's 4.5 MB server-body limit).
3. **Scaffold now; token added later.** `BLOB_READ_WRITE_TOKEN` is not set yet;
   the uploader degrades to a "storage not configured" state until it is.
4. **Banner**: responsive full-width, ~3:1, `object-cover`, glass-rounded.
   `≤ 5 MB`, types `jpeg | png | webp`. Replaceable + removable.
5. **No DB migration now.** Stored on the provider record (local store). Shows
   wherever that store loads (own-browser public page today). Cross-device via
   Supabase is documented but deferred (no write-sync exists yet).
6. **Forward-compat for a future manual carousel** of up to 3 more images below
   the header: add the `galleryImageUrls` field now (unused), make the upload
   route + validation reusable. Do NOT build the carousel UI/render yet.

## Data model (`lib/types.ts`) — additive

`ProviderInfo` gains:

```ts
headerImageUrl?: string;     // Vercel Blob URL, shown at public root
galleryImageUrls?: string[]; // future: up to 3 images for a manual carousel
```

`normalizeProvider` carries both (`galleryImageUrls` defaults to `[]`/undefined).
No other store shape change — `InjectedConfig.provider` is `ProviderInfo`.

## Validation (`lib/image-upload.ts`, new — pure, testable)

```ts
export const MAX_HEADER_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export function validateImageFile(file): { ok: true } | { ok: false; error: string };
```

Pure size/type check, reused by the header now and the gallery later. Unit-tested.

## Upload route (`app/api/blob/upload/route.ts`, new)

- Uses `@vercel/blob` `handleUpload` (client-upload token flow).
- `onBeforeGenerateToken` restricts `allowedContentTypes` to the accepted image
  types and sets the max size.
- If `process.env.BLOB_READ_WRITE_TOKEN` is missing → `503` with
  `{ userMessage: "Image storage is not configured." }`.
- Generic (path/prefix param) so the future gallery reuses the same route.

## Uploader UI (`components/provider/HeaderImageUploader.tsx`, new)

- Rendered inside `ProviderInfoForm` (so it appears in both the setup wizard and
  Settings → provider, all verticals).
- Flow: pick file → `validateImageFile` client-side → `upload()` from
  `@vercel/blob/client` to the token route → on success set
  `provider.headerImageUrl`. Shows a live preview, **Replace**, and **Remove**
  (clears the field).
- Errors (offline, missing token, oversized, wrong type) render inline; never
  crash. Provider data stays local — upload is an online-only enhancement, in
  keeping with offline-first.

## Public render (`components/haab-booking-module.tsx`)

- When `provider.headerImageUrl` is set and the surface is public, render a
  banner (`<img>`/Next image, full-width, `aspect-[3/1]`, `object-cover`,
  rounded) **above the "Choose a service" selection block**.
- Must also show for single-service providers, where the choose step is
  auto-skipped — render the banner atop the landing in that case too.
- Hidden on the details and success steps to reduce clutter.

## Cross-device plumbing (deferred — exact change documented)

Not added now (the column doesn't exist; adding it to the live `SELECT` would
break the query). To enable once a provider write-sync exists:
1. `public_providers.header_image_url` column (Supabase migration).
2. Add `header_image_url` to `PUBLIC_PROVIDER_SELECT` + `PublicProviderRow`.
3. Map it in `toPublicStore` → `provider.headerImageUrl`.

## Testing

- `lib/__tests__/image-upload.test.ts` — `validateImageFile`: accepts each type,
  rejects wrong type, rejects > 5 MB, accepts at the boundary.
- Existing 159 tests stay green. Route + React render are external (not
  unit-tested); verified manually in the browser (upload UI degrades to
  "storage not configured" without a token).

## Out of scope (YAGNI)

- The 3-image manual carousel UI/render (field reserved only).
- Per-service images. Image cropping/resizing. Cross-device Supabase sync.

## Non-goals / invariants

- No behavior change for verticals beyond the new banner.
- Offline-first preserved: all provider data stays local; upload needs network
  but its absence degrades gracefully.
- Additive to types and components.
