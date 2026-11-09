-- Questions an invitation-only page asks with the RSVP (a menu choice, a diet
-- note, the hotel for the shuttle), the answers, and the job that clears the
-- answers a month after the event.
--
-- Additive. Hosted must take this migration BEFORE the code that selects
-- rsvp_questions ships, or every public page and dashboard read fails.

alter table public.providers
  add column if not exists rsvp_questions jsonb not null default '[]'::jsonb
    constraint providers_rsvp_questions_shape
      check (jsonb_typeof(rsvp_questions) = 'array' and pg_column_size(rsvp_questions) <= 16384);

comment on column public.providers.rsvp_questions is
  'Invitation-only pages: the questions asked with the RSVP. Shape checked by the app (lib/rsvp-questions.ts).';

-- The public form shows the questions; settings saves them.
grant select (rsvp_questions) on public.providers to anon;
grant insert (rsvp_questions), update (rsvp_questions) on public.providers to authenticated;

-- question id -> option id or text. Per guest (a menu, a diet note) or once per
-- invitation (the shuttle hotel). The tables already grant their owner every
-- column, so these need no grant of their own.
alter table public.invitation_guests
  add column if not exists answers jsonb not null default '{}'::jsonb
    constraint invitation_guests_answers_shape
      check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) <= 4096);

alter table public.invitations
  add column if not exists answers jsonb not null default '{}'::jsonb
    constraint invitations_answers_shape
      check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) <= 4096);

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
  p.rsvp_questions
from public.providers p
where p.setup_complete = true and (select private.publication_enabled(p.owner_user_id));

grant select on public.public_providers to anon, authenticated;

-- Answers include health details (allergies), so they do not outlive the
-- event: 30 days after a page's last dated event, in its own time zone, they
-- are cleared. Names, contacts and seats stay until the owner deletes them.
-- A page with no dated event (only weekly ones) is never cleared here.
create or replace function public.purge_invitation_answers(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cleared integer;
begin
  with finished as (
    select p.id
    from public.providers p
    where exists (select 1 from public.invitations i where i.provider_id = p.id)
      and (
        select max(s.occurrence_date)
        from public.services s
        where s.provider_id = p.id
          and s.occurrence_mode = 'single'
          and s.occurrence_date is not null
      ) < (
        (p_now at time zone coalesce(
          (select z.name from pg_catalog.pg_timezone_names z where z.name = p.timezone limit 1),
          'UTC'
        ))::date - 30
      )
  ),
  cleared_guests as (
    update public.invitation_guests g
    set answers = '{}'::jsonb
    from public.invitations i
    where g.invitation_id = i.id
      and i.provider_id in (select id from finished)
      and g.answers <> '{}'::jsonb
    returning 1
  ),
  cleared_households as (
    update public.invitations i
    set answers = '{}'::jsonb
    where i.provider_id in (select id from finished)
      and i.answers <> '{}'::jsonb
    returning 1
  )
  select (select count(*) from cleared_guests) + (select count(*) from cleared_households)
  into v_cleared;

  return v_cleared;
end;
$$;

revoke all on function public.purge_invitation_answers(timestamptz) from public, anon, authenticated;
grant execute on function public.purge_invitation_answers(timestamptz) to service_role;
