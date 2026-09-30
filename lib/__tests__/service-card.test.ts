import { describe, expect, it } from "vitest";

import {
  formatCapacityChip,
  getServiceCardCta,
  getServiceContact,
  resolveSharedServiceContact,
} from "../service-card";
import type { ProviderInfo, Service } from "../types";
import { getVerticalCopy } from "../vertical-copy";

const provider = {
  address1: "245 West 29th Street",
  address2: "9 Side Street",
  phoneNumber1: "+1 212 555 0142",
  phoneNumber2: "",
};

const base: Service = {
  id: "s",
  name: "Consult",
  bookingType: "appointment",
  description: "",
};

const linked: Service = { ...base, linkedAddress1: true, linkedPhone1: true };

describe("getServiceContact", () => {
  it("returns what the service links, skipping blanks", () => {
    expect(
      getServiceContact({ ...linked, linkedPhone2: true }, provider as ProviderInfo),
    ).toEqual({ addresses: ["245 West 29th Street"], phones: ["+1 212 555 0142"] });
  });

  it("adds custom entries and drops duplicates", () => {
    const contact = getServiceContact(
      { ...linked, customAddress: " 245 West 29th Street ", customPhone: "+1 999" },
      provider as ProviderInfo,
    );

    expect(contact.addresses).toEqual(["245 West 29th Street"]);
    expect(contact.phones).toEqual(["+1 212 555 0142", "+1 999"]);
  });

  it("is empty for a service linked to nothing", () => {
    expect(getServiceContact(base, provider as ProviderInfo)).toEqual({
      addresses: [],
      phones: [],
    });
  });
});

describe("resolveSharedServiceContact", () => {
  it("returns the block when every service agrees", () => {
    expect(
      resolveSharedServiceContact([linked, { ...linked, id: "b" }], provider as ProviderInfo),
    ).toEqual({ addresses: ["245 West 29th Street"], phones: ["+1 212 555 0142"] });
  });

  it("ignores the order the entries were linked in", () => {
    const a = { ...linked, linkedAddress2: true };
    const b = { ...a, id: "b", linkedAddress1: false, customAddress: "245 West 29th Street" };

    expect(resolveSharedServiceContact([a, b], provider as ProviderInfo)).not.toBeNull();
  });

  it("is null when one service differs", () => {
    expect(
      resolveSharedServiceContact(
        [linked, { ...linked, id: "b", linkedAddress2: true }],
        provider as ProviderInfo,
      ),
    ).toBeNull();
  });

  it("is null when only some services have contact info", () => {
    expect(
      resolveSharedServiceContact([linked, { ...base, id: "b" }], provider as ProviderInfo),
    ).toBeNull();
  });

  it("is null when nobody has contact info, and for an empty list", () => {
    expect(resolveSharedServiceContact([base], provider as ProviderInfo)).toBeNull();
    expect(resolveSharedServiceContact([], provider as ProviderInfo)).toBeNull();
  });

  it("treats a single service as shared with itself", () => {
    expect(resolveSharedServiceContact([linked], provider as ProviderInfo)).not.toBeNull();
  });
});

describe("formatCapacityChip", () => {
  const health = getVerticalCopy("healthcare", "en");
  const events = getVerticalCopy("events", "en");

  it("shows free-text capacity as written", () => {
    expect(
      formatCapacityChip({ ...base, capacity: "Up to 4 players" }, "spaces", health, "en"),
    ).toBe("Up to 4 players");
  });

  it("gives a bare number the vertical's client word", () => {
    expect(formatCapacityChip({ ...base, capacity: "1" }, "healthcare", health, "en")).toBe(
      "1 patient",
    );
    expect(formatCapacityChip({ ...base, capacity: "3" }, "healthcare", health, "en")).toBe(
      "3 patients",
    );
  });

  it("states the spots cap for events, in the page language", () => {
    const service = { ...base, maxSpots: 18, capacity: "18 attendees" };

    expect(formatCapacityChip(service, "events", events, "en")).toBe("Up to 18 spots");
    expect(formatCapacityChip(service, "events", getVerticalCopy("events", "es"), "es")).toBe(
      "Hasta 18 lugares",
    );
  });

  it("does not read a restaurant's table count as guests", () => {
    expect(
      formatCapacityChip({ ...base, maxSpots: 6 }, "restaurant", health, "en"),
    ).toBeNull();
  });

  it("is null when there is nothing to say", () => {
    expect(formatCapacityChip(base, "healthcare", health, "en")).toBeNull();
    expect(formatCapacityChip({ ...base, capacity: "  " }, "healthcare", health, "en")).toBeNull();
  });
});

describe("getServiceCardCta", () => {
  const labels = { selectADate: "Date", selectADay: "Day", selectATime: "Time" };

  it("asks events for a date, even when one is full-day", () => {
    expect(getServiceCardCta(base, "events", labels)).toBe("Date");
    expect(getServiceCardCta({ ...base, bookingType: "full-day" }, "events", labels)).toBe("Date");
  });

  it("asks a full-day booking for a day", () => {
    expect(getServiceCardCta({ ...base, bookingType: "full-day" }, "spaces", labels)).toBe("Day");
  });

  it("asks everything else for a time", () => {
    expect(getServiceCardCta(base, "healthcare", labels)).toBe("Time");
    expect(getServiceCardCta(base, undefined, labels)).toBe("Time");
  });
});
