-- Keep the database allowlist aligned with the public theme picker.
alter table public.providers
  drop constraint providers_public_theme_check,
  add constraint providers_public_theme_check
    check (public_theme in ('default', 'dark', 'pink', 'summer', 'miami'));
