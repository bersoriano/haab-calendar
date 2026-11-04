import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, it } from "vitest";
import { assertLocalSupabase } from "@/test/db/local-client";

// Well-known local-only credentials. An override must still name a local host.
const databaseUrl = assertLocalSupabase(process.env.RETENTION_TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
const provider = "00000000-0000-4000-8000-00000000c101";
const owner = "00000000-0000-4000-8000-00000000c102";
const otherProvider = "00000000-0000-4000-8000-00000000c201";
const otherOwner = "00000000-0000-4000-8000-00000000c202";
const seed = `
  insert into auth.users (id, email) values ('${owner}', 'clients@example.invalid'), ('${otherOwner}', 'other@example.invalid');
  insert into public.providers (id, owner_user_id, full_name, business_name, email, vertical, timezone, availability) values
    ('${provider}', '${owner}', 'Clients Owner', 'Clients Test', 'clients@example.invalid', 'professional', 'UTC', '{}'),
    ('${otherProvider}', '${otherOwner}', 'Other Owner', 'Other Test', 'other@example.invalid', 'professional', 'UTC', '{}');
  create function pg_temp.book(p_provider uuid, p_name text, p_email text, p_phone text, p_date date) returns uuid language plpgsql as $$
  declare v_id uuid := gen_random_uuid();
  begin
    insert into public.bookings (id, provider_id, service_name, booking_type, client_name, client_email, client_phone, date, manage_token_hash, confirmation_number, idempotency_key)
    values (v_id, p_provider, 'Session', 'full-day', p_name, p_email, p_phone, p_date, v_id::text, v_id::text, v_id::text);
    return v_id;
  end; $$;
  create function pg_temp.assert_eq(p_actual text, p_expected text) returns void language plpgsql as $$
  begin
    if p_actual is distinct from p_expected then raise exception 'Expected %, got %', p_expected, p_actual; end if;
  end; $$;
  create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
    set local role authenticated;
  end; $$;
`;

function check(sql: string) {
  // Each scenario rolls back every mutation.
  execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-q"], {
    input: `begin; ${seed} ${sql} rollback;`, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
  });
}

