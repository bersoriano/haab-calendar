-- Applying Google's changes to bookings: who the audit says did it, and how a
-- worker takes exactly one unit of work.

-- ── Audit actor ────────────────────────────────────────────────────────────
-- A change that originated in a provider's Google calendar is not the provider
-- using Haab, and it is certainly not 'system'. Recording it as either loses the
-- one fact a provider needs when a booking moved and they do not remember
-- moving it. Widening a check accepts every existing row, so this is safe on a
-- populated table.
do $$
begin
  alter table public.booking_events
    drop constraint if exists booking_events_actor_type_check;

  alter table public.booking_events
    add constraint booking_events_actor_type_check
    check (actor_type in ('provider', 'customer', 'system', 'google_calendar'));
end;
$$;

-- ── Claiming staged inbound changes ────────────────────────────────────────
-- Same shape as the reconciliation claim: one row, leased, with SKIP LOCKED so
-- concurrent workers take different rows rather than queueing behind one.
--
-- Ordering is by (available_at, created_at) so a retry that has backed off does
-- not jump ahead of a change staged after it. Two edits to the same event are
-- separate rows only when the etag differs, and the older one applying first is
-- what makes the newer one's staleness check meaningful.
create or replace function public.claim_google_inbound_change(
  p_worker_id text,
  p_lease_seconds integer default 120
)
returns public.google_calendar_inbound_changes
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed public.google_calendar_inbound_changes;
begin
  if p_worker_id is null or length(btrim(p_worker_id)) = 0 or length(p_worker_id) > 120 then
    raise exception 'A worker id between 1 and 120 characters is required.'
      using errcode = '22023';
  end if;

  if p_lease_seconds is null or p_lease_seconds < 30 or p_lease_seconds > 600 then
    raise exception 'Lease seconds must be between 30 and 600.' using errcode = '22023';
  end if;

  with claimable as (
    select change.id
    from public.google_calendar_inbound_changes change
    where (
        (change.status in ('pending', 'failed') and change.available_at <= now())
        or (change.status = 'processing' and change.lease_expires_at <= now())
      )
    order by change.available_at, change.created_at
    limit 1
    for update skip locked
  )
  update public.google_calendar_inbound_changes target
  set status = 'processing',
      attempt_count = target.attempt_count + 1,
      lease_token = gen_random_uuid(),
      leased_by = p_worker_id,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      updated_at = now()
  from claimable
  where target.id = claimable.id
  returning target.* into claimed;

  return claimed;
end;
$$;

-- ── Claiming webhook notifications ─────────────────────────────────────────
create or replace function public.claim_google_webhook_notification(
  p_worker_id text,
  p_lease_seconds integer default 120
)
returns public.google_calendar_webhook_inbox
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed public.google_calendar_webhook_inbox;
begin
  if p_worker_id is null or length(btrim(p_worker_id)) = 0 or length(p_worker_id) > 120 then
    raise exception 'A worker id between 1 and 120 characters is required.'
      using errcode = '22023';
  end if;

  if p_lease_seconds is null or p_lease_seconds < 30 or p_lease_seconds > 600 then
    raise exception 'Lease seconds must be between 30 and 600.' using errcode = '22023';
  end if;

  with claimable as (
    select notification.id
    from public.google_calendar_webhook_inbox notification
    where (
        (notification.status in ('pending', 'failed') and notification.available_at <= now())
        or (notification.status = 'processing' and notification.lease_expires_at <= now())
      )
    order by notification.available_at, notification.received_at
    limit 1
    for update skip locked
  )
  update public.google_calendar_webhook_inbox target
  set status = 'processing',
      attempt_count = target.attempt_count + 1,
      lease_token = gen_random_uuid(),
      leased_by = p_worker_id,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      updated_at = now()
  from claimable
  where target.id = claimable.id
  returning target.* into claimed;

  return claimed;
end;
$$;

-- ── Claiming a conflict to repair ──────────────────────────────────────────
-- Repair rewrites the Google event from the booking, so two workers repairing
-- the same conflict would race on the same calendar event. The conflicts table
-- carries no lease columns by design — a repair is short and idempotent — so
-- the status transition itself is the claim, taken under SKIP LOCKED.
create or replace function public.claim_google_sync_conflict_for_repair(
  p_max_age_seconds integer default 900
)
returns public.google_calendar_sync_conflicts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed public.google_calendar_sync_conflicts;
begin
  if p_max_age_seconds is null or p_max_age_seconds < 60 or p_max_age_seconds > 86400 then
    raise exception 'Max age seconds must be between 60 and 86400.' using errcode = '22023';
  end if;

  with claimable as (
    select conflict.id
    from public.google_calendar_sync_conflicts conflict
    where conflict.status = 'open'
       -- A repair that never reported back is retried rather than stranded.
       or (conflict.status = 'repairing'
           and conflict.updated_at <= now() - make_interval(secs => p_max_age_seconds))
    order by conflict.created_at
    limit 1
    for update skip locked
  )
  update public.google_calendar_sync_conflicts target
  set status = 'repairing',
      updated_at = now()
  from claimable
  where target.id = claimable.id
  returning target.* into claimed;

  return claimed;
end;
$$;

revoke all on function public.claim_google_inbound_change(text, integer)
  from public, anon, authenticated;
revoke all on function public.claim_google_webhook_notification(text, integer)
  from public, anon, authenticated;

grant execute on function public.claim_google_inbound_change(text, integer)
  to service_role;
grant execute on function public.claim_google_webhook_notification(text, integer)
  to service_role;
revoke all on function public.claim_google_sync_conflict_for_repair(integer)
  from public, anon, authenticated;
grant execute on function public.claim_google_sync_conflict_for_repair(integer)
  to service_role;
