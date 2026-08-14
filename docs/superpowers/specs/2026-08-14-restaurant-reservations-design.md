# Restaurant reservations

Date: 2026-08-14

Adds a fifth vertical whose services hand out a fixed number of tables at each
seating, rather than one exclusive slot per booking.

Hotel accommodation was raised alongside this and is deliberately out of scope:
a stay is a date range, a booking carries one `date`, and the two features share
no code beyond the availability module. It gets its own design.

## The model

A restaurant sells **tables per seating**. The owner sets how many tables exist
at each slot and, optionally, the largest party a table takes. Every party
consumes exactly one table regardless of size.

Two consequences follow, and they are what keep the change small:

- Party size never enters the capacity arithmetic, so the guest can state it
  after picking a time. No new step in the public flow.
- Seatings stay on the existing slot grid. A 90-minute dinner service on a
  19:00–22:30 day offers 19:00, 20:30 and 22:00, each with its own table count.
  Rolling 15-minute starts with overlapping 90-minute turns were considered and
  rejected: they require interval-overlap counting in both the app and the
  Postgres constraint, which is a much larger change than this one.

The lunch/dinner gap is modelled as a blocked window on the day, which the
availability editor already supports.

## Data model

One migration, additive, safe to apply before the app ships.

- `services.capacity_scope` — `text not null default 'date'`, checked against
  `('date','slot')`. Existing rows keep `'date'`, which is today's behavior:
  `max_spots` is capacity for the whole date. Restaurant services set `'slot'`,
  and `max_spots` becomes tables available at each seating. One counter and a
  scope flag, rather than a second capacity column that would drift from the
  first.
- `services.max_party_size` — `integer`, nullable. Null means no cap. Only
  meaningful when scope is `'slot'`.
- `'restaurant'` added to both `vertical` check constraints, in `providers` and
  in the slug table (`20260611150930_url_management_hierarchy.sql`, lines 23 and
  84).

Party size is stored in the existing `bookings.details` payload as
`{"partySize": 4}` with `details_schema_key = 'restaurant'`. That payload exists
for per-vertical fields, and because party size never affects capacity, nothing
needs to constrain or index it. The cost is that the max-party-size cap is
enforced in `validateSelection` rather than by the database, alongside the
date-window and slot-availability checks already there.

### Triggers

`set_shared_capacity_mode` reads `p.vertical = 'events' and s.max_spots is not
null`. It becomes `p.vertical in ('events','restaurant')`. Restaurant bookings
thereby join the shared-capacity class, and the GiST overlap constraint stops
applying to them — which is what lets twelve parties hold 19:00.

`enforce_shared_booking_capacity` and `enforce_shared_hold_capacity` count
occupancy per `(service_id, date)`. They gain `and (capacity_scope = 'date' or
start_time = new.start_time)`. For events this is a no-op, since a single or
weekly occurrence has one window per date, so existing rows cannot be
invalidated.

## Availability rules

`BookingRecord` gains `sharedCapacity`, read from the `allows_shared_capacity`
column that already exists on the row and is currently ignored by the app. It is
what lets availability tell an exclusive booking from a capacity-bearing one.

1. **Only exclusive bookings block.** Occupancy checks require
   `sharedCapacity === false`. This mirrors the database, where shared rows are
   omitted from the GiST index and so neither conflict nor cause conflicts. A
   restaurant can therefore run "Dinner table" and "Private dining room" as
   independent inventories. `isEventWindowTaken` narrows accordingly: an
   exclusive booking across an event's window still closes it, another shared
   booking no longer does.
2. **Capacity counts per slot when scope is `'slot'`.** `getSpotsLeft` takes an
   optional slot start time. Under `'date'` it ignores it and behaves as today;
   under `'slot'` it counts only bookings and holds whose `startTime` matches.
   Holds already count against capacity and keep doing so.
