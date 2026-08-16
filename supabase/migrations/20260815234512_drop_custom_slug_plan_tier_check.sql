-- Custom slugs are no longer decided by plan_tier at the database level.
--
-- `providers_custom_slug_requires_premium` asserted `custom_slug is null or
-- plan_tier = 'premium'`. Entitlements are now resolved from the plan *plus*
-- manual overrides, which can grant this feature to a free provider or withhold
-- it from a premium one, and can expire at a moment the constraint cannot see. A
-- static check against a single column cannot evaluate that, so a provider
-- granted a custom slug by support would pass application authorization and then
-- fail at write time.
--
-- Paid access is therefore decided by trusted server code — an authenticated
-- owner, a server-resolved entitlement snapshot, then a service-role write. The
-- database keeps the boundaries it can actually enforce: slug format, canonical
-- uniqueness, redirect history, ownership through RLS, and the column-level
-- grants that stop an authenticated user writing slug, custom_slug, or
-- plan_tier directly. None of those are touched here.

alter table public.providers
  drop constraint if exists providers_custom_slug_requires_premium;
