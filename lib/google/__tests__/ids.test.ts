import { describe, expect, it } from "vitest";

import {
  buildManagedEventProperties,
  encodeBase32Hex,
  isHaabManagedEvent,
  managedEventId,
  readManagedEventProperties,
} from "@/lib/google/ids";

const NAMESPACE = "production";
const PROVIDER = "00000000-0000-4000-8000-000000000001";
const BOOKING = "00000000-0000-4000-8000-000000000002";

describe("encodeBase32Hex", () => {
  it("emits only the alphabet Google accepts", () => {
    const encoded = encodeBase32Hex(
      Uint8Array.from({ length: 32 }, (_, index) => index * 7),
    );

    // Google's rule: lowercase a-v and digits 0-9, and nothing else.
    expect(encoded).toMatch(/^[0-9a-v]+$/);
  });

  it("is stable for the same bytes", () => {
    const bytes = Uint8Array.from([1, 2, 3, 4, 5]);

    expect(encodeBase32Hex(bytes)).toBe(encodeBase32Hex(bytes));
  });

  it("differs when a single byte differs", () => {
    expect(encodeBase32Hex(Uint8Array.from([1, 2, 3]))).not.toBe(
      encodeBase32Hex(Uint8Array.from([1, 2, 4])),
    );
  });
});

describe("managedEventId", () => {
  const id = managedEventId({
    namespace: NAMESPACE,
    providerId: PROVIDER,
    bookingId: BOOKING,
  });

  it("satisfies Google's id rules", () => {
    expect(id).toMatch(/^[0-9a-v]+$/);
    expect(id.length).toBeGreaterThanOrEqual(5);
    expect(id.length).toBeLessThanOrEqual(1024);
  });

  it("is deterministic, so a replayed delivery targets the same event", () => {
    // This is what makes the outbox handler idempotent against Google: the
    // second attempt writes the same id and collides instead of duplicating.
    expect(
      managedEventId({ namespace: NAMESPACE, providerId: PROVIDER, bookingId: BOOKING }),
    ).toBe(id);
  });

  it("separates deployments, so staging cannot collide with production", () => {
    expect(
      managedEventId({ namespace: "staging", providerId: PROVIDER, bookingId: BOOKING }),
    ).not.toBe(id);
  });

  it("separates bookings and providers", () => {
    expect(
      managedEventId({
        namespace: NAMESPACE,
        providerId: PROVIDER,
        bookingId: "00000000-0000-4000-8000-000000000003",
      }),
    ).not.toBe(id);
    expect(
      managedEventId({
        namespace: NAMESPACE,
        providerId: "00000000-0000-4000-8000-0000000000ff",
        bookingId: BOOKING,
      }),
    ).not.toBe(id);
  });

  it("reveals neither the booking nor the provider id", () => {
    // The id lands in a calendar the provider may share; it must not leak
    // internal identifiers to anyone who can read the event.
    expect(id).not.toContain(BOOKING.replace(/-/g, ""));
    expect(id).not.toContain(PROVIDER.replace(/-/g, ""));
  });
});

describe("managed event properties", () => {
  const properties = buildManagedEventProperties({
    namespace: NAMESPACE,
    providerId: PROVIDER,
    bookingId: BOOKING,
    bookingVersion: 3,
  });

  it("stamps ownership, identity, and the deployment", () => {
    expect(properties).toEqual({
      haabManaged: "true",
      haabNamespace: NAMESPACE,
      haabProviderId: PROVIDER,
      haabBookingId: BOOKING,
      haabBookingVersion: "3",
    });
  });

  it("carries only identifiers, never anything about the client", () => {
    // Checked by key, because "haabNamespace" legitimately contains "name".
    expect(Object.keys(properties).sort()).toEqual([
      "haabBookingId",
      "haabBookingVersion",
      "haabManaged",
      "haabNamespace",
      "haabProviderId",
    ]);
    expect(JSON.stringify(properties)).not.toMatch(/@|clientName|phone|notes/i);
  });

  it("recognises its own event", () => {
    expect(
      isHaabManagedEvent(properties, { namespace: NAMESPACE, providerId: PROVIDER }),
    ).toBe(true);
  });

  it("refuses an event from another deployment", () => {
    expect(
      isHaabManagedEvent(properties, { namespace: "staging", providerId: PROVIDER }),
    ).toBe(false);
  });

  it("refuses an event belonging to another provider", () => {
    expect(
      isHaabManagedEvent(properties, {
        namespace: NAMESPACE,
        providerId: "00000000-0000-4000-8000-0000000000ff",
      }),
    ).toBe(false);
  });

  it("refuses an event nobody marked as ours", () => {
    expect(isHaabManagedEvent({}, { namespace: NAMESPACE, providerId: PROVIDER })).toBe(
      false,
    );
    expect(
      isHaabManagedEvent(undefined, { namespace: NAMESPACE, providerId: PROVIDER }),
    ).toBe(false);
  });

  it("refuses an event that merely claims to be managed", () => {
    expect(
      isHaabManagedEvent(
        { haabManaged: "true" },
        { namespace: NAMESPACE, providerId: PROVIDER },
      ),
    ).toBe(false);
  });

  it("reads the booking identity back out", () => {
    expect(readManagedEventProperties(properties)).toEqual({
      bookingId: BOOKING,
      providerId: PROVIDER,
      namespace: NAMESPACE,
      bookingVersion: 3,
    });
  });

  it("reports nothing readable for a foreign event", () => {
    expect(readManagedEventProperties({ someoneElse: "1" })).toBeNull();
  });

  it("survives a malformed version rather than trusting it", () => {
    expect(
      readManagedEventProperties({ ...properties, haabBookingVersion: "not-a-number" }),
    ).toMatchObject({ bookingVersion: null });
  });
});
