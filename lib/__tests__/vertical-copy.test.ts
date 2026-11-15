import { describe, expect, it } from "vitest";

import { cancellationPolicyLabel, getVerticalCopy, travelerFieldLabel } from "../vertical-copy";

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
  const VERTICALS = ["healthcare", "professional", "spaces", "events", "restaurant"] as const;

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

describe("restaurant copy", () => {
  it("talks about tables and reservations, not services and bookings", () => {
    const copy = getVerticalCopy("restaurant");

    expect(copy.service).toBe("table");
    expect(copy.booking).toBe("reservation");
    expect(copy.client).toBe("guest");
    expect(copy.phrases.spotsLeftSuffix).toBe("tables left");
  });

  it("agrees with the feminine Spanish noun", () => {
    const copy = getVerticalCopy("restaurant", "es");

    expect(copy.service).toBe("mesa");
    expect(copy.phrases.chooseAnotherService).toBe("Elija otra mesa");
    expect(copy.phrases.spotsLeftSuffix).toBe("mesas disponibles");
  });
});

describe("beforeVisitLabel", () => {
  it("names the visit for healthcare and the appointment for professional", () => {
    expect(getVerticalCopy("healthcare", "en").phrases.beforeVisitLabel).toBe("Before your visit:");
    expect(getVerticalCopy("professional", "es").phrases.beforeVisitLabel).toBe("Antes de su cita:");
  });

  it("falls back to a generic label elsewhere, in both languages", () => {
    for (const vertical of ["spaces", "events", "restaurant"] as const) {
      expect(getVerticalCopy(vertical, "en").phrases.beforeVisitLabel).toBe("Before you arrive:");
      expect(getVerticalCopy(vertical, "es").phrases.beforeVisitLabel).toBe("Antes de llegar:");
    }
  });
});

describe("tour vocabulary", () => {
  function strings(value: unknown): string[] {
    if (typeof value === "string") return [value];
    if (value && typeof value === "object") return Object.values(value).flatMap(strings);
    return [];
  }

  it("applies only to the events vertical", () => {
    expect(getVerticalCopy("events", "en", "tours").service).toBe("tour");
    expect(getVerticalCopy("events", "es", "tours").client).toBe("viajero");
    expect(getVerticalCopy("events", "en").service).toBe("event");
    expect(getVerticalCopy("healthcare", "en", "tours").client).toBe("patient");
  });

  it("never falls back to event words, in either language", () => {
    for (const text of strings(getVerticalCopy("events", "en", "tours"))) {
      expect(text).not.toMatch(/\bevents?\b|attendee|registr/i);
    }
    for (const text of strings(getVerticalCopy("events", "es", "tours"))) {
      expect(text).not.toMatch(/\beventos?\b|asistente|registr/i);
    }
  });

  it("states no arrival time the owner did not write", () => {
    for (const lang of ["en", "es"] as const) {
      for (const copy of [getVerticalCopy("events", lang), getVerticalCopy("events", lang, "tours")]) {
        expect(copy.phrases.whatHappensNext).not.toMatch(/fifteen|quince/i);
      }
    }
  });

  it("uses one word for a booking from confirming to confirmed", () => {
    const events = getVerticalCopy("events", "en");
    const tours = getVerticalCopy("events", "en", "tours");
    expect(events.event?.confirmedLabel).toMatch(new RegExp(events.Booking));
    expect(tours.event?.confirmedLabel).toMatch(new RegExp(tours.Booking));
  });
});

describe("weddings word set", () => {
  it("speaks of guests and RSVPs on an events page", () => {
    expect(getVerticalCopy("events", "es", "weddings").Clients).toBe("Invitados");
    expect(getVerticalCopy("events", "en", "weddings").Bookings).toBe("RSVPs");
    expect(getVerticalCopy("events", "es", "weddings").event?.cancellationPolicyLabel).toBe("Si sus planes cambian");
  });

  it("is ignored on any other vertical", () => {
    expect(getVerticalCopy("healthcare", "en", "weddings")).toEqual(getVerticalCopy("healthcare", "en"));
  });

  it("renames the booking-form labels it sets and keeps the rest", () => {
    const copy = getVerticalCopy("events", "en", "weddings");
    const shared = { passport: "Passport number", emergency_contact: "Emergency contact", diet: "Dietary needs", hotel_pickup: "Hotel pickup" };
    expect(travelerFieldLabel(copy, "hotel_pickup", shared)).toBe("Shuttle from your hotel");
    expect(travelerFieldLabel(copy, "passport", shared)).toBe("Passport number");
    expect(travelerFieldLabel(getVerticalCopy("events", "en"), "hotel_pickup", shared)).toBe("Hotel pickup");
    expect(cancellationPolicyLabel(getVerticalCopy("events", "en"), "Cancellation policy")).toBe("Cancellation policy");
  });
});
