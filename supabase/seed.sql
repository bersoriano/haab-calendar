-- Development seed data for the first backend checkpoint.
--
-- Create a Supabase Auth user with this email first, then run the seed.
-- If the user does not exist, this file is a no-op.

with dev_user as (
  select id, email
  from auth.users
  where email = 'dev-provider@example.com'
  limit 1
),
upsert_provider as (
  insert into public.providers (
    owner_user_id,
    full_name,
    business_name,
    email,
    vertical,
    slug,
    timezone,
    booking_window_days,
    availability,
    setup_complete
  )
  select
    id,
    'Dev Provider',
    'Haab Demo Studio',
    email,
    'professional',
    'haab-demo-studio',
    'Asia/Kuala_Lumpur',
    60,
    '{
      "sunday": {"enabled": false, "startTime": "09:00", "endTime": "17:00"},
      "monday": {"enabled": true, "startTime": "09:00", "endTime": "17:00"},
      "tuesday": {"enabled": true, "startTime": "09:00", "endTime": "17:00"},
      "wednesday": {"enabled": true, "startTime": "09:00", "endTime": "17:00"},
      "thursday": {"enabled": true, "startTime": "09:00", "endTime": "17:00"},
      "friday": {"enabled": true, "startTime": "09:00", "endTime": "17:00"},
      "saturday": {"enabled": false, "startTime": "09:00", "endTime": "17:00"}
    }'::jsonb,
    true
  from dev_user
  on conflict (vertical, slug) do update
    set
      owner_user_id = excluded.owner_user_id,
      full_name = excluded.full_name,
      business_name = excluded.business_name,
      email = excluded.email,
      timezone = excluded.timezone,
      booking_window_days = excluded.booking_window_days,
      availability = excluded.availability,
      setup_complete = excluded.setup_complete
  returning id
)
insert into public.services (
  provider_id,
  name,
  booking_type,
  duration_minutes,
  description,
  capacity,
  cost,
  notes,
  sort_order
)
select
  upsert_provider.id,
  name,
  booking_type,
  duration_minutes,
  description,
  capacity,
  cost,
  notes,
  sort_order
from upsert_provider
cross join (
  values
    (
      'New Patient Consultation',
      'appointment',
      30,
      'A focused first consultation for history, goals, and next steps.',
      '1 client',
      '$120 consult',
      '',
      10
    ),
    (
      'Court Rental',
      'appointment',
      60,
      'Reserve a court for training, matches, or private play.',
      'Max 4 players',
      '$40 per hour',
      '',
      20
    ),
    (
      'Banquet Hall Exclusive',
      'full-day',
      null,
      'Full-day venue reservation for events, receptions, and private functions.',
      'Fits up to 100 guests',
      'Full-day venue package',
      '',
      30
    )
) as seed_services(
  name,
  booking_type,
  duration_minutes,
  description,
  capacity,
  cost,
  notes,
  sort_order
)
on conflict (provider_id, name) do update
  set
    booking_type = excluded.booking_type,
    duration_minutes = excluded.duration_minutes,
    description = excluded.description,
    capacity = excluded.capacity,
    cost = excluded.cost,
    notes = excluded.notes,
    sort_order = excluded.sort_order;
