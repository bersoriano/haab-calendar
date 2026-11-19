import { execFileSync } from "node:child_process";
import { describe, it } from "vitest";
import { assertLocalSupabase } from "@/test/db/local-client";

const databaseUrl = assertLocalSupabase(
  process.env.DEPOSIT_TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
);

function check(sql: string) {
  execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-q"], {
    input: `begin;
      insert into auth.users (id, email)
      values ('00000000-0000-4000-8000-00000000bd01', 'deposit-owner@example.invalid');
      insert into public.providers
        (id, owner_user_id, full_name, business_name, email, vertical, timezone, availability)
      values
        ('00000000-0000-4000-8000-00000000bd02', '00000000-0000-4000-8000-00000000bd01',
         'Deposit Owner', 'Deposit Studio', 'deposit-owner@example.invalid', 'professional', 'UTC', '{}');
      insert into public.business_bank_accounts
        (provider_id, bank_name, account_holder, country_code, currency_code, account_number, enabled)
      values ('00000000-0000-4000-8000-00000000bd02', 'Example Bank', 'Deposit Studio', 'MX', 'MXN', '123456789', true);
      create function pg_temp.pending_booking(p_service uuid, p_name text, p_type text, p_date date,
                                              p_start time default null, p_end time default null)
      returns void language plpgsql as $$
      declare request_id uuid := gen_random_uuid(); proof_id uuid := gen_random_uuid(); booking_id uuid := gen_random_uuid();
      begin
        insert into public.payment_requests
          (id, provider_id, service_id, service_date, amount_minor, currency_code, reference,
           account_snapshot, checkout_token_hash, expires_at)
        values
          (request_id, '00000000-0000-4000-8000-00000000bd02', p_service, p_date, 10000, 'MXN',
           request_id::text, '{}', request_id::text, now() + interval '1 day');
        insert into public.payment_proofs (id, payment_request_id, storage_path, mime_type, byte_size)
        values (proof_id, request_id, proof_id::text || '.jpg', 'image/jpeg', 1024);
        insert into public.bookings
          (id, provider_id, service_id, service_name, booking_type, client_name, client_email,
           date, start_time, end_time, status, payment_status, amount_due_minor, currency_code,
           payment_request_id, payment_proof_id, manage_token_hash, confirmation_number, idempotency_key)
        values
          (booking_id, '00000000-0000-4000-8000-00000000bd02', p_service, p_name, p_type,
           'First', 'first@example.invalid', p_date, p_start, p_end,
           'pending_payment_verification', 'pending_verification', 10000, 'MXN',
           request_id, proof_id, booking_id::text, booking_id::text, booking_id::text);
      end; $$;
      ${sql}
    rollback;`,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

describe("bank deposit database contract", () => {
  it("keeps receipt bucket private with image-only limits", () => check(`
    do $$ begin
      if not exists (select 1 from storage.buckets
                     where id = 'deposit-receipts' and public = false
                       and file_size_limit = 10485760
                       and allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']::text[]) then
        raise exception 'Receipt bucket is missing or not private';
      end if;
    end $$;
  `));

  it("keeps issued upload paths private and tracked for cleanup", () => check(`
    do $$ begin
      if not exists (select 1 from information_schema.tables
                     where table_schema = 'public' and table_name = 'payment_receipt_upload_intents') then
        raise exception 'Upload intents are missing';
      end if;
      if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                     where n.nspname = 'public' and c.relname = 'payment_receipt_upload_intents'
                       and c.relrowsecurity) then
        raise exception 'Upload intents need row-level security';
      end if;
    end $$;
  `));

  it("stores private account details and structured service price", () => check(`
    insert into public.business_bank_accounts
      (provider_id, bank_name, account_holder, country_code, currency_code, account_number, instructions_en, enabled)
    values
      ('00000000-0000-4000-8000-00000000bd02', 'Example Bank', 'Deposit Studio', 'MX', 'MXN', '123456789', 'Use your reference', true)
    on conflict (provider_id) do update set instructions_en = excluded.instructions_en;
    insert into public.services
      (id, provider_id, name, booking_type, description, deposit_required, deposit_amount_minor, deposit_currency_code)
    values
      ('00000000-0000-4000-8000-00000000bd03', '00000000-0000-4000-8000-00000000bd02',
       'Session', 'full-day', 'Full-day session', true, 125050, 'MXN');
    do $$ begin
      if (select deposit_amount_minor from public.services where id = '00000000-0000-4000-8000-00000000bd03') <> 125050 then
        raise exception 'Structured price missing';
      end if;
      if has_table_privilege('anon', 'public.business_bank_accounts', 'SELECT') then
        raise exception 'Bank account table is public';
      end if;
      if has_table_privilege('authenticated', 'public.business_bank_accounts', 'DELETE') then
        raise exception 'Owner can delete an account while services use it';
      end if;
      begin
        update public.business_bank_accounts set enabled = false
          where provider_id = '00000000-0000-4000-8000-00000000bd02';
        raise exception 'Active deposit account was disabled';
      exception when check_violation then null;
      end;
      begin
        update public.providers set vertical = 'restaurant'
          where id = '00000000-0000-4000-8000-00000000bd02';
        raise exception 'Active deposit provider changed to restaurant';
      exception when check_violation then null;
      end;
    end $$;
  `));

  it("rejects direct deposit enablement for restaurants", () => check(`
    update public.providers set vertical = 'restaurant'
      where id = '00000000-0000-4000-8000-00000000bd02';
    do $$ begin
      begin
        insert into public.services
          (provider_id, name, booking_type, description, deposit_required, deposit_amount_minor, deposit_currency_code)
        values ('00000000-0000-4000-8000-00000000bd02', 'Table', 'appointment', 'Dinner', true, 10000, 'MXN');
        raise exception 'Restaurant deposit escaped scope guard';
      exception when check_violation then null;
      end;
    end $$;
  `));

  it("deletes receipts at business-local midnight after twelve calendar months", () => check(`
    update public.providers set timezone = 'Pacific/Honolulu'
      where id = '00000000-0000-4000-8000-00000000bd02';
    insert into public.payment_requests
      (provider_id, service_date, amount_minor, currency_code, reference,
       account_snapshot, checkout_token_hash, expires_at)
    values ('00000000-0000-4000-8000-00000000bd02', '2027-01-10', 10000, 'MXN',
            'RETENTION-TZ', '{}', 'retention-tz-token', '2027-01-11T00:00:00Z');
    do $$ begin
      if not exists (select 1 from public.payment_requests
                     where reference = 'RETENTION-TZ' and delete_after = '2028-01-10'
                       and delete_at = '2028-01-10T10:00:00Z'::timestamptz) then
        raise exception 'Local retention cutoff was not converted to exact instant';
      end if;
    end $$;
  `));

  it("pending payment booking consumes an exclusive slot", () => check(`
    insert into public.services (id, provider_id, name, booking_type, description,
                                 deposit_required, deposit_amount_minor, deposit_currency_code)
    values ('00000000-0000-4000-8000-00000000bd03', '00000000-0000-4000-8000-00000000bd02',
            'Session', 'full-day', 'Full-day session', true, 10000, 'MXN');
    select pg_temp.pending_booking('00000000-0000-4000-8000-00000000bd03', 'Session', 'full-day', '2027-01-10');
    do $$ begin
      begin
        insert into public.bookings
          (provider_id, service_id, service_name, booking_type, client_name, client_email, date,
           manage_token_hash, confirmation_number, idempotency_key)
        values
          ('00000000-0000-4000-8000-00000000bd02', '00000000-0000-4000-8000-00000000bd03',
           'Session', 'full-day', 'Second', 'second@example.invalid', '2027-01-10',
           'pending-token-2', 'pending-num-2', 'pending-idem-2');
        raise exception 'Pending booking did not occupy slot';
      exception when unique_violation or exclusion_violation then null;
      end;
    end $$;
  `));

  it("pending event booking consumes shared capacity", () => check(`
    update public.providers set vertical = 'events' where id = '00000000-0000-4000-8000-00000000bd02';
    insert into public.services (id, provider_id, name, booking_type, description, max_spots,
                                 deposit_required, deposit_amount_minor, deposit_currency_code)
    values ('00000000-0000-4000-8000-00000000bd03', '00000000-0000-4000-8000-00000000bd02',
            'Event', 'full-day', 'One ticket left', 1, true, 10000, 'MXN');
    select pg_temp.pending_booking('00000000-0000-4000-8000-00000000bd03', 'Event', 'full-day', '2027-01-10');
    do $$ begin
      begin
        insert into public.bookings
          (provider_id, service_id, service_name, booking_type, client_name, client_email, date,
           manage_token_hash, confirmation_number, idempotency_key)
        values
          ('00000000-0000-4000-8000-00000000bd02', '00000000-0000-4000-8000-00000000bd03',
           'Event', 'full-day', 'Second', 'second@example.invalid', '2027-01-10',
           'event-token-2', 'event-num-2', 'event-idem-2');
        raise exception 'Pending event did not consume capacity';
      exception when check_violation then null;
      end;
    end $$;
  `));

  it("pending payment booking consumes daily business limit", () => check(`
    update public.providers set max_bookings_per_day = 1 where id = '00000000-0000-4000-8000-00000000bd02';
    insert into public.services (id, provider_id, name, booking_type, duration_minutes, description,
                                 deposit_required, deposit_amount_minor, deposit_currency_code)
    values ('00000000-0000-4000-8000-00000000bd03', '00000000-0000-4000-8000-00000000bd02',
            'Session', 'appointment', 60, 'Session', true, 10000, 'MXN');
    select pg_temp.pending_booking('00000000-0000-4000-8000-00000000bd03', 'Session', 'appointment',
                                   '2027-01-10', '09:00', '10:00');
    do $$ begin
      begin
        insert into public.bookings
          (provider_id, service_id, service_name, booking_type, client_name, client_email, date,
           start_time, end_time, manage_token_hash, confirmation_number, idempotency_key)
        values
          ('00000000-0000-4000-8000-00000000bd02', '00000000-0000-4000-8000-00000000bd03',
           'Session', 'appointment', 'Second', 'second@example.invalid', '2027-01-10',
           '11:00', '12:00', 'daily-token-2', 'daily-num-2', 'daily-idem-2');
        raise exception 'Pending booking did not consume daily limit';
      exception when check_violation then null;
      end;
    end $$;
  `));

  it("keeps payment request and proof when booking history is purged", () => check(`
    insert into public.services (id, provider_id, name, booking_type, description)
    values ('00000000-0000-4000-8000-00000000bd03', '00000000-0000-4000-8000-00000000bd02', 'Session', 'full-day', 'Full-day session');
    insert into public.bookings
      (id, provider_id, service_id, service_name, booking_type, client_name, client_email, date,
       status, payment_status, manage_token_hash, confirmation_number, idempotency_key)
    values
      ('00000000-0000-4000-8000-00000000bd04', '00000000-0000-4000-8000-00000000bd02',
       '00000000-0000-4000-8000-00000000bd03', 'Session', 'full-day', 'First', 'first@example.invalid', '2026-01-01',
       'confirmed', 'payment_confirmed', 'pending-token-1', 'pending-num-1', 'pending-idem-1');
    insert into public.payment_requests
      (id, provider_id, service_id, booking_id, service_date, amount_minor, currency_code,
       reference, account_snapshot, checkout_token_hash, status, expires_at, resolved_at)
    values
      ('00000000-0000-4000-8000-00000000bd05', '00000000-0000-4000-8000-00000000bd02',
       '00000000-0000-4000-8000-00000000bd03', '00000000-0000-4000-8000-00000000bd04',
       '2026-01-01', 125050, 'MXN', 'BD-TEST', '{}', 'checkout-token', 'payment_confirmed',
       '2026-01-04T00:00:00Z', '2026-01-02T00:00:00Z');
    insert into public.payment_proofs
      (payment_request_id, storage_path, mime_type, byte_size, status)
    values
      ('00000000-0000-4000-8000-00000000bd05', 'test/proof.jpg', 'image/jpeg', 1024, 'accepted');
    select public.purge_expired_bookings('2026-03-01T00:00:00Z', 500);
    do $$ begin
      if exists (select 1 from public.bookings where id = '00000000-0000-4000-8000-00000000bd04') then
        raise exception 'Old booking not purged';
      end if;
      if not exists (select 1 from public.payment_requests where id = '00000000-0000-4000-8000-00000000bd05' and booking_id is null) then
        raise exception 'Payment request lost with booking';
      end if;
      if not exists (select 1 from public.payment_proofs where payment_request_id = '00000000-0000-4000-8000-00000000bd05') then
        raise exception 'Receipt proof lost with booking';
      end if;
    end $$;
  `));

  it("submits pending booking and receipt in one database transaction", () => check(`
    insert into public.services (id, provider_id, name, booking_type, description, deposit_required, deposit_amount_minor, deposit_currency_code)
    values ('00000000-0000-4000-8000-00000000bd03', '00000000-0000-4000-8000-00000000bd02',
            'Session', 'full-day', 'Full-day session', true, 125050, 'MXN');
    insert into public.payment_requests
      (id, provider_id, service_id, service_date, amount_minor, currency_code, reference,
       account_snapshot, checkout_token_hash, expires_at)
    values
      ('00000000-0000-4000-8000-00000000bd05', '00000000-0000-4000-8000-00000000bd02',
       '00000000-0000-4000-8000-00000000bd03', '2027-01-10', 125050, 'MXN', 'BD-ONE',
       '{}', 'checkout-one', '2027-01-11T00:00:00Z');
    insert into public.payment_proofs
      (id, payment_request_id, storage_path, mime_type, byte_size, status)
    values
      ('00000000-0000-4000-8000-00000000bd06', '00000000-0000-4000-8000-00000000bd05',
       'test/proof.jpg', 'image/jpeg', 1024, 'staged');
    insert into public.bookings
      (id, provider_id, service_id, service_name, booking_type, client_name, client_email, date,
       status, payment_status, amount_due_minor, currency_code, payment_request_id, payment_proof_id,
       manage_token_hash, confirmation_number, idempotency_key)
    values
      ('00000000-0000-4000-8000-00000000bd04', '00000000-0000-4000-8000-00000000bd02',
       '00000000-0000-4000-8000-00000000bd03', 'Session', 'full-day', 'First', 'first@example.invalid',
       '2027-01-10', 'pending_payment_verification', 'pending_verification', 125050, 'MXN',
       '00000000-0000-4000-8000-00000000bd05', '00000000-0000-4000-8000-00000000bd06',
       'receipt-token', 'receipt-number', 'receipt-idem');
    do $$ begin
      if not exists (select 1 from public.payment_requests
                     where id = '00000000-0000-4000-8000-00000000bd05'
                       and booking_id = '00000000-0000-4000-8000-00000000bd04'
                       and status = 'pending_verification') then
        raise exception 'Payment request not linked';
      end if;
      if not exists (select 1 from public.payment_proofs
                     where id = '00000000-0000-4000-8000-00000000bd06'
                       and status = 'submitted' and submitted_at is not null) then
        raise exception 'Proof not submitted';
      end if;
    end $$;
  `));

  it("owner confirms payment and receipt together", () => check(`
    insert into public.services (id, provider_id, name, booking_type, description, deposit_required, deposit_amount_minor, deposit_currency_code)
    values ('00000000-0000-4000-8000-00000000bd03', '00000000-0000-4000-8000-00000000bd02',
            'Session', 'full-day', 'Session', true, 10000, 'MXN');
    select pg_temp.pending_booking('00000000-0000-4000-8000-00000000bd03', 'Session', 'full-day', '2027-01-10');
    set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000bd01';
    set local request.jwt.claim.role = 'authenticated';
    set local role authenticated;
    select public.review_bank_deposit((select id from public.bookings limit 1), 'confirm', null);
    reset role;
    do $$ begin
      if not exists (select 1 from public.bookings where status = 'confirmed' and payment_status = 'payment_confirmed') then
        raise exception 'Booking not confirmed';
      end if;
      if not exists (select 1 from public.payment_proofs where status = 'accepted') then
        raise exception 'Receipt not accepted';
      end if;
      if not exists (select 1 from public.payment_requests where status = 'payment_confirmed' and resolved_at is not null) then
        raise exception 'Payment not resolved';
      end if;
    end $$;
  `));

  it("rejection starts correction clock only after notice and accepts replacement", () => check(`
    insert into public.services (id, provider_id, name, booking_type, description, deposit_required, deposit_amount_minor, deposit_currency_code)
    values ('00000000-0000-4000-8000-00000000bd03', '00000000-0000-4000-8000-00000000bd02',
            'Session', 'full-day', 'Session', true, 10000, 'MXN');
    select pg_temp.pending_booking('00000000-0000-4000-8000-00000000bd03', 'Session', 'full-day', '2027-01-10');
    set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000bd01';
    set local request.jwt.claim.role = 'authenticated';
    set local role authenticated;
    select public.review_bank_deposit((select id from public.bookings limit 1), 'reject', 'Amount not found');
    reset role;
    do $$ begin
      if not exists (select 1 from public.payment_requests where status = 'receipt_rejected' and correction_deadline is null) then
        raise exception 'Correction clock started before email';
      end if;
    end $$;
    set local request.jwt.claim.role = 'service_role';
    set local role service_role;
    select public.record_deposit_notice_delivered((select id from public.payment_proofs limit 1));
    reset role;
    do $$ begin
      if not exists (select 1 from public.payment_requests where correction_deadline > now() + interval '23 hours') then
        raise exception 'Correction clock did not start';
      end if;
    end $$;
    insert into public.payment_proofs (id, payment_request_id, storage_path, mime_type, byte_size)
    values ('00000000-0000-4000-8000-00000000bd08', (select id from public.payment_requests limit 1),
            'test/replacement.jpg', 'image/jpeg', 1024);
    set local request.jwt.claim.role = 'service_role';
    set local role service_role;
    select public.replace_bank_deposit_receipt((select id from public.bookings limit 1),
      '00000000-0000-4000-8000-00000000bd08');
    reset role;
    do $$ begin
      if not exists (select 1 from public.bookings where status = 'pending_payment_verification'
                     and payment_proof_id = '00000000-0000-4000-8000-00000000bd08') then
        raise exception 'Replacement did not reopen review';
      end if;
      if not exists (select 1 from public.payment_proofs where id = '00000000-0000-4000-8000-00000000bd08'
                     and status = 'submitted') then
        raise exception 'Replacement proof not submitted';
      end if;
    end $$;
  `));

  it("reschedule preserves pending state and cancellation records refund due after verification", () => check(`
    insert into public.services (id, provider_id, name, booking_type, description, deposit_required, deposit_amount_minor, deposit_currency_code)
    values ('00000000-0000-4000-8000-00000000bd03', '00000000-0000-4000-8000-00000000bd02',
            'Session', 'full-day', 'Session', true, 10000, 'MXN');
    select pg_temp.pending_booking('00000000-0000-4000-8000-00000000bd03', 'Session', 'full-day', '2027-01-10');
    update public.bookings set date = '2027-02-10' where status = 'pending_payment_verification';
    do $$ begin
      if not exists (select 1 from public.payment_requests where service_date = '2027-02-10'
                     and delete_after = '2028-02-10') then
        raise exception 'Retention date did not follow reschedule';
      end if;
    end $$;
    set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000bd01';
    set local request.jwt.claim.role = 'authenticated';
    set local role authenticated;
    select public.review_bank_deposit((select id from public.bookings limit 1), 'confirm', null);
    reset role;
    update public.bookings set status = 'cancelled' where status = 'confirmed';
    do $$ begin
      if not exists (select 1 from public.bookings where status = 'cancelled' and payment_status = 'refund_due') then
        raise exception 'Cancelled paid booking did not record refund due';
      end if;
      if not exists (select 1 from public.payment_requests where status = 'refund_due') then
        raise exception 'Payment request did not record refund due';
      end if;
    end $$;
    set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000bd01';
    set local request.jwt.claim.role = 'authenticated';
    set local role authenticated;
    select public.record_bank_refund((select id from public.bookings limit 1));
    reset role;
    do $$ begin
      if not exists (select 1 from public.bookings where payment_status = 'refunded') then
        raise exception 'Refund was not recorded';
      end if;
    end $$;
  `));

  it("owner records refund due if deposit arrives after pending booking cancellation", () => check(`
    insert into public.services (id, provider_id, name, booking_type, description, deposit_required, deposit_amount_minor, deposit_currency_code)
    values ('00000000-0000-4000-8000-00000000bd03', '00000000-0000-4000-8000-00000000bd02',
            'Session', 'full-day', 'Session', true, 10000, 'MXN');
    select pg_temp.pending_booking('00000000-0000-4000-8000-00000000bd03', 'Session', 'full-day', '2027-01-10');
    update public.bookings set status = 'cancelled' where status = 'pending_payment_verification';
    do $$ begin
      if not exists (select 1 from public.bookings where payment_status = 'pending_verification') then
        raise exception 'Unverified payment was treated as received';
      end if;
    end $$;
    set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000bd01';
    set local request.jwt.claim.role = 'authenticated';
    set local role authenticated;
    select public.record_cancelled_deposit_refund_due((select id from public.bookings limit 1));
    reset role;
    do $$ begin
      if not exists (select 1 from public.bookings where status = 'cancelled' and payment_status = 'refund_due') then
        raise exception 'Refund obligation not recorded';
      end if;
      if not exists (select 1 from public.payment_requests where status = 'refund_due' and resolved_at is not null) then
        raise exception 'Payment resolution not recorded';
      end if;
    end $$;
  `));
});
