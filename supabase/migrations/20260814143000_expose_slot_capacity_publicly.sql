-- The public booking page reads services through the `public_services` view,
-- not the table, so the columns added by 20260814120000 are invisible to it
-- until the view is recreated. Without this, a restaurant's page loads its
-- services with no capacity scope, which makes the client treat each seating as
-- one exclusive slot and hides the party-size field.
--
-- Recreated from 20260723062343 with the two new columns appended. They go last
-- because `create or replace view` can only add columns at the end — inserting
-- them beside max_spots, where they belong logically, would need a drop, which
-- would take the grants with it. Callers select by name, so order is immaterial.

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
  s.sort_order,
  s.occurrence_mode,
  s.occurrence_date,
  s.weekdays,
  s.start_time,
  s.end_time,
  s.max_spots,
  s.location_prices,
  s.linked_address_1,
  s.linked_address_2,
  s.linked_phone_1,
  s.linked_phone_2,
  s.custom_address,
  s.custom_phone,
  s.capacity_scope,
  s.max_party_size
from public.services s
join public.providers p on p.id = s.provider_id
where p.setup_complete = true
  and (select private.publication_enabled(p.owner_user_id));

grant select on public.public_services to anon, authenticated;
