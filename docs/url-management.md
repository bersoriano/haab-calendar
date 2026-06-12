# URL Management

This document describes the public booking URL layer after the hierarchical URL refactor.

## Database Schema Changes

Provider slugs are unique per vertical, not globally. The canonical URL includes the vertical segment, so per-vertical uniqueness keeps URLs short while still avoiding ambiguity:

```txt
/{vertical}/{provider-slug}
/{vertical}/{provider-slug}/{service-slug}
```

Provider additions:

- `providers.vertical text not null default 'professional'`
- `providers.custom_slug text null`
- `providers.plan_tier text not null default 'free'`
- unique index on `(vertical, slug)`
- `provider_slug_redirects(provider_id, vertical, slug)` for historical profile URLs

Service additions:

- `services.slug text not null`
- unique index on `(provider_id, slug)`
- `service_slug_redirects(provider_id, service_id, slug)` for historical service URLs

Public-safe views now include `vertical` and service `slug`, plus redirect views:

- `public.public_providers`
- `public.public_services`
- `public.public_provider_slug_redirects`
- `public.public_service_slug_redirects`

## Key Functions and Services

- `lib/public-url.ts`
  - `generateSlug()` normalizes text to lowercase letters, numbers, and hyphens.
  - `generateUniqueSlug()` appends `-2`, `-3`, and so on through a caller-provided collision check.
  - `validateProviderSlug()` and `validateServiceSlug()` return clear validation messages.
  - `validateCustomProviderSlug()` enforces the premium-only vanity URL rule.
  - `buildProviderPath()`, `buildServicePath()`, and `buildManagePath()` centralize URL construction.

- `lib/slug-management.ts`
  - `checkProviderSlugAvailability()` checks current provider slugs and provider redirect history.
  - `checkServiceSlugAvailability()` checks current service slugs and service redirect history.
  - `prepareProviderSlugChange()` validates plan access, slug format, and conflicts before a custom slug update.

- `lib/public-booking-resolver.ts`
  - `resolvePublicBookingUrl()` resolves hierarchical provider and service URLs.
  - Historical provider or service slugs return canonical redirects instead of leaking lookup details into page code.

## Route Definitions

Canonical provider pages:

```txt
/doctors/{provider-slug}
/professionals/{provider-slug}
/spaces/{provider-slug}
/events/{provider-slug}
```

Canonical service pages:

```txt
/{vertical}/{provider-slug}/{service-slug}
```

Implemented Next.js routes:

```txt
app/[verticalSegment]/[providerSlug]/page.tsx
app/[verticalSegment]/[providerSlug]/[serviceSlug]/page.tsx
app/[verticalSegment]/[providerSlug]/manage/[token]/page.tsx
app/public/[slug]/page.tsx
app/public/[slug]/manage/[token]/page.tsx
```

`venues` is accepted as an alias for the `spaces` vertical, but canonical redirects use `/spaces/...`.

`/public/{slug}` is kept only for the standalone local demo flow. This app is
not in production yet, so previous `/public/...` booking URLs are not resolved or
redirected through the backend.

## Implementation Notes

- Slug history is stored in separate tables rather than JSON arrays so redirects can be indexed and conflict-checked.
- Custom provider slugs are marked premium-only with `providers.plan_tier = 'premium'`; free-plan rows cannot set `custom_slug`.
- Service slugs are unique per provider because the provider path scopes the service URL.
- `/public/{slug}` remains only as a standalone local demo path.
- The current backend public DTO intentionally returns empty bookings and holds; booking-critical writes and manage-token reads still belong to later server-authoritative backend work.
- Future moderation can be added in `prepareProviderSlugChange()` before updating `providers.custom_slug`.
