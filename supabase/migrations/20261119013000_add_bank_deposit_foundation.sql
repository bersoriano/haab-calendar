-- One private deposit account per business in the first release.
create table public.business_bank_accounts (
  provider_id uuid primary key references public.providers(id) on delete cascade,
  bank_name text not null check (length(btrim(bank_name)) > 0),
  account_holder text not null check (length(btrim(account_holder)) > 0),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  account_number text,
  clabe text,
  iban text,
  swift_bic text,
  routing_code text,
  instructions_en text not null default '',
  instructions_es text not null default '',
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_bank_account_identifier_required check (
    not enabled or num_nonnulls(account_number, clabe, iban) > 0
  )
);

create trigger business_bank_accounts_set_updated_at
  before update on public.business_bank_accounts
  for each row execute function private.set_updated_at();

alter table public.business_bank_accounts enable row level security;
create policy "Owner can read bank account" on public.business_bank_accounts
  for select to authenticated using (private.provider_owner(provider_id));
create policy "Owner can create bank account" on public.business_bank_accounts
  for insert to authenticated with check (private.provider_owner(provider_id));
create policy "Owner can update bank account" on public.business_bank_accounts
  for update to authenticated using (private.provider_owner(provider_id))
  with check (private.provider_owner(provider_id));
create policy "Owner can delete bank account" on public.business_bank_accounts
  for delete to authenticated using (private.provider_owner(provider_id));
revoke all on public.business_bank_accounts from anon, authenticated;
grant select, insert, update, delete on public.business_bank_accounts to authenticated;
grant select, insert, update, delete on public.business_bank_accounts to service_role;

alter table public.services
  add column deposit_required boolean not null default false,
  add column deposit_amount_minor bigint,
  add column deposit_currency_code text,
  add constraint services_deposit_price_check check (
    (deposit_amount_minor is null or deposit_amount_minor > 0)
    and (deposit_currency_code is null or deposit_currency_code ~ '^[A-Z]{3}$')
    and (not deposit_required or (deposit_amount_minor is not null and deposit_currency_code is not null))
  );

alter table public.bookings drop constraint bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check check (
    status in ('confirmed', 'rescheduled', 'cancelled',
               'pending_payment_verification', 'payment_action_required')
  ),
  add column payment_status text check (
    payment_status in ('pending_verification', 'receipt_rejected',
                       'payment_confirmed', 'refund_due', 'refunded')
  ),
  add column amount_due_minor bigint check (amount_due_minor is null or amount_due_minor > 0),
  add column currency_code text check (currency_code is null or currency_code ~ '^[A-Z]{3}$'),
  add column payment_verified_at timestamptz,
  add column payment_verified_by uuid references auth.users(id) on delete set null;

-- Pending bookings occupy inventory exactly like confirmed bookings.
drop index if exists public.bookings_exact_active_slot_idx;
create unique index bookings_exact_active_slot_idx
  on public.bookings (
    provider_id, date, booking_type,
    coalesce(start_time, '00:00'::time),
    coalesce(end_time, '23:59:59'::time)
  )
  where status in ('confirmed', 'rescheduled',
                   'pending_payment_verification', 'payment_action_required')
    and allows_shared_capacity = false;

alter table public.bookings drop constraint bookings_active_appointment_no_overlap;
alter table public.bookings
  add constraint bookings_active_appointment_no_overlap
  exclude using gist (
    provider_id with =,
    date with =,
    tsrange(date + start_time, date + end_time, '[)') with &&
  )
  where (booking_type = 'appointment'
         and status in ('confirmed', 'rescheduled',
                        'pending_payment_verification', 'payment_action_required')
         and allows_shared_capacity = false);

-- Payment requests outlive booking history so receipts remain available for audit.
create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  booking_id uuid unique references public.bookings(id) on delete set null,
  service_date date not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  reference text not null check (length(btrim(reference)) > 0),
  account_snapshot jsonb not null check (jsonb_typeof(account_snapshot) = 'object'),
  checkout_token_hash text not null unique,
  status text not null default 'checkout_open' check (
    status in ('checkout_open', 'pending_verification', 'receipt_rejected',
               'payment_confirmed', 'refund_due', 'refunded')
  ),
  expires_at timestamptz not null,
  resolved_at timestamptz,
  delete_after date not null,
  deletion_notice_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_requests_provider_reference_unique unique (provider_id, reference)
);

create index payment_requests_provider_status_idx
  on public.payment_requests(provider_id, status, created_at desc);
create index payment_requests_delete_after_idx
  on public.payment_requests(delete_after);
create index payment_requests_booking_id_idx
  on public.payment_requests(booking_id) where booking_id is not null;

create or replace function private.set_payment_request_delete_after()
returns trigger language plpgsql set search_path = '' as $$
declare resolution_date date;
begin
  if new.resolved_at is not null then
    select (new.resolved_at at time zone p.timezone)::date
    into resolution_date
    from public.providers p where p.id = new.provider_id;
  end if;
  new.delete_after := (greatest(new.service_date, coalesce(resolution_date, new.service_date))
                       + interval '1 year')::date;
  return new;
end;
$$;

revoke all on function private.set_payment_request_delete_after() from public, anon, authenticated;
create trigger payment_requests_set_delete_after
  before insert or update of service_date, resolved_at on public.payment_requests
  for each row execute function private.set_payment_request_delete_after();
create trigger payment_requests_set_updated_at
  before update on public.payment_requests
  for each row execute function private.set_updated_at();

alter table public.payment_requests enable row level security;
create policy "Owner can read payment requests" on public.payment_requests
  for select to authenticated using (private.provider_owner(provider_id));
revoke all on public.payment_requests from anon, authenticated;
grant select on public.payment_requests to authenticated;
grant select, insert, update, delete on public.payment_requests to service_role;

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null references public.payment_requests(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size between 1 and 10485760),
  sha256 text,
  status text not null default 'staged' check (
    status in ('staged', 'submitted', 'superseded', 'rejected', 'accepted')
  ),
  uploaded_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  rejection_reason text
);

create index payment_proofs_request_uploaded_idx
  on public.payment_proofs(payment_request_id, uploaded_at desc);
alter table public.payment_proofs enable row level security;
create policy "Owner can read payment proofs" on public.payment_proofs
  for select to authenticated using (
    exists (select 1 from public.payment_requests r
            where r.id = payment_request_id and private.provider_owner(r.provider_id))
  );
revoke all on public.payment_proofs from anon, authenticated;
grant select on public.payment_proofs to authenticated;
grant select, insert, update, delete on public.payment_proofs to service_role;

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null references public.payment_requests(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  actor_type text not null check (actor_type in ('customer', 'provider', 'system')),
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (
    event_type in ('checkout_opened', 'receipt_submitted', 'receipt_replaced',
                   'receipt_rejected', 'payment_confirmed', 'refund_due', 'refunded')
  ),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
create index payment_events_request_created_idx
  on public.payment_events(payment_request_id, created_at desc);
alter table public.payment_events enable row level security;
create policy "Owner can read payment events" on public.payment_events
  for select to authenticated using (private.provider_owner(provider_id));
revoke all on public.payment_events from anon, authenticated;
grant select on public.payment_events to authenticated;
grant select, insert, update, delete on public.payment_events to service_role;
