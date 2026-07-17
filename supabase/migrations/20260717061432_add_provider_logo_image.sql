alter table public.providers
  add column if not exists logo_image_url text;

grant select (logo_image_url) on public.providers to anon;

create or replace view public.public_providers
with (security_invoker = true)
as
select
  id,
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
  logo_image_url
from public.providers
where setup_complete = true;

grant select on public.public_providers to anon, authenticated;
