-- The date an invitation-only page stops taking answers, and when the owner
-- last emailed every household that has not answered.
--
-- Additive. Hosted must take this migration BEFORE the code that selects
-- rsvp_deadline ships, or every public page and dashboard read fails.

alter table public.providers
  add column if not exists rsvp_deadline date,
  add column if not exists last_bulk_reminder_at timestamptz;

comment on column public.providers.rsvp_deadline is
  'Invitation-only pages: answers are open through the end of this date in the page''s time zone. Null is no deadline.';
comment on column public.providers.last_bulk_reminder_at is
  'When the owner last emailed every unanswered household. Written by the server only; caps that email to once a day.';

-- The deadline is shown publicly and saved from settings. The reminder clock is
-- neither: only the server (service role) reads or writes it, so an owner cannot
-- reset their own daily cap.
grant select (rsvp_deadline) on public.providers to anon;
grant insert (rsvp_deadline), update (rsvp_deadline) on public.providers to authenticated;

create or replace view public.public_providers with (security_invoker = true) as
select p.id, p.full_name, p.business_name, p.slug, p.vertical, p.language,
  p.timezone, p.booking_window_days, p.availability, p.phone_number_1,
  p.phone_number_2, p.address_1, p.address_2, p.header_image_url, p.hero_text,
  p.gallery_image_urls, p.logo_image_url, p.public_theme, p.max_bookings_per_day,
  private.public_booking_footer(p.id)->>'text' as public_footer_text,
  private.public_booking_footer(p.id)->>'url' as public_footer_url,
  p.vocabulary,
  p.rsvp_mode,
  p.rsvp_deadline
from public.providers p
where p.setup_complete = true and (select private.publication_enabled(p.owner_user_id));

grant select on public.public_providers to anon, authenticated;
