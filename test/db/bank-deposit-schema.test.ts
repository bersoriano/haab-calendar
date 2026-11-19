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
      ${sql}
    rollback;`,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

describe("bank deposit database contract", () => {
  it("stores private account details and structured service price", () => check(`
    insert into public.business_bank_accounts
      (provider_id, bank_name, account_holder, country_code, currency_code, account_number, instructions_en, enabled)
    values
      ('00000000-0000-4000-8000-00000000bd02', 'Example Bank', 'Deposit Studio', 'MX', 'MXN', '123456789', 'Use your reference', true);
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
    end $$;
  `));

  it("pending payment booking consumes an exclusive slot", () => check(`
    insert into public.services (id, provider_id, name, booking_type, description)
    values ('00000000-0000-4000-8000-00000000bd03', '00000000-0000-4000-8000-00000000bd02', 'Session', 'full-day', 'Full-day session');
    insert into public.bookings
      (provider_id, service_id, service_name, booking_type, client_name, client_email, date,
       status, payment_status, manage_token_hash, confirmation_number, idempotency_key)
    values
      ('00000000-0000-4000-8000-00000000bd02', '00000000-0000-4000-8000-00000000bd03',
       'Session', 'full-day', 'First', 'first@example.invalid', '2027-01-10',
       'pending_payment_verification', 'pending_verification', 'pending-token-1', 'pending-num-1', 'pending-idem-1');
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
    insert into public.services (id, provider_id, name, booking_type, description, max_spots)
    values ('00000000-0000-4000-8000-00000000bd03', '00000000-0000-4000-8000-00000000bd02', 'Event', 'full-day', 'One ticket left', 1);
    insert into public.bookings
      (provider_id, service_id, service_name, booking_type, client_name, client_email, date,
       status, payment_status, manage_token_hash, confirmation_number, idempotency_key)
    values
      ('00000000-0000-4000-8000-00000000bd02', '00000000-0000-4000-8000-00000000bd03',
       'Event', 'full-day', 'First', 'first@example.invalid', '2027-01-10',
       'pending_payment_verification', 'pending_verification', 'event-token-1', 'event-num-1', 'event-idem-1');
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
    insert into public.services (id, provider_id, name, booking_type, duration_minutes, description)
    values ('00000000-0000-4000-8000-00000000bd03', '00000000-0000-4000-8000-00000000bd02', 'Session', 'appointment', 60, 'Session');
    insert into public.bookings
      (provider_id, service_id, service_name, booking_type, client_name, client_email, date,
       start_time, end_time, status, payment_status, manage_token_hash, confirmation_number, idempotency_key)
    values
      ('00000000-0000-4000-8000-00000000bd02', '00000000-0000-4000-8000-00000000bd03',
       'Session', 'appointment', 'First', 'first@example.invalid', '2027-01-10',
       '09:00', '10:00', 'pending_payment_verification', 'pending_verification',
       'daily-token-1', 'daily-num-1', 'daily-idem-1');
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
});
