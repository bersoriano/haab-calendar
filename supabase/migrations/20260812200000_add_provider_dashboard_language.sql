-- The owner's own dashboard language, separate from `language`, which stays
-- the language their clients see on the public booking page. NULL means the
-- dashboard follows the same Accept-Language resolution as every other
-- signed-in surface, so existing owners see no change until they pin one.
alter table public.providers
  add column if not exists dashboard_language text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'providers_dashboard_language_check'
  ) then
    alter table public.providers
      add constraint providers_dashboard_language_check
      check (dashboard_language is null or dashboard_language in ('en', 'es'));
  end if;
end $$;
