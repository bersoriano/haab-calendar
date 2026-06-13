alter table public.services
  add column if not exists medical_specialty text;

grant select (
  id,
  provider_id,
  name,
  slug,
  booking_type,
  duration_minutes,
  description,
  medical_specialty,
  capacity,
  cost,
  notes,
  sort_order
) on public.services to anon;

create or replace view public.public_services
with (security_invoker = true)
as
select
  s.id,
  s.provider_id,
  s.name,
  s.slug,
  s.booking_type,
  s.duration_minutes,
  s.description,
  s.medical_specialty,
  s.capacity,
  s.cost,
  s.notes,
  s.sort_order
from public.services s
join public.providers p on p.id = s.provider_id
where p.setup_complete = true;

grant select on public.public_services to anon, authenticated;
