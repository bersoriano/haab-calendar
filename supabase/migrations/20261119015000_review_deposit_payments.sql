alter table public.payment_requests
  add column correction_deadline timestamptz;

alter table public.payment_proofs
  add column customer_notice_sent_at timestamptz;

create or replace function public.review_bank_deposit(
  p_booking_id uuid,
  p_action text,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  booking_row public.bookings%rowtype;
  request_row public.payment_requests%rowtype;
  actor_id uuid := auth.uid();
begin
  if actor_id is null then raise exception 'Authentication required.' using errcode = '28000'; end if;
  if p_action not in ('confirm', 'reject') then
    raise exception 'Unsupported payment review action.' using errcode = '22023';
  end if;
  if p_action = 'reject' and length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Give a reason for rejecting the receipt.' using errcode = '22023';
  end if;

  select * into booking_row from public.bookings where id = p_booking_id for update;
  if booking_row.id is null or not private.provider_owner(booking_row.provider_id) then
    raise exception 'Booking not found.' using errcode = '42501';
  end if;
  if booking_row.status <> 'pending_payment_verification' or booking_row.payment_request_id is null then
    raise exception 'Booking is not pending payment verification.' using errcode = '22023';
  end if;
  select * into request_row from public.payment_requests
    where id = booking_row.payment_request_id for update;
  if request_row.id is null or request_row.status <> 'pending_verification' then
    raise exception 'Receipt is no longer pending review.' using errcode = '22023';
  end if;

  if p_action = 'confirm' then
    update public.payment_proofs set status = 'accepted', reviewed_at = now(), reviewed_by = actor_id
      where id = booking_row.payment_proof_id and status = 'submitted';
    if not found then raise exception 'Submitted receipt not found.' using errcode = '22023'; end if;
    update public.payment_requests
      set status = 'payment_confirmed', resolved_at = now(), correction_deadline = null
      where id = request_row.id;
    update public.bookings set status = 'confirmed', payment_status = 'payment_confirmed',
      payment_verified_at = now(), payment_verified_by = actor_id where id = booking_row.id;
    insert into public.payment_events
      (payment_request_id, provider_id, actor_type, actor_user_id, event_type)
      values (request_row.id, booking_row.provider_id, 'provider', actor_id, 'payment_confirmed');
  else
    update public.payment_proofs set status = 'rejected', reviewed_at = now(),
      reviewed_by = actor_id, rejection_reason = btrim(p_reason)
      where id = booking_row.payment_proof_id and status = 'submitted';
    if not found then raise exception 'Submitted receipt not found.' using errcode = '22023'; end if;
    update public.payment_requests set status = 'receipt_rejected',
      correction_deadline = null where id = request_row.id;
    update public.bookings set status = 'payment_action_required',
      payment_status = 'receipt_rejected' where id = booking_row.id;
    insert into public.payment_events
      (payment_request_id, provider_id, actor_type, actor_user_id, event_type, metadata)
      values (request_row.id, booking_row.provider_id, 'provider', actor_id,
        'receipt_rejected', jsonb_build_object('reason', btrim(p_reason)));
  end if;
end;
$$;

revoke all on function public.review_bank_deposit(uuid, text, text) from public, anon;
grant execute on function public.review_bank_deposit(uuid, text, text) to authenticated;

create or replace function public.record_bank_refund(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare booking_row public.bookings%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required.' using errcode = '28000'; end if;
  select * into booking_row from public.bookings where id = p_booking_id for update;
  if booking_row.id is null or not private.provider_owner(booking_row.provider_id) then
    raise exception 'Booking not found.' using errcode = '42501';
  end if;
  if booking_row.payment_status <> 'refund_due' or booking_row.payment_request_id is null then
    raise exception 'No refund is due for this booking.' using errcode = '22023';
  end if;
  update public.payment_requests set status = 'refunded', resolved_at = now()
    where id = booking_row.payment_request_id and status = 'refund_due';
  if not found then raise exception 'Refund record is no longer pending.' using errcode = '22023'; end if;
  update public.bookings set payment_status = 'refunded' where id = booking_row.id;
  insert into public.payment_events
    (payment_request_id, provider_id, actor_type, actor_user_id, event_type)
    values (booking_row.payment_request_id, booking_row.provider_id, 'provider', auth.uid(), 'refunded');
end;
$$;

revoke all on function public.record_bank_refund(uuid) from public, anon;
grant execute on function public.record_bank_refund(uuid) to authenticated;

-- A pending booking may be cancelled before anyone checks the bank. If money
-- arrived anyway, the owner records the refund obligation after checking it.
create or replace function public.record_cancelled_deposit_refund_due(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare booking_row public.bookings%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required.' using errcode = '28000'; end if;
  select * into booking_row from public.bookings where id = p_booking_id for update;
  if booking_row.id is null or not private.provider_owner(booking_row.provider_id) then
    raise exception 'Booking not found.' using errcode = '42501';
  end if;
  if booking_row.status <> 'cancelled' or booking_row.payment_request_id is null
     or booking_row.payment_status not in ('pending_verification', 'receipt_rejected') then
    raise exception 'Cancelled booking is not awaiting a deposit decision.' using errcode = '22023';
  end if;
  update public.payment_requests set status = 'refund_due', resolved_at = now(), correction_deadline = null
    where id = booking_row.payment_request_id and status in ('pending_verification', 'receipt_rejected');
  if not found then raise exception 'Payment request changed.' using errcode = '22023'; end if;
  update public.bookings set payment_status = 'refund_due' where id = booking_row.id;
  insert into public.payment_events
    (payment_request_id, provider_id, actor_type, actor_user_id, event_type)
    values (booking_row.payment_request_id, booking_row.provider_id, 'provider', auth.uid(), 'refund_due');
end;
$$;

revoke all on function public.record_cancelled_deposit_refund_due(uuid) from public, anon;
grant execute on function public.record_cancelled_deposit_refund_due(uuid) to authenticated;

create or replace function public.replace_bank_deposit_receipt(
  p_booking_id uuid,
  p_proof_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  booking_row public.bookings%rowtype;
  request_row public.payment_requests%rowtype;
begin
  select * into booking_row from public.bookings where id = p_booking_id for update;
  if booking_row.id is null or booking_row.status <> 'payment_action_required'
     or booking_row.payment_request_id is null then
    raise exception 'Booking does not accept a replacement receipt.' using errcode = '22023';
  end if;
  select * into request_row from public.payment_requests
    where id = booking_row.payment_request_id for update;
  if request_row.status <> 'receipt_rejected' or request_row.correction_deadline <= now() then
    raise exception 'Receipt correction period expired.' using errcode = '22023';
  end if;
  update public.payment_proofs set status = 'submitted', submitted_at = now()
    where id = p_proof_id and payment_request_id = request_row.id and status = 'staged';
  if not found then raise exception 'Replacement receipt not found.' using errcode = '22023'; end if;
  update public.payment_requests set status = 'pending_verification', correction_deadline = null
    where id = request_row.id;
  update public.bookings set status = 'pending_payment_verification',
    payment_status = 'pending_verification', payment_proof_id = p_proof_id
    where id = booking_row.id;
  insert into public.payment_events
    (payment_request_id, provider_id, actor_type, event_type,
     metadata)
    values (request_row.id, booking_row.provider_id, 'customer', 'receipt_replaced',
      jsonb_build_object('proofId', p_proof_id));
end;
$$;

revoke all on function public.replace_bank_deposit_receipt(uuid, uuid) from public, anon, authenticated;
grant execute on function public.replace_bank_deposit_receipt(uuid, uuid) to service_role;

create or replace function public.record_deposit_notice_delivered(p_proof_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare proof_row public.payment_proofs%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Worker role required.' using errcode = '42501';
  end if;
  select * into proof_row from public.payment_proofs where id = p_proof_id for update;
  if proof_row.id is null or proof_row.status not in ('accepted', 'rejected') then
    raise exception 'Reviewed proof not found.' using errcode = '22023';
  end if;
  if proof_row.customer_notice_sent_at is not null then return; end if;
  update public.payment_proofs set customer_notice_sent_at = now() where id = p_proof_id;
  if proof_row.status = 'rejected' then
    update public.payment_requests
      set correction_deadline = now() + interval '24 hours'
      where id = proof_row.payment_request_id and status = 'receipt_rejected';
  end if;
end;
$$;

revoke all on function public.record_deposit_notice_delivered(uuid) from public, anon, authenticated;
grant execute on function public.record_deposit_notice_delivered(uuid) to service_role;

create or replace function private.sync_deposit_booking_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.payment_request_id is null then return new; end if;
  if new.date is distinct from old.date then
    update public.payment_requests set service_date = new.date
      where id = new.payment_request_id;
  end if;
  if new.status = 'cancelled' and old.status <> 'cancelled'
     and old.payment_status = 'payment_confirmed' then
    update public.payment_requests set status = 'refund_due'
      where id = new.payment_request_id;
    update public.bookings set payment_status = 'refund_due' where id = new.id;
    insert into public.payment_events
      (payment_request_id, provider_id, actor_type, event_type)
      values (new.payment_request_id, new.provider_id, 'system', 'refund_due');
  end if;
  return new;
end;
$$;

revoke all on function private.sync_deposit_booking_change() from public, anon, authenticated;
create trigger bookings_sync_deposit_change
  after update of date, status on public.bookings
  for each row execute function private.sync_deposit_booking_change();

create or replace function public.expire_rejected_deposits(p_batch_size integer default 100)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  request_row public.payment_requests%rowtype;
  expired_count integer := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Worker role required.' using errcode = '42501';
  end if;
  for request_row in
    select * from public.payment_requests
    where status = 'receipt_rejected' and correction_deadline <= now()
      and booking_id is not null
    order by correction_deadline
    limit least(greatest(p_batch_size, 1), 500)
    for update skip locked
  loop
    update public.bookings set status = 'cancelled'
      where id = request_row.booking_id and status = 'payment_action_required';
    update public.payment_requests set correction_deadline = null
      where id = request_row.id;
    expired_count := expired_count + 1;
  end loop;
  return expired_count;
end;
$$;

revoke all on function public.expire_rejected_deposits(integer) from public, anon, authenticated;
grant execute on function public.expire_rejected_deposits(integer) to service_role;
