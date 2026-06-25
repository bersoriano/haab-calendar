import { describe, expect, it } from "vitest";

import { getVerticalCopy } from "../vertical-copy";

describe("getVerticalCopy", () => {
  it("returns the English value when no language is provided", () => {
    expect(getVerticalCopy("healthcare").service).toBe("medical service");
  });

  it("returns the Spanish value when lang is 'es'", () => {
    expect(getVerticalCopy("healthcare", "es").service).toBe("servicio médico");
  });

  it("translates the events book verb to 'registrarse' in Spanish", () => {
    expect(getVerticalCopy("events").bookVerb).toBe("register");
    expect(getVerticalCopy("events", "es").bookVerb).toBe("registrarse");
  });

  it("returns the Spanish default object when no vertical and lang is 'es'", () => {
    expect(getVerticalCopy(undefined, "es").bookingPage).toBe(
      "página de reservas",
    );
  });

  it("returns the English default object when no vertical and no lang", () => {
    expect(getVerticalCopy(undefined).bookingPage).toBe("booking page");
  });
});
