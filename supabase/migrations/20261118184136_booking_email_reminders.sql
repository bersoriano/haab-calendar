-- Reminder state stays private; only the service-role worker reads it.
alter table public.providers
  add column reminders_enabled boolean not null default true,
  add column reminder_primary_minutes integer not null default 1440
    check (reminder_primary_minutes between 15 and 43200),
  add column reminder_secondary_minutes integer
    check (reminder_secondary_minutes is null or reminder_secondary_minutes between 15 and 43200),
  add column reminder_message text not null default ''
    check (length(reminder_message) <= 500);
alter table public.providers add constraint providers_reminder_order
  check (reminder_secondary_minutes is null or reminder_secondary_minutes < reminder_primary_minutes);

alter table public.services
  add column reminders_enabled boolean not null default true;

alter table public.bookings
  add column client_language text check (client_language in ('en', 'es'));

grant select (reminders_enabled) on public.services to anon;

create table public.booking_email_reminders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('primary', 'secondary')),
  appointment_at timestamptz not null,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'processing', 'sent', 'cancelled', 'failed', 'dead_letter')),
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  sent_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  unique (booking_id, reminder_type, appointment_at)
);

create index booking_email_reminders_due_idx
  on public.booking_email_reminders (available_at, scheduled_at)
  where status in ('scheduled', 'failed', 'processing');
create index booking_email_reminders_lease_idx
  on public.booking_email_reminders (lease_expires_at)
  where status = 'processing';
create index booking_email_reminders_appointment_idx
  on public.booking_email_reminders (appointment_at)
  where status in ('scheduled', 'failed', 'processing');

alter table public.booking_email_reminders enable row level security;
revoke all on public.booking_email_reminders from anon, authenticated;
grant select, insert, update, delete on public.booking_email_reminders to service_role;

create or replace function private.refresh_booking_email_reminders(p_booking public.bookings)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider public.providers;
  v_service_enabled boolean;
  v_appointment_at timestamptz;
  v_minutes integer;
  v_type text;
begin
  -- Old rows, including leased rows, must become undeliverable after a move.
  update public.booking_email_reminders r
  set status = 'cancelled', lease_token = null, lease_expires_at = null
  where r.booking_id = p_booking.id
    and r.status in ('scheduled', 'failed', 'processing');

  if p_booking.status not in ('confirmed', 'rescheduled') then return; end if;
  select * into v_provider from public.providers where id = p_booking.provider_id;
  if not found or not v_provider.reminders_enabled then return; end if;
  if p_booking.service_id is not null then
    select s.reminders_enabled into v_service_enabled
    from public.services s where s.id = p_booking.service_id;
    if v_service_enabled is false then return; end if;
  end if;

  -- Full-day bookings use 09:00 local as their reminder anchor.
  v_appointment_at := (p_booking.date + coalesce(p_booking.start_time, time '09:00'))
    at time zone v_provider.timezone;
  if v_appointment_at <= now() then return; end if;

  for v_type, v_minutes in
    select 'primary', v_provider.reminder_primary_minutes
    union all
    select 'secondary', v_provider.reminder_secondary_minutes
  loop
    if v_minutes is null or v_appointment_at - make_interval(mins => v_minutes) <= now() then
      continue;
    end if;
    insert into public.booking_email_reminders
      (booking_id, provider_id, reminder_type, appointment_at, scheduled_at)
    values
      (p_booking.id, p_booking.provider_id, v_type, v_appointment_at,
       v_appointment_at - make_interval(mins => v_minutes))
    on conflict (booking_id, reminder_type, appointment_at)
      do update set scheduled_at = excluded.scheduled_at,
        available_at = now(), status = 'scheduled', attempt_count = 0,
        last_error_code = null
      where booking_email_reminders.status <> 'sent';
  end loop;
end;
$$;
revoke all on function private.refresh_booking_email_reminders(public.bookings) from public, anon, authenticated;

create or replace function private.booking_email_reminders_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.date is distinct from old.date
    or new.start_time is distinct from old.start_time
    or new.status is distinct from old.status
    or new.service_id is distinct from old.service_id then
    perform private.refresh_booking_email_reminders(new);
  end if;
  return null;
end;
$$;
revoke all on function private.booking_email_reminders_changed() from public, anon, authenticated;
create trigger bookings_refresh_email_reminders
  after insert or update on public.bookings for each row
  execute function private.booking_email_reminders_changed();

create or replace function private.provider_email_reminders_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings;
begin
  if new.timezone is distinct from old.timezone
    or new.reminders_enabled is distinct from old.reminders_enabled
    or new.reminder_primary_minutes is distinct from old.reminder_primary_minutes
    or new.reminder_secondary_minutes is distinct from old.reminder_secondary_minutes then
    for v_booking in select * from public.bookings
      where provider_id = new.id and date >= (now() at time zone new.timezone)::date
        and status in ('confirmed', 'rescheduled')
    loop
      perform private.refresh_booking_email_reminders(v_booking);
    end loop;
  end if;
  return null;
end;
$$;
revoke all on function private.provider_email_reminders_changed() from public, anon, authenticated;
create trigger providers_refresh_email_reminders
  after update on public.providers for each row
  execute function private.provider_email_reminders_changed();

create or replace function private.service_email_reminders_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings;
begin
  if new.reminders_enabled is distinct from old.reminders_enabled then
    for v_booking in select * from public.bookings
      where service_id = new.id and date >= (now() at time zone
        (select p.timezone from public.providers p where p.id = new.provider_id))::date
        and status in ('confirmed', 'rescheduled')
    loop
      perform private.refresh_booking_email_reminders(v_booking);
    end loop;
  end if;
  return null;
end;
$$;
revoke all on function private.service_email_reminders_changed() from public, anon, authenticated;
create trigger services_refresh_email_reminders
  after update on public.services for each row
  execute function private.service_email_reminders_changed();

create or replace function public.claim_booking_email_reminders(p_batch_size integer default 50)
returns setof public.booking_email_reminders
language plpgsql security definer set search_path = '' as $$
begin
  update public.booking_email_reminders r set status = 'cancelled',
    lease_token = null, lease_expires_at = null
  where r.status in ('scheduled', 'failed', 'processing') and r.appointment_at <= now();
  return query
  with due as (
    select r.id from public.booking_email_reminders r
    where ((r.status in ('scheduled', 'failed') and r.available_at <= now()
            and r.scheduled_at <= now())
       or (r.status = 'processing' and r.lease_expires_at <= now()))
      and r.appointment_at > now()
    order by r.scheduled_at, r.id
    limit least(greatest(p_batch_size, 1), 100)
    for update skip locked
  )
  update public.booking_email_reminders r
  set status = 'processing', attempt_count = r.attempt_count + 1,
      lease_token = gen_random_uuid(), lease_expires_at = now() + interval '2 minutes'
  from due where r.id = due.id returning r.*;
end;
$$;
revoke all on function public.claim_booking_email_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_booking_email_reminders(integer) to service_role;

-- Future bookings made before this migration need the same reminders as new bookings.
do $$
declare v_booking public.bookings;
begin
  for v_booking in select * from public.bookings
    where status in ('confirmed', 'rescheduled') and date >= current_date - 1
  loop
    perform private.refresh_booking_email_reminders(v_booking);
  end loop;
end;
$$;
