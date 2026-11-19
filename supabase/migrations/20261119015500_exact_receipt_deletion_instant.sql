-- The audit cutoff is a business-local date. Store its exact instant so a
-- global UTC cleanup cannot delete a receipt a day early in western zones.
alter table public.payment_requests add column delete_at timestamptz;

update public.payment_requests r
set delete_at = r.delete_after::timestamp at time zone p.timezone
from public.providers p
where p.id = r.provider_id;

alter table public.payment_requests alter column delete_at set not null;
create index payment_requests_delete_at_idx on public.payment_requests(delete_at);

create or replace function private.set_payment_request_delete_after()
returns trigger language plpgsql set search_path = '' as $$
declare resolution_date date; provider_timezone text;
begin
  select p.timezone into provider_timezone from public.providers p where p.id = new.provider_id;
  if new.resolved_at is not null then
    resolution_date := (new.resolved_at at time zone provider_timezone)::date;
  end if;
  new.delete_after := (greatest(new.service_date, coalesce(resolution_date, new.service_date))
                       + interval '1 year')::date;
  new.delete_at := new.delete_after::timestamp at time zone provider_timezone;
  return new;
end;
$$;
