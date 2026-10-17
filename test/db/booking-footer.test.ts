import { execFileSync } from "node:child_process";
import { describe, it } from "vitest";
import { assertLocalSupabase } from "@/test/db/local-client";

const databaseUrl = assertLocalSupabase(process.env.FOOTER_TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
const provider = "00000000-0000-4000-8000-00000000bf01";
const owner = "00000000-0000-4000-8000-00000000bf02";
function check(sql: string) {
  execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-q"], {
    input: `begin;
      insert into auth.users (id, email) values ('${owner}', 'footer@example.invalid');
      insert into public.providers (id, owner_user_id, full_name, business_name, email, vertical, timezone, availability, setup_complete)
      values ('${provider}', '${owner}', 'Footer Owner', 'Footer Test', 'footer@example.invalid', 'professional', 'UTC', '{}', true);
      select set_config('request.jwt.claim.sub', '${owner}', true);
      ${sql} rollback;`, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
  });
}

describe("booking footer database access", () => {
  it("rejects direct customization by free owners and permits Premium owners", () => check(`
    set local role authenticated;
    do $$ begin
      begin
        update public.providers set public_footer_text = 'Acme' where id = '${provider}';
        raise exception 'Free customization succeeded';
      exception when insufficient_privilege then null; end;
    end $$;
    reset role;
    update public.providers set plan_tier = 'premium' where id = '${provider}';
    set local role authenticated;
    update public.providers set public_footer_text = 'Acme', public_footer_url = 'https://acme.example' where id = '${provider}';
    reset role;
    set local role anon;
    do $$ begin
      if (select public_footer_text from public.public_providers where id = '${provider}') is distinct from 'Acme' then raise exception 'Custom footer not public'; end if;
    end $$;
  `));

  it("restores defaults after billing downgrade while allowing unrelated profile saves", () => check(`
    update public.providers set plan_tier = 'premium', public_footer_text = 'Acme' where id = '${provider}';
    insert into public.provider_billing_subscriptions (provider_id, stripe_subscription_id, status, plan_tier, last_event_id, last_event_created_at)
      values ('${provider}', 'sub_footer_local', 'canceled', 'free', 'evt_footer', now());
    set local role anon;
    do $$ begin
      if (select public_footer_text from public.public_providers where id = '${provider}') is not null then raise exception 'Downgraded footer still customized'; end if;
    end $$;
    reset role;
    set local role authenticated;
    update public.providers set business_name = 'Renamed', public_footer_text = 'Acme' where id = '${provider}';
    update public.providers set public_footer_text = null, public_footer_url = null where id = '${provider}';
  `));

  it("honors grants, revocations, and expired overrides on public reads", () => check(`
    insert into public.provider_feature_overrides (provider_id, feature_key, enabled, reason)
      values ('${provider}', 'custom_booking_footer', true, 'Footer test');
    set local role authenticated;
    update public.providers set public_footer_text = 'Granted' where id = '${provider}';
    reset role;
    update public.provider_feature_overrides set expires_at = now() where provider_id = '${provider}';
    set local role anon;
    do $$ begin
      if (select public_footer_text from public.public_providers where id = '${provider}') is not null then raise exception 'Expired grant still active'; end if;
    end $$;
    reset role;
    update public.providers set plan_tier = 'premium' where id = '${provider}';
    update public.provider_feature_overrides set enabled = false, expires_at = null where provider_id = '${provider}';
    set local role anon;
    do $$ begin
      if (select public_footer_text from public.public_providers where id = '${provider}') is not null then raise exception 'Revocation ignored'; end if;
    end $$;
  `));

  it("rejects executable URLs and keeps unpublished pages private", () => check(`
    update public.providers set plan_tier = 'premium' where id = '${provider}';
    set local role authenticated;
    do $$ begin
      begin
        update public.providers set public_footer_url = 'javascript:alert(1)' where id = '${provider}';
        raise exception 'Unsafe link accepted';
      exception when check_violation then null; end;
    end $$;
    reset role;
    update public.providers set setup_complete = false where id = '${provider}';
    set local role anon;
    do $$ begin
      if exists (select 1 from public.public_providers where id = '${provider}') then raise exception 'Unpublished provider exposed'; end if;
    end $$;
  `));
});
