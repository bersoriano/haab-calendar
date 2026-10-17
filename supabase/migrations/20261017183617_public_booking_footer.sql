-- Null preferences preserve the standard Haab attribution on existing pages.
alter table public.providers
  add column public_footer_text text check (public_footer_text is null or length(public_footer_text) between 1 and 200),
  add column public_footer_url text check (
    public_footer_url is null or (
      length(public_footer_url) <= 2048
      and public_footer_url ~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$'
    )
  );

grant insert (public_footer_text, public_footer_url), update (public_footer_text, public_footer_url)
  on public.providers to authenticated;

-- Match application entitlement precedence: active override, billing, legacy plan.
create function private.booking_footer_entitled(p_provider_id uuid, p_legacy_plan text, p_now timestamptz)
returns boolean language sql stable security invoker set search_path = '' as $$
  select coalesce(
    (select o.enabled from public.provider_feature_overrides o
      where o.provider_id = p_provider_id and o.feature_key = 'custom_booking_footer'
        and (o.expires_at is null or o.expires_at > p_now)),
    coalesce((select b.plan_tier from public.provider_billing_subscriptions b
      where b.provider_id = p_provider_id), p_legacy_plan, 'free') = 'premium'
  );
$$;
revoke all on function private.booking_footer_entitled(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function private.booking_footer_entitled(uuid, text, timestamptz) to service_role;

-- Runs only as a trigger on an RLS-authorized owner write. Protected billing
-- reads require definer rights; this function is not an exposed RPC.
create function private.validate_booking_footer_preference()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.public_footer_text is not null or new.public_footer_url is not null then
    if tg_op = 'INSERT' or new.public_footer_text is distinct from old.public_footer_text
      or new.public_footer_url is distinct from old.public_footer_url then
      if not private.booking_footer_entitled(new.id, new.plan_tier, statement_timestamp()) then
        raise exception 'Custom booking footer requires Premium access.' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_booking_footer_preference() from public, anon, authenticated;
create trigger providers_validate_booking_footer_preference
  before insert or update of public_footer_text, public_footer_url on public.providers
  for each row execute function private.validate_booking_footer_preference();

-- Deliberately public output, scoped to published pages. No plan, billing,
-- ownership, or override records are exposed to anonymous readers. Rechecking
-- on every read restores Haab attribution immediately after access expires.
create function private.public_booking_footer(p_provider_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('text', p.public_footer_text, 'url', p.public_footer_url)
  from public.providers p
  where p.id = p_provider_id and p.setup_complete
    and private.publication_enabled(p.owner_user_id)
    and private.booking_footer_entitled(p.id, p.plan_tier, statement_timestamp());
$$;
revoke all on function private.public_booking_footer(uuid) from public;
grant execute on function private.public_booking_footer(uuid) to anon, authenticated, service_role;

-- Preserve existing view column order. RLS continues to decide page visibility.
create or replace view public.public_providers with (security_invoker = true) as
select p.id, p.full_name, p.business_name, p.slug, p.vertical, p.language,
  p.timezone, p.booking_window_days, p.availability, p.phone_number_1,
  p.phone_number_2, p.address_1, p.address_2, p.header_image_url, p.hero_text,
  p.gallery_image_urls, p.logo_image_url, p.public_theme, p.max_bookings_per_day,
  private.public_booking_footer(p.id)->>'text' as public_footer_text,
  private.public_booking_footer(p.id)->>'url' as public_footer_url
from public.providers p
where p.setup_complete = true and (select private.publication_enabled(p.owner_user_id));

grant select on public.public_providers to anon, authenticated;
