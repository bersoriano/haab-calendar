-- Public scheduling only needs the boolean. Bank identifiers stay in the
-- checkout response, shown after the visitor chooses a service and date.
create or replace view public.public_services
with (security_invoker = true)
as
select
  s.id, s.provider_id, s.name, s.slug, s.booking_type, s.duration_minutes,
  s.description, s.medical_specialty, s.capacity, s.cost, s.notes, s.sort_order,
  s.occurrence_mode, s.occurrence_date, s.weekdays, s.start_time, s.end_time,
  s.max_spots, s.location_prices, s.linked_address_1, s.linked_address_2,
  s.linked_phone_1, s.linked_phone_2, s.custom_address, s.custom_phone,
  s.capacity_scope, s.max_party_size, s.photo_urls, s.cancellation_policy,
  s.min_group_size, s.traveler_fields, s.deposit_required
from public.services s
join public.providers p on p.id = s.provider_id
where p.setup_complete = true
  and (select private.publication_enabled(p.owner_user_id));

grant select on public.public_services to anon, authenticated;
