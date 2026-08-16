import { createHash } from "node:crypto";

/**
 * Identity for the Google events Haab creates.
 *
 * Two things live here: the event id, which has to satisfy Google's own
 * alphabet rules, and the private extended properties that mark an event as
 * ours. Both are pure — no client, no network — so the rules that decide
 * ownership can be tested exhaustively.
 */

/** RFC 2938 base32hex: digits then a–v, which is exactly what Google accepts. */
const BASE32HEX = "0123456789abcdefghijklmnopqrstuv";

export function encodeBase32Hex(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32HEX[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32HEX[(value << (5 - bits)) & 31];
  }

  return output;
}

export type ManagedEventIdentity = {
  namespace: string;
  providerId: string;
  bookingId: string;
};

/**
 * The Google event id for a booking, derived rather than stored.
 *
 * Deterministic on purpose: delivery is at-least-once, so a replayed outbox
 * event must address the *same* Google event and collide, instead of creating a
 * second one. A hash rather than the ids themselves, because the id is visible
 * to anyone the calendar is shared with and internal identifiers should not be.
 */
export function managedEventId(identity: ManagedEventIdentity): string {
  const digest = createHash("sha256")
    .update(`haab:${identity.namespace}:${identity.providerId}:${identity.bookingId}`)
    .digest();

  // 20 bytes → 32 base32hex characters, comfortably inside Google's 5–1024.
  return `haab${encodeBase32Hex(digest.subarray(0, 20))}`;
}

export type ManagedEventProperties = {
  haabManaged: "true";
  haabNamespace: string;
  haabProviderId: string;
  haabBookingId: string;
  haabBookingVersion: string;
};

export function buildManagedEventProperties(input: {
  namespace: string;
  providerId: string;
  bookingId: string;
  bookingVersion: number;
}): ManagedEventProperties {
  // Identifiers and a version. Never a client name, an email, or a note: these
  // properties are private to the calendar, not to the people who can read it.
  return {
    haabManaged: "true",
    haabNamespace: input.namespace,
    haabProviderId: input.providerId,
    haabBookingId: input.bookingId,
    haabBookingVersion: String(input.bookingVersion),
  };
}

type RawProperties = Record<string, string | undefined> | undefined;

/**
 * Whether an event is one of ours, for this deployment and this provider.
 *
 * All three must agree. A `haabManaged` flag alone proves nothing — anyone can
 * write one — and a namespace check is what stops a staging deployment adopting
 * a production booking's event.
 */
export function isHaabManagedEvent(
  properties: RawProperties,
  expected: { namespace: string; providerId: string },
): boolean {
  if (!properties) {
    return false;
  }

  return (
    properties.haabManaged === "true" &&
    properties.haabNamespace === expected.namespace &&
    properties.haabProviderId === expected.providerId &&
    Boolean(properties.haabBookingId)
  );
}

export type ReadManagedProperties = {
  bookingId: string;
  providerId: string;
  namespace: string;
  bookingVersion: number | null;
};

export function readManagedEventProperties(
  properties: RawProperties,
): ReadManagedProperties | null {
  if (
    !properties?.haabBookingId ||
    !properties.haabProviderId ||
    !properties.haabNamespace
  ) {
    return null;
  }

  const version = Number(properties.haabBookingVersion);

  return {
    bookingId: properties.haabBookingId,
    providerId: properties.haabProviderId,
    namespace: properties.haabNamespace,
    // A version that does not parse is unknown, not zero: treating it as zero
    // would make a current event look older than everything.
    bookingVersion: Number.isInteger(version) && version > 0 ? version : null,
  };
}
