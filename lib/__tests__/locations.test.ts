import { describe, it, expect } from "vitest";
import { getServiceLocations, getEffectiveCost } from "@/lib/locations";
import type { ProviderInfo, Service } from "@/lib/types";

const provider = {
  address1: "Clinic CDMX",
  address2: "Clinic Chalco",
} as Pick<ProviderInfo, "address1" | "address2">;

const base: Service = {
  id: "s1",
  name: "Visit",
  bookingType: "appointment",
  description: "",
  cost: "$100",
};

describe("getServiceLocations", () => {
  it("returns only linked locations with their addresses", () => {
    const svc: Service = { ...base, linkedAddress1: true, linkedAddress2: true };
    const locs = getServiceLocations(svc, provider);
    expect(locs.map((l) => l.key)).toEqual(["address1", "address2"]);
    expect(locs.map((l) => l.address)).toEqual(["Clinic CDMX", "Clinic Chalco"]);
  });

  it("uses the per-location override price, falling back to base cost", () => {
    const svc: Service = {
      ...base,
      linkedAddress1: true,
      linkedAddress2: true,
      locationPrices: { address2: "$75" },
    };
    const locs = getServiceLocations(svc, provider);
    expect(locs.find((l) => l.key === "address1")?.price).toBe("$100"); // base
    expect(locs.find((l) => l.key === "address2")?.price).toBe("$75"); // override
  });

  it("excludes an unlinked address and a blank provider address", () => {
    const svc: Service = { ...base, linkedAddress1: false, linkedAddress2: true };
    const locs = getServiceLocations(svc, { address1: "", address2: "" });
    expect(locs).toEqual([]);
  });

  it("includes a non-empty custom address", () => {
    const svc: Service = { ...base, customAddress: "Pop-up clinic", locationPrices: { custom: "$60" } };
    const locs = getServiceLocations(svc, provider);
    expect(locs).toEqual([{ key: "custom", address: "Pop-up clinic", price: "$60" }]);
  });
});

describe("getEffectiveCost", () => {
  it("returns base cost with no location key", () => {
    expect(getEffectiveCost(base)).toBe("$100");
  });

  it("returns the override for a keyed location", () => {
    expect(getEffectiveCost({ ...base, locationPrices: { address2: "$75" } }, "address2")).toBe("$75");
  });

  it("falls back to base when the location has no override", () => {
    expect(getEffectiveCost({ ...base, locationPrices: { address2: "$75" } }, "address1")).toBe("$100");
  });
});
