-- Public booking pages resolve through `public_providers`, which is declared
-- security_invoker — so the read runs as `anon` and needs privileges on the
-- underlying table. The matching row policy already exists ("Public can read
-- published provider profile columns", scoped to setup_complete and
-- publication_enabled), but anon held no grant on public.providers, so the
-- policy could never be reached and every public page resolved as not found.
--
-- Granted per column rather than on the table. The row policy decides *which*
-- rows anon may see; this decides which columns, and deliberately withholds
-- `email` — the one field on this table that is personal and that the public
-- view never exposes.
--
-- setup_complete and owner_user_id are included because the policy and the
-- view's own predicate read them.

grant select (
  id,
  owner_user_id,
  setup_complete,
  full_name,
  business_name,
  slug,
  vertical,
  language,
  timezone,
  booking_window_days,
  availability,
  phone_number_1,
  phone_number_2,
  address_1,
  address_2,
  header_image_url,
  hero_text,
  gallery_image_urls,
  logo_image_url,
  public_theme
) on table public.providers to anon;
