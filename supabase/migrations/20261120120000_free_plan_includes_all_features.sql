-- Every feature shipped so far is on every plan, free included
-- (lib/entitlements/catalog.ts). The two gates the database enforces itself,
-- one-year booking history and the custom booking footer, follow suit: the plan
-- baseline is now "allowed" whatever the tier, and an active override still
-- decides first, so support can turn either off for one account.
--
-- Signatures are unchanged, so the triggers, the public footer read and the
-- retention purge that call these functions pick up the new answer as is.
-- Nothing is deleted by this migration. The purge keeps one year of history for
-- more providers than before, never fewer.

create or replace function private.booking_history_entitled(
  p_provider_id uuid,
  p_legacy_plan text,
  p_now timestamptz
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (select o.enabled from public.provider_feature_overrides o
      where o.provider_id = p_provider_id
        and o.feature_key = 'booking_history_retention'
        and (o.expires_at is null or o.expires_at > p_now)),
    true
  );
$$;

create or replace function private.booking_footer_entitled(
  p_provider_id uuid,
  p_legacy_plan text,
  p_now timestamptz
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (select o.enabled from public.provider_feature_overrides o
      where o.provider_id = p_provider_id
        and o.feature_key = 'custom_booking_footer'
        and (o.expires_at is null or o.expires_at > p_now)),
    true
  );
$$;
