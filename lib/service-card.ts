import { formatCapacityLabel } from "@/lib/format";
import type { Lang, ProviderInfo, Service, VerticalId } from "@/lib/types";
import type { VerticalCopy } from "@/lib/vertical-copy";

/**
 * The decisions behind a service card on step 1, kept apart from the markup so
 * they can be tested without rendering it.
 */

export type ServiceContact = {
  addresses: string[];
  phones: string[];
};

type ProviderContact = Pick<
  ProviderInfo,
  "address1" | "address2" | "phoneNumber1" | "phoneNumber2"
>;

function clean(entries: Array<string | undefined>): string[] {
  const seen = new Set<string>();

  for (const entry of entries) {
    const trimmed = entry?.trim();

    if (trimmed) {
      seen.add(trimmed);
    }
  }

  return [...seen];
}

/** The addresses and phones a service links to, in the order they are shown. */
export function getServiceContact(
  service: Service,
  provider: ProviderContact,
): ServiceContact {
  return {
    addresses: clean([
      service.linkedAddress1 ? provider.address1 : "",
      service.linkedAddress2 ? provider.address2 : "",
      service.customAddress,
    ]),
    phones: clean([
      service.linkedPhone1 ? provider.phoneNumber1 : "",
      service.linkedPhone2 ? provider.phoneNumber2 : "",
      service.customPhone,
    ]),
  };
}

export function hasServiceContact(contact: ServiceContact | null | undefined) {
  return Boolean(contact && (contact.addresses.length > 0 || contact.phones.length > 0));
}

function sameSet(a: string[], b: string[]) {
  const sortedB = [...b].sort();

  return a.length === b.length && [...a].sort().every((entry, i) => entry === sortedB[i]);
}

/**
 * The contact block every service has in common, or null. Repeating one
 * address and phone under each card is noise, so when the whole list agrees it
 * is said once; when even one service differs each card keeps its own line,
 * since pulling the shared part out would hide which service goes where.
 */
export function resolveSharedServiceContact(
  services: Service[],
  provider: ProviderContact,
): ServiceContact | null {
  const [first, ...rest] = services.map((service) => getServiceContact(service, provider));

  if (!first || !hasServiceContact(first)) {
    return null;
  }

  const agrees = rest.every(
    (contact) =>
      sameSet(contact.addresses, first.addresses) && sameSet(contact.phones, first.phones),
  );

  return agrees ? first : null;
}

/**
 * The capacity chip's text, or null when the service has nothing to say.
 * Events state a spots cap; restaurants reuse `maxSpots` for tables, so the
 * numeric cap is an events-only reading. A bare number ("4") borrows the
 * vertical's client word so it reads "4 patients" rather than a lone digit.
 */
export function formatCapacityChip(
  service: Service,
  vertical: VerticalId | undefined,
  copy: VerticalCopy,
  lang: Lang,
): string | null {
  if (
    vertical === "events" &&
    typeof service.maxSpots === "number" &&
    Number.isFinite(service.maxSpots)
  ) {
    return formatCapacityLabel(service, lang);
  }

  const capacity = service.capacity?.trim();

  if (!capacity) {
    return null;
  }

  if (/^\d+$/.test(capacity)) {
    return `${capacity} ${capacity === "1" ? copy.client : copy.clients}`;
  }

  return capacity;
}

/**
 * What the card's pill says. The card stands before any time exists, so it
 * names what comes next: a date for events, a day for full-day bookings, a
 * time for everything else.
 */
export function getServiceCardCta(
  service: Service,
  vertical: VerticalId | undefined,
  labels: { selectADate: string; selectADay: string; selectATime: string },
): string {
  if (vertical === "events") {
    return labels.selectADate;
  }

  return service.bookingType === "full-day" ? labels.selectADay : labels.selectATime;
}
