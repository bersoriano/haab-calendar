import { describe, expect, it } from "vitest";

import {
  MAX_TRAVELER_DETAIL_LENGTH,
  normalizeTravelerFields,
  parseTravelerDetails,
} from "@/lib/traveler-details";

describe("normalizeTravelerFields", () => {
  it("keeps known fields once, in the order the form asks them", () => {
    expect(normalizeTravelerFields(["diet", "shoe_size", "passport", "diet"])).toEqual([
      "passport",
      "diet",
    ]);
  });

  it("reads anything else as none", () => {
    expect(normalizeTravelerFields(null)).toEqual([]);
    expect(normalizeTravelerFields("passport")).toEqual([]);
  });
});

describe("parseTravelerDetails", () => {
  it("keeps only what the service asks for", () => {
    expect(
      parseTravelerDetails({ passport: " G123 ", diet: "Vegan", hotel_pickup: "Hotel Rio" }, [
        "passport",
        "diet",
      ]),
    ).toEqual({ passport: "G123", diet: "Vegan" });
  });

  it("treats every answer as optional, so nothing can refuse a booking", () => {
    expect(parseTravelerDetails({ passport: "   " }, ["passport"])).toEqual({});
    expect(parseTravelerDetails({}, ["passport"])).toEqual({});
    expect(parseTravelerDetails(undefined, ["passport"])).toEqual({});
    expect(parseTravelerDetails({ passport: 42 }, ["passport"])).toEqual({});
  });

  it("keeps nothing from a service that asks for nothing", () => {
    expect(parseTravelerDetails({ passport: "G123" }, [])).toEqual({});
    expect(parseTravelerDetails({ passport: "G123" }, undefined)).toEqual({});
  });

  it("caps an answer's length", () => {
    const { diet } = parseTravelerDetails({ diet: "x".repeat(500) }, ["diet"]);
    expect(diet).toHaveLength(MAX_TRAVELER_DETAIL_LENGTH);
  });
});
