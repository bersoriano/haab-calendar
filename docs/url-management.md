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
  - `validateCustomProviderSlug(value, entitlements)` authorizes vanity URLs from
    a resolved entitlement snapshot. It does not accept a plan tier.
  - `buildProviderPath()`, `buildServicePath()`, and `buildManagePath()` centralize URL construction.

- `lib/slug-management.ts`
  - `checkProviderSlugAvailability()` checks current provider slugs and provider redirect history.
  - `checkServiceSlugAvailability()` checks current service slugs and service redirect history.
  - `prepareProviderSlugChange()` takes a resolved `entitlements` snapshot,
    rejects one resolved for a different provider, and checks the entitlement
    before any availability query — then slug format and conflicts.

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
- Canonical `providers.slug`, `providers.custom_slug`, and `providers.plan_tier`
  are server-managed. Authenticated provider clients cannot insert or update
  these columns directly; database triggers generate canonical slugs for normal
  provider inserts.
- Custom-slug access is decided by resolved entitlements alone. `plan_tier` is
  baseline metadata that feeds the resolver; it is never compared directly at an
  authorization point. An active override wins in both directions — a free
  provider can be granted a vanity URL, a premium one can be withheld from it.
- The database check `providers_custom_slug_requires_premium` was removed
  deliberately (migration `20260815234512`). It could not evaluate a
  time-sensitive manual override, so it would have rejected exactly the writes
  the resolver had just authorized. Format, canonical uniqueness, redirect
  history, RLS, and the protected-column grants all remain — those are the
  boundaries the database can enforce, and they stay the security boundary.
- There is no custom-slug mutation route today. When one is added it must:
  authenticate the user server-side, resolve the provider from that identity
  rather than a client-supplied id, call
  `requireEntitlement(providerId, "custom_slug")`, run
  `prepareProviderSlugChange()`, and only then write through the service role.
  A denied request must mutate nothing.
- Losing the entitlement later does not withdraw an already-published slug. The
  entitlement governs *changing* a custom slug; existing public URLs stay
  stable, and rotating them is a separate product decision.
- Service slugs are unique per provider because the provider path scopes the service URL.
- `/public/{slug}` remains only as a standalone local demo path.
- The current backend public DTO intentionally returns empty bookings and holds; booking-critical writes and manage-token reads still belong to later server-authoritative backend work.
- Further moderation can be added in `prepareProviderSlugChange()` before updating `providers.custom_slug`.
