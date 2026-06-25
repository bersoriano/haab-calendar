-- Provider content language. Drives the public booking page (en default).
alter table public.providers
  add column if not exists language text not null default 'en';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'providers_language_check'
  ) then
    alter table public.providers
      add constraint providers_language_check
      check (language in ('en', 'es'));
  end if;
end $$;

-- Column-level read for anonymous public booking visitors.
grant select (language) on public.providers to anon;

-- Re-create the public view to expose language.
drop view if exists public.public_providers;

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
  availability
from public.providers
where setup_complete = true;

grant select on public.public_providers to anon, authenticated;