3. **Slot generation.** The appointment path in `getAvailableSlots` gains one
   branch for capacity-bearing services: same-service occupants decrement the
   slot instead of removing it, the slot survives while `getSpotsLeft(slot) > 0`,
   and exclusive other-service occupants still remove it. Blocked windows,
   full-day bookings and elapsed-time rules are untouched.
4. **Calendar shading.** `getDayAvailability`'s appointment branch measures a
   capacity service in tables rather than slots: capacity is grid slots ×
   `max_spots`, free is remaining tables summed across slots. A night with one
   table left on each of three seatings reads as tight, not open.

Reschedule needs no new logic: it already passes `ignoredBookingId`, so a party
moving from 19:00 to 20:30 releases its table at the origin slot.

## The vertical

`'restaurant'` joins `VERTICAL_IDS`, takes the public segment `restaurants` with
its reverse mapping in `lib/public-url.ts`, and gets a preset in
`config/verticals.ts`: a "Dinner table" service at 90 minutes with 12 tables and
evening-weighted hours, plus its Spanish content.

A full `VerticalCopy` block in both languages is the largest mechanical part of
the work. The nouns: service → *table* / *mesa*, booking → *reservation* /
*reserva*, client → *guest* / *comensal*, `bookVerb` → *reserve* / *reservar*,
`spotsLeftSuffix` → *tables left* / *mesas disponibles*, `fullyBookedLabel` →
*Fully booked* / *Sin mesas*. `chooseAnotherService` is written per vertical
because Spanish articles must agree, and *mesa* is the first feminine noun in
the set — "elige otra mesa" — which is exactly the hazard that phrase was split
out to prevent.

## Interface

The guest states party size on step 3, the details step, beside name and email.
No change to `booking-flow-machine.ts`. The service card on step 1 shows the cap,
so a large party learns the limit before investing in the flow.

`ServiceEditor` gates its numeric capacity field on `isEvents` today and hides
the free-text `capacity` field for events. Restaurant follows the same shape:
free-text capacity hidden, `maxSpots` shown but labelled "Tables per seating",
and a new "Max party size" field beside it. Labels are vertical-aware, so events
keeps its wording.

Party size reads from `details.partySize` in the owner's booking list and detail
view, the guest's `ManageBookingPanel`, and `BookingPass`. The ICS description
carries it too: "Dinner table — 4 guests" is what the owner reads at service
time.

## Failure modes

`isCapacityViolation` (`lib/supabase/bookings.ts`) identifies a full-capacity
rejection by string-matching `"Event capacity is full"` on SQLSTATE 23514.
Making that message vertical-aware would silently break the match, so the raised
message stays a machine token: the trigger raises a stable `HAAB_CAPACITY_FULL`
prefix, the app matches the token, and the guest-facing sentence comes from
vertical copy. For one release the matcher also accepts the legacy string, so an
app deploy landing before the migration does not report capacity conflicts as
500s.

Availability is computed by the pure functions in `lib/availability.ts`, and
`useModuleStore` runs them against its shadow bookings, so per-slot capacity
works offline with no extra work. The triggers are the authority only on the
server path, which means an offline booking can still lose its table on sync —
the existing behavior for slot conflicts, handled by the flow machine's
`SELECTION_CONFLICT` event.

## Testing

Unit tests in `lib/__tests__/availability.test.ts`: independent counts at 19:00
and 20:30, the twelfth party taking the last table and the thirteenth refused,
holds counting against tables, an exclusive booking still closing a seating, a
shared booking no longer closing another shared service, and reschedule
releasing the origin slot. `validateSelection` tests for party size at the
boundaries and above the cap. The vertical-copy test's vertical list grows to
five, which forces both languages to be filled in.

No SQL triggers are tested anywhere in the repo, so the migration is verified by
seeding a restaurant demo and booking against it. That demo is also the honest
version of the case previously skipped as unrepresentable.

## Rollout

Migration first — additive, defaults preserve current behavior, and the trigger
change is a no-op for events — then the app.
