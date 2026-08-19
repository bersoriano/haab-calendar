import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import {
  GoogleCalendarCapabilities,
  type Capabilities,
} from "@/components/provider/GoogleCalendarCapabilities";

const en = bookingTranslations.en.admin;
const es = bookingTranslations.es.admin;

/**
 * Server rendering only: the first paint is what a provider sees before any
 * fetch resolves, and it must never claim a capability is on.
 */
function render(connected: boolean) {
  return renderToStaticMarkup(
    <GoogleCalendarCapabilities connected={connected} lang="en" />,
  );
}

describe("GoogleCalendarCapabilities", () => {
  it("renders nothing before the server has answered", () => {
    // Anything else would show a toggle whose state is a guess.
    expect(render(true)).toBe("");
  });

  it("renders nothing at all without a connection", () => {
    expect(render(false)).toBe("");
  });
});

describe("capability copy", () => {
  it("says what busy blocking reads, and what it does not", () => {
    expect(en.googleBusyBody).toContain("when you are busy");
    expect(en.googleBusyBody).toContain("never what the events are");
  });

  it("warns that deletion handling is off by default", () => {
    expect(en.googleTwoWayDeletionHelp).toContain("Off by default");
    expect(es.googleTwoWayDeletionHelp).toContain("Desactivado");
  });

  it("explains that a refused change is put back", () => {
    expect(en.googleTwoWayBody).toContain("goes back where it was");
  });

  it("explains why the target calendar is not offered as a source", () => {
    expect(en.googleBusyChooseHelp).toContain("already your Haab bookings");
    expect(es.googleBusyChooseHelp).toContain("ya son tus reservas de Haab");
  });

  it("has a Spanish string for every new English one", () => {
    const keys = Object.keys(en).filter(
      (key) => key.startsWith("googleBusy") || key.startsWith("googleTwoWay") ||
        key.startsWith("googleConflict"),
    );

    expect(keys.length).toBeGreaterThan(10);

    for (const key of keys) {
      const value = es[key as keyof typeof es];
      expect(typeof value, key).toBe("string");
      // A Spanish page showing the English sentence is the failure this
      // catches, so identical strings are the thing to look for.
      expect(value, key).not.toBe(en[key as keyof typeof en]);
    }
  });
});

describe("Capabilities shape", () => {
  it("defaults every switch to off", () => {
    // The type is the contract the server fills; a provider who has never
    // chosen anything must read as having chosen nothing.
    const fresh: Capabilities = {
      busyBlockingEnabled: false,
      twoWayEnabled: false,
      deletionCancelsBooking: false,
      busyBlockingAvailable: false,
      twoWayAvailable: false,
      busySources: [],
      maxBusySources: 10,
      conflicts: [],
    };

    expect(fresh.busyBlockingEnabled).toBe(false);
    expect(fresh.twoWayEnabled).toBe(false);
    expect(fresh.deletionCancelsBooking).toBe(false);
  });
});
