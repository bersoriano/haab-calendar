# Per-location pricing — design

Date: 2026-06-17
Status: approved (design)
Scope: all verticals. A service offered at more than one of the provider's
locations can charge a different price per location; the public booker picks the
location and sees/records the right price.

## Problem

A service links up to three locations (provider `address1`, `address2`, and a
per-service `customAddress`) but has a single free-text `cost`. Real providers
charge differently per site — e.g. the urologist whose State-of-Mexico clinic is
75% of the Mexico-City price. Today that's only expressible as free text in
`cost`, and the public flow never lets the patient choose a location.

## Decisions (locked via brainstorming)

1. **Per-location free-text price**, not a structured money type. `cost` stays
   the base/default string; per-location overrides are also strings. No
   migration; fits existing non-numeric costs ("Full-day package").
2. **Inline location selector on step 2** (date/time), shown only when a service
   has 2+ linked locations. Single/zero → auto-pick, no UI.
3. **Fallback to base `cost`** when a location has no override.
4. All verticals (the mechanism is generic over linked addresses).

## Data model (`lib/types.ts`) — additive

```ts
export type LocationKey = "address1" | "address2" | "custom";

// Service
locationPrices?: Partial<Record<LocationKey, string>>; // overrides; base = cost

// ServiceDraft (optional, so config seeds stay untouched)
locationPrices?: { address1: string; address2: string; custom: string };

// BookingRecord
location?: string; // chosen location's address text; cost = effective price

// BookingFlow
locationKey?: LocationKey; // current selection in the public flow
```

## Pure helpers (`lib/locations.ts`, new — testable)

```ts
type ServiceLocation = { key: LocationKey; address: string; price: string };

getServiceLocations(service, provider): ServiceLocation[];
// linked only: linkedAddress1 -> provider.address1, linkedAddress2 ->
// provider.address2, non-empty customAddress -> custom. Each entry's
// price = service.locationPrices?.[key] || service.cost || "".

getEffectiveCost(service, locationKey?): string;
// locationPrices?.[locationKey] || service.cost || ""
```

These are pure and unit-tested. The public flow and admin both consume them, so
the "which locations / what price" rule lives in one place.

## Admin — `ServiceEditor.tsx`

For each linked location (the existing Address-1 / Address-2 `LinkToggleCard`s
and the custom-address field), render a small **Price** input bound to
`serviceDraft.locationPrices[key]`, placeholder = base cost with helper "leave
blank to use the base price". Only shown for a location once it is linked /
the custom address is filled.

## Public flow — `components/haab-booking-module.tsx`

- Derive `locations = getServiceLocations(selectedService, provider)`.
- `locations.length >= 2`: render an **inline location selector** at the top of
  step 2 — a radio list of `"<address> — <price>"`. Default to the first;
  selecting sets `bookingFlow.locationKey`. `< 2`: no selector; auto-set
  `locationKey` to the single location's key (or leave undefined).
- The **Total** shown on steps 2/3 and the confirmation uses
  `getEffectiveCost(service, bookingFlow.locationKey)`.
- The chosen location's address is shown in the summary/confirmation (replacing
  the "show all linked addresses" behavior when a location is selected).
- On confirm, the booking record stores `location` = chosen address and `cost` =
  effective price.

## Store (`lib/store.ts`)

- `materializeVerticalServices` + `normalizeServices`: carry `locationPrices`
  (drop empty strings).
- `createBlankServiceDraft`: `locationPrices: { address1:"", address2:"", custom:"" }`.
- `beginEditingService`: map `service.locationPrices` into the draft.

## Testing

- `lib/__tests__/locations.test.ts`:
  - `getServiceLocations` lists only linked locations with correct addresses.
  - price = override when set, base `cost` when not.
  - custom address included when present.
  - `getEffectiveCost` returns override / base / "" correctly.
- Existing 164 tests stay green. Public render + selector are verified manually
  in the browser (urologist-style two-location service).

## Out of scope (YAGNI)

- Structured `{amount, currency}` money type / currency math (auto-percent).
- Per-location availability or capacity (a slot's capacity is shared; a provider
  being double-booked across locations is not enforced).
- More than the three existing location slots.

## Non-goals / invariants

- No behavior change for single-location services or those without overrides.
- Offline-first preserved; all additive to types/components.
