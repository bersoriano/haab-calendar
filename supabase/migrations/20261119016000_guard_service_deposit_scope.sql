-- RLS lets owners edit their services directly, so enforce the same scope as
-- the settings API before a deposit-required service can become unbookable.
create or replace function private.guard_service_deposit_scope()
returns trigger language plpgsql security definer set search_path = '' as $$
declare provider_row public.providers%rowtype; account_row public.business_bank_accounts%rowtype;
begin
  if not new.deposit_required then return new; end if;
  select * into provider_row from public.providers where id = new.provider_id;
  select * into account_row from public.business_bank_accounts where provider_id = new.provider_id;
  if provider_row.vertical not in ('spaces', 'professional', 'events')
     or (provider_row.vertical = 'events' and provider_row.rsvp_mode = 'invitations')
     or account_row.provider_id is null or not account_row.enabled
     or account_row.currency_code <> new.deposit_currency_code then
    raise exception 'Bank deposits are unavailable for this service or bank account.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_service_deposit_scope() from public, anon, authenticated;
create trigger services_guard_deposit_scope
  before insert or update of deposit_required, deposit_amount_minor, deposit_currency_code, provider_id
  on public.services for each row execute function private.guard_service_deposit_scope();

create or replace function private.guard_bank_account_deposit_scope()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (not new.enabled or new.currency_code <> old.currency_code)
     and exists (select 1 from public.services
                 where provider_id = new.provider_id and deposit_required) then
    raise exception 'Disable service deposits before changing bank availability or currency.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_bank_account_deposit_scope() from public, anon, authenticated;
create trigger business_bank_accounts_guard_deposit_scope
  before update of enabled, currency_code on public.business_bank_accounts
  for each row execute function private.guard_bank_account_deposit_scope();

-- Settings uses upsert/disable; provider deletion still cascades through the FK.
revoke delete on public.business_bank_accounts from authenticated;
drop policy "Owner can delete bank account" on public.business_bank_accounts;

create or replace function private.guard_provider_deposit_scope()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.services
             where provider_id = new.id and deposit_required)
     and (new.vertical not in ('spaces', 'professional', 'events')
          or (new.vertical = 'events' and new.rsvp_mode = 'invitations')) then
    raise exception 'Disable service deposits before changing business type.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_provider_deposit_scope() from public, anon, authenticated;
create trigger providers_guard_deposit_scope
  before update of vertical, rsvp_mode on public.providers
  for each row execute function private.guard_provider_deposit_scope();
