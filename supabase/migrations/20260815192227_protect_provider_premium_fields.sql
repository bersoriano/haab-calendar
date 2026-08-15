revoke insert, update on table public.providers from authenticated;

grant insert (
  owner_user_id,
  full_name,
  business_name,
  email,
  timezone,
  booking_window_days,
  availability,
  setup_complete,
  vertical,
  language,
  dashboard_language,
  phone_number_1,
  phone_number_2,
  address_1,
  address_2,
  logo_image_url,
  header_image_url,
  hero_text,
  gallery_image_urls
) on table public.providers to authenticated;

grant update (
  full_name,
  business_name,
  email,
  timezone,
  booking_window_days,
  availability,
  setup_complete,
  vertical,
  language,
  dashboard_language,
  phone_number_1,
  phone_number_2,
  address_1,
  address_2,
  logo_image_url,
  header_image_url,
  hero_text,
  gallery_image_urls
) on table public.providers to authenticated;