describe("provider client records", () => {
  it("records a booking's contact details and nothing else from it", () => check(`
    select pg_temp.book('${provider}', ' Ana ', ' ana@example.com ', '555', '2030-01-01');
    select pg_temp.assert_eq(
      (select client_name || '|' || client_email || '|' || client_phone || '|' || booking_count from public.provider_clients where provider_id = '${provider}'),
      'Ana|ana@example.com|555|1');
  `));

  it("treats two spellings of one email as one person, keeping the latest details", () => check(`
    select pg_temp.book('${provider}', 'Ana', 'ana@example.com', '555', '2030-01-01');
    select pg_temp.book('${provider}', 'Ana Peña', ' ANA@Example.com', '', '2030-01-02');
    select pg_temp.assert_eq((select count(*)::text from public.provider_clients where provider_id = '${provider}'), '1');
    -- A blank phone on the later booking does not erase the one already known.
    select pg_temp.assert_eq(
      (select client_name || '|' || client_phone || '|' || booking_count from public.provider_clients where provider_id = '${provider}'),
      'Ana Peña|555|2');
  `));

  it("keeps one business's client separate from another's", () => check(`
    select pg_temp.book('${provider}', 'Ana', 'ana@example.com', '', '2030-01-01');
    select pg_temp.book('${otherProvider}', 'Ana', 'ana@example.com', '', '2030-01-01');
    select pg_temp.assert_eq((select count(*)::text from public.provider_clients where email_key = 'ana@example.com'), '2');
  `));

  it("survives the booking purge", () => check(`
    select pg_temp.book('${provider}', 'Ana', 'ana@example.com', '555', '2020-01-01');
    select public.purge_expired_bookings(now(), 1000);
    select pg_temp.assert_eq((select count(*)::text from public.bookings where provider_id = '${provider}'), '0');
    select pg_temp.assert_eq((select client_phone from public.provider_clients where provider_id = '${provider}'), '555');
  `));

  it("lets an owner read and delete only their own records", () => check(`
    select pg_temp.book('${provider}', 'Mine', 'mine@example.com', '', '2030-01-01');
    select pg_temp.book('${otherProvider}', 'Theirs', 'theirs@example.com', '', '2030-01-01');
    select pg_temp.act_as('${owner}');
    select pg_temp.assert_eq((select string_agg(client_name, ',') from public.provider_clients), 'Mine');
    delete from public.provider_clients where email_key = 'theirs@example.com';
    delete from public.provider_clients where email_key = 'mine@example.com';
    select pg_temp.assert_eq((select count(*)::text from public.provider_clients), '0');
    reset role;
    select pg_temp.assert_eq((select client_name from public.provider_clients where provider_id = '${otherProvider}'), 'Theirs');
  `));

  it("lets a deleted person return only by booking again", () => check(`
    select pg_temp.book('${provider}', 'Ana', 'ana@example.com', '', '2030-01-01');
    delete from public.provider_clients where provider_id = '${provider}';
    select pg_temp.assert_eq((select count(*)::text from public.provider_clients where provider_id = '${provider}'), '0');
    select pg_temp.book('${provider}', 'Ana', 'ana@example.com', '', '2030-01-02');
    select pg_temp.assert_eq((select booking_count::text from public.provider_clients where provider_id = '${provider}'), '1');
  `));

  it("refuses direct writes by an owner, so the list only says what bookings said", () => check(`
    select pg_temp.book('${provider}', 'Ana', 'ana@example.com', '', '2030-01-01');
    select pg_temp.act_as('${owner}');
    do $$ begin
      begin
        update public.provider_clients set client_name = 'Forged';
        raise exception 'update was allowed';
      exception when insufficient_privilege then null; end;
      begin
        insert into public.provider_clients (provider_id, client_name, client_email, first_booked_at, last_booked_at)
        values ('${provider}', 'Forged', 'forged@example.com', now(), now());
        raise exception 'insert was allowed';
      exception when insufficient_privilege then null; end;
    end $$;
  `));

  it("gives a signed-out visitor no access at all", () => check(`
    select pg_temp.book('${provider}', 'Ana', 'ana@example.com', '', '2030-01-01');
    set local role anon;
    do $$ begin
      perform 1 from public.provider_clients;
      raise exception 'anon could read';
    exception when insufficient_privilege then null; end $$;
  `));

  it("is removed with the provider's account", () => check(`
    select pg_temp.book('${provider}', 'Ana', 'ana@example.com', '', '2030-01-01');
    delete from auth.users where id = '${owner}';
    select pg_temp.assert_eq((select count(*)::text from public.provider_clients where provider_id = '${provider}'), '0');
  `));

  it("backfills from the bookings already held when the migration runs", () => check(`
    select pg_temp.book('${provider}', 'Old Name', 'ana@example.com', '555', '2030-01-01');
    select pg_temp.book('${provider}', 'Ana Peña', ' ANA@example.com', '', '2030-01-02');
    select pg_temp.book('${provider}', 'Leo', 'leo@example.com', '', '2030-01-03');
    select pg_temp.book('${otherProvider}', 'Ana Elsewhere', 'ana@example.com', '777', '2030-01-04');
    -- Back to the state before this migration, then the real file.
    update public.bookings set created_at = now() - interval '2 days' where client_name = 'Old Name';
    drop trigger bookings_record_provider_client on public.bookings;
    drop function private.record_provider_client();
    drop table public.provider_clients;
    \\i ${resolve(process.cwd(), "supabase/migrations/20261103200000_add_provider_clients.sql")}
    select pg_temp.assert_eq((select count(*)::text from public.provider_clients where provider_id = '${provider}'), '2');
    select pg_temp.assert_eq(
      (select client_name || '|' || client_email || '|' || client_phone || '|' || booking_count
        from public.provider_clients where provider_id = '${provider}' and email_key = 'ana@example.com'),
      'Ana Peña|ANA@example.com|555|2');
    select pg_temp.assert_eq(
      (select (first_booked_at < last_booked_at)::text
        from public.provider_clients where provider_id = '${provider}' and email_key = 'ana@example.com'),
      'true');
    select pg_temp.assert_eq(
      (select client_phone from public.provider_clients where provider_id = '${otherProvider}'), '777');
  `));

  it("leaves no record when the booking is rolled back", () => check(`
    savepoint before_booking;
    select pg_temp.book('${provider}', 'Ana', 'ana@example.com', '', '2030-01-01');
    rollback to savepoint before_booking;
    select pg_temp.assert_eq((select count(*)::text from public.provider_clients where provider_id = '${provider}'), '0');
  `));
});
