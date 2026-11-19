alter table public.bookings
  add column payment_request_id uuid unique references public.payment_requests(id) on delete set null,
  add column payment_proof_id uuid references public.payment_proofs(id) on delete set null;

create index bookings_payment_proof_id_idx on public.bookings(payment_proof_id)
  where payment_proof_id is not null;

-- A staged proof is required before a pending booking can be inserted.
-- This trigger and the after-insert link run in the booking insert transaction.
create or replace function private.validate_deposit_booking_insert()
returns trigger language plpgsql set search_path = '' as $$
declare
  request_row public.payment_requests%rowtype;
  proof_row public.payment_proofs%rowtype;
  service_row public.services%rowtype;
begin
  if new.status <> 'pending_payment_verification' then
    return new;
  end if;

  if new.payment_request_id is null or new.payment_proof_id is null
     or new.payment_status is distinct from 'pending_verification'
     or new.amount_due_minor is null or new.currency_code is null then
    raise exception 'HAAB_DEPOSIT_PROOF_REQUIRED: pending booking requires a stored receipt.'
      using errcode = '23514';
  end if;

  select * into request_row from public.payment_requests
  where id = new.payment_request_id for update;
  select * into proof_row from public.payment_proofs
  where id = new.payment_proof_id for update;
  select * into service_row from public.services
  where id = new.service_id;

  if not found or request_row.id is null or proof_row.id is null or service_row.id is null
     or request_row.provider_id <> new.provider_id
     or request_row.service_id <> new.service_id
     or request_row.service_date <> new.date
     or request_row.booking_id is not null
     or request_row.status <> 'checkout_open'
     or request_row.expires_at <= now()
     or request_row.amount_minor <> new.amount_due_minor
     or request_row.currency_code <> new.currency_code
     or proof_row.payment_request_id <> request_row.id
     or proof_row.status <> 'staged' then
    raise exception 'HAAB_DEPOSIT_INVALID: receipt or amount no longer matches checkout.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.submit_deposit_booking_proof()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status <> 'pending_payment_verification' then return new; end if;

  update public.payment_requests
  set booking_id = new.id,
      service_date = new.date,
      status = 'pending_verification'
  where id = new.payment_request_id
    and status = 'checkout_open'
    and booking_id is null;
  if not found then
    raise exception 'HAAB_DEPOSIT_INVALID: checkout was already used.'
      using errcode = '23514';
  end if;

  update public.payment_proofs
  set status = 'submitted', submitted_at = now()
  where id = new.payment_proof_id
    and payment_request_id = new.payment_request_id
    and status = 'staged';
  if not found then
    raise exception 'HAAB_DEPOSIT_INVALID: receipt was already used.'
      using errcode = '23514';
  end if;

  insert into public.payment_events
    (payment_request_id, provider_id, actor_type, event_type, metadata)
  values
    (new.payment_request_id, new.provider_id, 'customer', 'receipt_submitted',
     jsonb_build_object('bookingId', new.id, 'proofId', new.payment_proof_id));
  return new;
end;
$$;

revoke all on function private.validate_deposit_booking_insert() from public, anon, authenticated;
revoke all on function private.submit_deposit_booking_proof() from public, anon, authenticated;
create trigger bookings_validate_deposit_insert
  before insert on public.bookings
  for each row execute function private.validate_deposit_booking_insert();
create trigger bookings_submit_deposit_proof
  after insert on public.bookings
  for each row execute function private.submit_deposit_booking_proof();
