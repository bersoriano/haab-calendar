-- The look of a provider's public booking page.
--
-- 'default' is the page exactly as it was before themes existed, and is what
-- every existing row gets, so nothing changes for anyone until they choose.

alter table public.providers
  add column if not exists public_theme text not null default 'default';

do $$
begin
  alter table public.providers
    add constraint providers_public_theme_check
    check (public_theme in ('default', 'pink', 'summer', 'miami'));
exception
  when duplicate_object then null;
end;
$$;

-- The public page reads providers through this view, so a column the view does
-- not carry is invisible to it. Appended last: `create or replace view` can
-- only add columns at the end, and callers select by name.
create or replace view public.public_providers
with (security_invoker = true)
as
select
  p.id,
  p.full_name,
  p.business_name,
  p.slug,
  p.vertical,
  p.language,
  p.timezone,
  p.booking_window_days,
  p.availability,
  p.phone_number_1,
  p.phone_number_2,
  p.address_1,
  p.address_2,
  p.header_image_url,
  p.hero_text,
  p.gallery_image_urls,
  p.logo_image_url,
  p.public_theme
from public.providers p
where p.setup_complete = true
  and (select private.publication_enabled(p.owner_user_id));

grant select on public.public_providers to anon, authenticated;
