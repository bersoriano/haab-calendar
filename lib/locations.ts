import type { LocationKey, ProviderInfo, Service } from "./types";

export type ServiceLocation = {
  key: LocationKey;
  address: string;
  price: string;
};

// The locations a service is offered at — only the linked provider addresses
// plus a non-empty custom address. Each carries its effective price
// (per-location override, falling back to the service's base cost).
export function getServiceLocations(
  service: Service,
  provider: Pick<ProviderInfo, "address1" | "address2">,
): ServiceLocation[] {
  const base = service.cost ?? "";
  const priceFor = (key: LocationKey) => service.locationPrices?.[key]?.trim() || base;
  const locations: ServiceLocation[] = [];

  if (service.linkedAddress1 && provider.address1?.trim()) {
    locations.push({ key: "address1", address: provider.address1.trim(), price: priceFor("address1") });
  }
  if (service.linkedAddress2 && provider.address2?.trim()) {
    locations.push({ key: "address2", address: provider.address2.trim(), price: priceFor("address2") });
  }
  if (service.customAddress?.trim()) {
    locations.push({ key: "custom", address: service.customAddress.trim(), price: priceFor("custom") });
  }

  return locations;
}

// Effective price string for a service at the given location: the per-location
// override when present, otherwise the base cost.
export function getEffectiveCost(service: Service, locationKey?: LocationKey): string {
  const base = service.cost ?? "";
  if (!locationKey) return base;
  return service.locationPrices?.[locationKey]?.trim() || base;
}
