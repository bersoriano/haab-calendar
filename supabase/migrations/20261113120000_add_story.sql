-- A short story a page tells about itself: shown on an invitation-only page
-- and its invitations, and used for the preview when the page's link is shared.
--
-- Additive. Hosted must take this migration BEFORE the code that selects
-- story ships, or every public page and dashboard read fails.

alter table public.providers
  add column if not exists story text
    constraint providers_story_length check (story is null or char_length(story) <= 600);

comment on column public.providers.story is
  'Up to 600 characters, shown publicly and in link previews.';

grant select (story) on public.providers to anon;
grant insert (story), update (story) on public.providers to authenticated;

create or replace view public.public_providers with (security_invoker = true) as
select p.id, p.full_name, p.business_name, p.slug, p.vertical, p.language,
  p.timezone, p.booking_window_days, p.availability, p.phone_number_1,
  p.phone_number_2, p.address_1, p.address_2, p.header_image_url, p.hero_text,
  p.gallery_image_urls, p.logo_image_url, p.public_theme, p.max_bookings_per_day,
  private.public_booking_footer(p.id)->>'text' as public_footer_text,
  private.public_booking_footer(p.id)->>'url' as public_footer_url,
  p.vocabulary,
  p.rsvp_mode,
  p.rsvp_deadline,
  p.rsvp_questions,
  p.story
from public.providers p
where p.setup_complete = true and (select private.publication_enabled(p.owner_user_id));

grant select on public.public_providers to anon, authenticated;
