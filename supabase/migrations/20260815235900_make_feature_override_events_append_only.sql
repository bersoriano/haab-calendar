-- Make the feature-override audit trail actually append-only.
--
-- The table was created with `grant select, insert ... to service_role` and a
-- revoke aimed at public, anon, and authenticated. That was not enough: this
-- project's default privileges on the public schema grant ALL to service_role
-- at creation time, so the narrower grant added nothing and the role kept
-- update, delete, and truncate. Verified against the remote database — a
-- service-role session could rewrite a reason and delete every event.
--
-- Both halves are needed. The revoke removes the privilege; the triggers
-- enforce the rule against any role that still holds it, including the table
-- owner, so "history cannot be tidied up" is a property of the table rather
-- than of who happens to be connected.

revoke update, delete, truncate on table public.provider_feature_override_events
  from service_role;

create or replace function private.reject_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Audit rows are append-only: % is not allowed on %.',
    tg_op, tg_table_name
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists provider_feature_override_events_no_update
  on public.provider_feature_override_events;
create trigger provider_feature_override_events_no_update
  before update or delete on public.provider_feature_override_events
  for each row
  execute function private.reject_audit_mutation();

-- Row triggers never fire for TRUNCATE, so it needs its own statement trigger.
drop trigger if exists provider_feature_override_events_no_truncate
  on public.provider_feature_override_events;
create trigger provider_feature_override_events_no_truncate
  before truncate on public.provider_feature_override_events
  for each statement
  execute function private.reject_audit_mutation();
