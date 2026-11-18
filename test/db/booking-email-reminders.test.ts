import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "vitest";
import { assertLocalSupabase } from "@/test/db/local-client";

const databaseUrl = assertLocalSupabase(process.env.REMINDER_TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
const inlineMigration = process.env.REMINDER_TEST_INLINE_MIGRATION === "1"
  ? readFileSync("supabase/migrations/20261118184136_booking_email_reminders.sql", "utf8")
  : "";

function check(sql: string) {
  execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-q"], {
    input: `begin;
      ${inlineMigration}
      insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000e101', 'reminders@example.invalid');
      insert into public.providers (id, owner_user_id, full_name, business_name, email, vertical, timezone, availability, setup_complete)
        values ('00000000-0000-4000-8000-00000000e102', '00000000-0000-4000-8000-00000000e101', 'Owner', 'Reminder Tests', 'reminders@example.invalid', 'professional', 'UTC', '{}', true);
      insert into public.services (id, provider_id, name, booking_type, duration_minutes)
        values ('00000000-0000-4000-8000-00000000e103', '00000000-0000-4000-8000-00000000e102', 'Session', 'appointment', 30);
      insert into public.bookings (id, provider_id, service_id, service_name, booking_type, duration_minutes_snapshot,
        client_name, client_email, date, start_time, end_time, manage_token_hash, confirmation_number, idempotency_key)
        values ('00000000-0000-4000-8000-00000000e104', '00000000-0000-4000-8000-00000000e102',
        '00000000-0000-4000-8000-00000000e103', 'Session', 'appointment', 30, 'Guest', 'guest@example.invalid',
        current_date + 7, '09:00', '09:30', 'reminder-test-hash', 'REMINDERTEST1', 'reminder-test-idem');
      ${sql}
      rollback;`,
    encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
  });
}

describe("booking email reminder scheduling", () => {
  it("keeps reminder delivery state private from public clients", () => check(`
    set local role anon;
    do $$ begin
      begin
        perform 1 from public.booking_email_reminders limit 1;
        raise exception 'Anonymous client read reminder state';
      exception when insufficient_privilege then null;
      end;
    end $$;
    reset role;
    set local role authenticated;
    do $$ begin
      begin
        perform 1 from public.booking_email_reminders limit 1;
        raise exception 'Authenticated client read reminder state';
      exception when insufficient_privilege then null;
      end;
    end $$;
    reset role;
  `));

  it("claims a due reminder once and keeps sent state terminal", () => check(`
    update public.booking_email_reminders set scheduled_at = now() - interval '1 minute'
      where booking_id = '00000000-0000-4000-8000-00000000e104';
    do $$ begin
      if (select count(*) from public.claim_booking_email_reminders(10)) <> 1 then
        raise exception 'Due reminder not claimed'; end if;
      if (select count(*) from public.claim_booking_email_reminders(10)) <> 0 then
        raise exception 'Reminder claimed twice'; end if;
    end $$;
    update public.booking_email_reminders set status = 'sent', sent_at = now(),
      lease_token = null, lease_expires_at = null
      where booking_id = '00000000-0000-4000-8000-00000000e104';
    update public.providers set reminder_primary_minutes = 2880
      where id = '00000000-0000-4000-8000-00000000e102';
    do $$ begin
      if (select count(*) from public.booking_email_reminders where booking_id = '00000000-0000-4000-8000-00000000e104' and status = 'sent') <> 1 then
        raise exception 'Sent reminder was reopened'; end if;
    end $$;
  `));

  it("schedules on confirm, replaces on reschedule, and cancels on cancel", () => check(`
    do $$ begin
      if (select count(*) from public.booking_email_reminders where booking_id = '00000000-0000-4000-8000-00000000e104' and status = 'scheduled') <> 1 then
        raise exception 'Primary reminder not scheduled'; end if;
    end $$;
    update public.providers set reminder_secondary_minutes = 120 where id = '00000000-0000-4000-8000-00000000e102';
    do $$ begin
      if (select count(*) from public.booking_email_reminders where booking_id = '00000000-0000-4000-8000-00000000e104' and status = 'scheduled') <> 2 then
        raise exception 'Second reminder not scheduled'; end if;
    end $$;
    update public.bookings set date = current_date + 8 where id = '00000000-0000-4000-8000-00000000e104';
    do $$ begin
      if (select count(*) from public.booking_email_reminders where booking_id = '00000000-0000-4000-8000-00000000e104' and status = 'cancelled') <> 2 then
        raise exception 'Old reminders still pending'; end if;
      if (select count(*) from public.booking_email_reminders where booking_id = '00000000-0000-4000-8000-00000000e104' and status = 'scheduled') <> 2 then
        raise exception 'New reminders missing'; end if;
    end $$;
    update public.bookings set status = 'cancelled' where id = '00000000-0000-4000-8000-00000000e104';
    do $$ begin
      if exists (select 1 from public.booking_email_reminders where booking_id = '00000000-0000-4000-8000-00000000e104' and status = 'scheduled') then
        raise exception 'Cancelled booking still scheduled'; end if;
    end $$;
  `));

  it("cancels pending reminders when business or service disables them", () => check(`
    update public.providers set reminders_enabled = false where id = '00000000-0000-4000-8000-00000000e102';
    do $$ begin
      if exists (select 1 from public.booking_email_reminders where booking_id = '00000000-0000-4000-8000-00000000e104' and status = 'scheduled') then
        raise exception 'Business opt-out ignored'; end if;
    end $$;
    update public.providers set reminders_enabled = true where id = '00000000-0000-4000-8000-00000000e102';
    update public.services set reminders_enabled = false where id = '00000000-0000-4000-8000-00000000e103';
    do $$ begin
      if exists (select 1 from public.booking_email_reminders where booking_id = '00000000-0000-4000-8000-00000000e104' and status = 'scheduled') then
        raise exception 'Service opt-out ignored'; end if;
    end $$;
  `));

  it("moves due time when business timezone changes", () => check(`
    update public.providers set timezone = 'America/Mexico_City'
      where id = '00000000-0000-4000-8000-00000000e102';
    do $$ begin
      if (select count(*) from public.booking_email_reminders
          where booking_id = '00000000-0000-4000-8000-00000000e104' and status = 'cancelled') <> 1 then
        raise exception 'Old timezone reminder not cancelled'; end if;
      if (select count(*) from public.booking_email_reminders
          where booking_id = '00000000-0000-4000-8000-00000000e104' and status = 'scheduled'
            and appointment_at = ((current_date + 7 + time '09:00') at time zone 'America/Mexico_City')) <> 1 then
        raise exception 'New timezone reminder missing'; end if;
    end $$;
  `));
});
