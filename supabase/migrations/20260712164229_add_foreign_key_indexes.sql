create index if not exists providers_owner_user_id_idx
  on public.providers(owner_user_id);

create index if not exists bookings_service_id_idx
  on public.bookings(service_id);

create index if not exists booking_holds_service_id_idx
  on public.booking_holds(service_id);
