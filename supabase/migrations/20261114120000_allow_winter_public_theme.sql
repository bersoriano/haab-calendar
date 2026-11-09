-- Keep the database allowlist aligned with the public theme picker: adds
-- 'winter', the ivory-and-beige theme with square corners.
--
-- Hosted must take this migration BEFORE the code that offers 'winter' ships,
-- or saving the theme fails the check constraint.
alter table public.providers
  drop constraint providers_public_theme_check,
  add constraint providers_public_theme_check
    check (public_theme in ('default', 'dark', 'pink', 'summer', 'miami', 'winter'));
