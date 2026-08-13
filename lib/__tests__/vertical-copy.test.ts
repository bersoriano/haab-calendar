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

describe("chooseAnotherService", () => {
  const VERTICALS = ["healthcare", "professional", "spaces", "events"] as const;

  // It used to be rendered as `chooseAnother` + `service`, two JSX siblings.
  // That reads correctly only while every vertical's Spanish noun is masculine,
  // which is true today and is exactly what makes the hazard easy to miss. The
  // phrase is now written per vertical, so each one carries its own article —
  // these assertions pin that it still names that vertical's own noun.
  it.each(VERTICALS)("names the %s vertical's own noun in both languages", (vertical) => {
    for (const lang of ["en", "es"] as const) {
      const copy = getVerticalCopy(vertical, lang);
      expect(copy.phrases.chooseAnotherService).toContain(copy.service);
    }
  });

  it.each(VERTICALS)("agrees the Spanish article with the %s noun", (vertical) => {
    const copy = getVerticalCopy(vertical, "es");
    // Head noun first: "servicio médico" is masculine because of `servicio`.
    const head = copy.service.split(" ")[0];
    const gender = /o$/.test(head)
      ? "otro"
      : /(?:a|ión)$/.test(head)
        ? "otra"
        : null;

    // A noun ending in -e (clase, red) is not decidable from its ending. That
    // is a prompt to write the assertion by hand, not a reason to guess.
    expect(gender, `cannot infer the gender of "${head}" — assert it explicitly`).not.toBeNull();
    expect(copy.phrases.chooseAnotherService).toContain(gender);
  });
});
