-- Booking conversions are recorded by the booking route, not the browser.
--
-- A browser beacon can be blocked by an ad blocker or lost when the tab closes,
-- and every lost one is a booking missing from the campaign that earned it. The
-- route that commits the booking now writes the `booking_confirmed` event in
-- the same request, carrying the campaign the page was opened with.
--
-- `booking_id` ties the event to the booking so a retried request (same
-- idempotency key, same booking) is counted once. Rows written by the browser
-- before this change have no booking id and remain valid history.

alter table public.public_page_events
  add column if not exists booking_id uuid references public.bookings(id) on delete set null;

-- Not a partial index: NULLs are distinct, so the many rows without a booking
-- never collide, and a plain unique index is one the insert can rely on.
create unique index if not exists public_page_events_booking_id_key
  on public.public_page_events(booking_id);
