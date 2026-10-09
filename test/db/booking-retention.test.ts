import { execFileSync } from "node:child_process";
import { describe, it } from "vitest";
import { assertLocalSupabase } from "@/test/db/local-client";

// Well-known local-only credentials. An override must still name a local host.
const databaseUrl = assertLocalSupabase(process.env.RETENTION_TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
const provider = "00000000-0000-4000-8000-00000000be01";
const owner = "00000000-0000-4000-8000-00000000be02";
const seed = `
  insert into auth.users (id, email) values ('${owner}', 'retention@example.invalid');
  insert into public.providers (id, owner_user_id, full_name, business_name, email, vertical, timezone, availability)
  values ('${provider}', '${owner}', 'Retention Owner', 'Retention Test', 'retention@example.invalid', 'professional', 'UTC', '{}');
  create function pg_temp.book(p_date date) returns uuid language plpgsql as $$
  declare v_id uuid := gen_random_uuid();
  begin
    insert into public.bookings (id, provider_id, service_name, booking_type, client_name, client_email, date, manage_token_hash, confirmation_number, idempotency_key)
    values (v_id, '${provider}', 'Session', 'full-day', 'Guest', 'guest@example.invalid', p_date, v_id::text, v_id::text, v_id::text);
    return v_id;
  end; $$;
  create function pg_temp.assert_dates(p_dates date[]) returns void language plpgsql as $$
  declare v_dates date[];
  begin
    select array_agg(date order by date) into v_dates from public.bookings where provider_id = '${provider}';
    if coalesce(v_dates, '{}') <> p_dates then raise exception 'Expected dates %, got %', p_dates, v_dates; end if;
  end; $$;
`;

function check(sql: string) {
  // Each scenario rolls back every mutation, including cleanup of other fixtures.
  execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-q"], {
    input: `begin; ${seed} ${sql} rollback;`, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
  });
}

describe("booking retention database policy", () => {
  it("keeps exact month boundary and future bookings, deletes older dates and their dependents", () => check(`
    select pg_temp.book('2026-09-08'), pg_temp.book('2026-09-09'), pg_temp.book('2027-10-09');
    insert into public.booking_events (booking_id, provider_id, actor_type, event_type)
      select id, provider_id, 'system', 'created' from public.bookings where provider_id = '${provider}' and date = '2026-09-08';
    select public.purge_expired_bookings('2026-10-09T12:00:00Z', 500);
    select pg_temp.assert_dates(array['2026-09-09','2027-10-09']::date[]);
    do $$ begin if exists (select 1 from public.booking_events where provider_id = '${provider}') then raise exception 'Orphan booking event'; end if; end $$;
  `));

  it("clamps calendar month ends and uses provider timezone at midnight", () => check(`
    update public.providers set timezone = 'America/Mexico_City' where id = '${provider}';
    select pg_temp.book('2026-02-27'), pg_temp.book('2026-02-28'), pg_temp.book('2026-03-01');
    select public.purge_expired_bookings('2026-04-01T02:00:00Z', 500);
    select pg_temp.assert_dates(array['2026-02-28','2026-03-01']::date[]);
  `));

  it("keeps Premium default off and applies one year only after opt-in, including leap day", () => check(`
    update public.providers set plan_tier = 'premium' where id = '${provider}';
    do $$ begin if (select keep_booking_history_one_year from public.providers where id = '${provider}') then raise exception 'Not default off'; end if; end $$;
    select pg_temp.book('2023-02-27'), pg_temp.book('2023-02-28'), pg_temp.book('2024-02-28');
    update public.providers set keep_booking_history_one_year = true where id = '${provider}';
    select public.purge_expired_bookings('2024-02-29T12:00:00Z', 500);
    select pg_temp.assert_dates(array['2023-02-28','2024-02-28']::date[]);
    update public.providers set keep_booking_history_one_year = false where id = '${provider}';
    select public.purge_expired_bookings('2024-02-29T12:00:00Z', 500);
    select pg_temp.assert_dates(array['2024-02-28']::date[]);
  `));

  it("honors billing downgrade over legacy Premium and manual revocation", () => check(`
    update public.providers set plan_tier = 'premium', keep_booking_history_one_year = true where id = '${provider}';
    insert into public.provider_billing_subscriptions (provider_id, stripe_subscription_id, status, plan_tier, last_event_id, last_event_created_at)
    values ('${provider}', 'sub_retention_local', 'canceled', 'free', 'evt_local', now());
    select pg_temp.book('2026-08-01');
    select public.purge_expired_bookings('2026-10-09T12:00:00Z', 500);
    select pg_temp.assert_dates('{}');
    delete from public.provider_billing_subscriptions where provider_id = '${provider}';
    insert into public.provider_feature_overrides (provider_id, feature_key, enabled, reason)
    values ('${provider}', 'booking_history_retention', false, 'Local revoke');
    select pg_temp.book('2026-08-01');
    select public.purge_expired_bookings('2026-10-09T12:00:00Z', 500);
    select pg_temp.assert_dates('{}');
  `));

  it("honors active grants and treats expired overrides as expired", () => check(`
    insert into public.provider_feature_overrides (provider_id, feature_key, enabled, reason, expires_at)
    values ('${provider}', 'booking_history_retention', true, 'Local grant', now() + interval '1 day');
    update public.providers set keep_booking_history_one_year = true where id = '${provider}';
    select pg_temp.book('2026-08-01');
    select public.purge_expired_bookings('2026-10-09T12:00:00Z', 500);
    select pg_temp.assert_dates(array['2026-08-01']::date[]);
    update public.provider_feature_overrides set expires_at = '2026-10-09T12:00:00Z' where provider_id = '${provider}';
    select public.purge_expired_bookings('2026-10-09T12:00:00Z', 500);
    select pg_temp.assert_dates('{}');
  `));

  it("rejects direct free opt-in and grants cleanup only to service role", () => check(`
    select set_config('request.jwt.claim.sub', '${owner}', true);
    set local role authenticated;
    do $$ begin
      begin
        update public.providers set keep_booking_history_one_year = true where id = '${provider}';
        raise exception 'Free opt-in succeeded';
      exception when insufficient_privilege then null; end;
      if has_function_privilege('authenticated', 'public.purge_expired_bookings(timestamptz,integer)', 'EXECUTE') then raise exception 'Public cleanup exposed'; end if;
      if has_function_privilege('anon', 'public.purge_expired_bookings(timestamptz,integer)', 'EXECUTE') then raise exception 'Anon cleanup exposed'; end if;
    end $$;
    reset role;
    update public.providers set plan_tier = 'premium' where id = '${provider}';
    set local role authenticated;
    update public.providers set keep_booking_history_one_year = true where id = '${provider}';
    reset role;
    do $$ begin if not (select keep_booking_history_one_year from public.providers where id = '${provider}') then raise exception 'Premium opt-in failed'; end if; end $$;
  `));

  it("bounds each batch and reports remaining eligible records", () => check(`
    select pg_temp.book('1900-01-01'), pg_temp.book('1900-01-02'), pg_temp.book('1900-01-03');
    do $$ declare result jsonb; begin
      result := public.purge_expired_bookings('2026-10-09T12:00:00Z', 2);
      if (result->>'deletedBookings')::int <> 2 or not (result->>'hasMore')::boolean then raise exception 'Bad batch result %', result; end if;
    end $$;
    select pg_temp.assert_dates(array['1900-01-03']::date[]);
    select public.purge_expired_bookings('2026-10-09T12:00:00Z', 500);
    select pg_temp.assert_dates('{}');
  `));
});
