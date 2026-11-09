import { guestLabel, isWellFormedInvitationToken, type Invitation } from "./invitations";
import type { SeatingTable } from "./seating";
import type { Lang } from "./types";

/**
 * The door of one event: who is coming, where they sit, who is in. Built on
 * the server, kept in the browser, and read with no network: a scanned QR is
 * matched by its token's hash, never sent anywhere to be looked up.
 */

export type DoorGuest = {
  guestId: string;
  invitationId: string;
  invitationName: string;
  label: string;
  table: string | null;
  checkedInAt: string | null;
};

export type DoorInvitation = {
  invitationId: string;
  invitationName: string;
  /** SHA-256 hex of the invitation's link token. */
  tokenHash: string;
  guestIds: string[];
};

export type DoorList = {
  serviceId: string;
  serviceName: string;
  generatedAt: string;
  invitations: DoorInvitation[];
  guests: DoorGuest[];
};

export type CheckinEntry = { serviceId: string; guestId: string; at: string };

/** Who is expected at an event, from answered invitations only. */
export function buildDoorList(input: {
  invitations: Invitation[];
  tables: SeatingTable[];
  serviceId: string;
  serviceName: string;
  lang: Lang;
  hashToken: (token: string) => string;
  now?: Date;
}): DoorList {
  const tableNames = new Map(input.tables.map((table) => [table.id, table.name]));
  const doorInvitations: DoorInvitation[] = [];
  const guests: DoorGuest[] = [];

  for (const invitation of input.invitations) {
    if (!invitation.submittedAt) continue;
    const coming = invitation.guests.filter((guest) => guest.attending[input.serviceId]);
    if (coming.length === 0) continue;

    doorInvitations.push({
      invitationId: invitation.id,
      invitationName: invitation.displayName,
      tokenHash: input.hashToken(invitation.token),
      guestIds: coming.map((guest) => guest.id),
    });
    for (const guest of coming) {
      const tableId = guest.tables?.[input.serviceId];
      guests.push({
        guestId: guest.id,
        invitationId: invitation.id,
        invitationName: invitation.displayName,
        label: guestLabel(guest, invitation.guests.indexOf(guest), invitation.guests, input.lang),
        table: (tableId && tableNames.get(tableId)) || null,
        checkedInAt: isoOrNull(guest.checkedIn?.[input.serviceId]),
      });
    }
  }

  doorInvitations.sort((a, b) => a.invitationName.localeCompare(b.invitationName, input.lang));
  return {
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    generatedAt: (input.now ?? new Date()).toISOString(),
    invitations: doorInvitations,
    guests,
  };
}

/** One format for every time, so the door's comparisons are of like with like. */
function isoOrNull(value: string | undefined | null): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

/** The link token in a scanned invitation code (a full URL or a path), or null. */
export function invitationTokenFromCode(code: string): string | null {
  const text = code.trim();
  if (!text || text.length > 2048) return null;
  let path = text;
  try {
    path = new URL(text).pathname;
  } catch {
    // Not a full URL: read it as a path.
  }
  const match = /\/i\/([^/?#]+)\/?$/.exec(path.split(/[?#]/)[0]);
  const token = match ? decodeURIComponent(match[1]) : "";
  return isWellFormedInvitationToken(token) ? token : null;
}

export function guestsOf(list: DoorList, invitation: DoorInvitation): DoorGuest[] {
  return invitation.guestIds.flatMap((id) => list.guests.find((guest) => guest.guestId === id) ?? []);
}

export function findByTokenHash(list: DoorList, hash: string): { invitation: DoorInvitation; guests: DoorGuest[] } | null {
  const invitation = list.invitations.find((entry) => entry.tokenHash === hash);
  return invitation ? { invitation, guests: guestsOf(list, invitation) } : null;
}

function fold(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Households whose name, or a guest's name, contains the query (accents ignored). */
export function searchDoor(list: DoorList, query: string): { invitation: DoorInvitation; guests: DoorGuest[] }[] {
  const needle = fold(query);
  if (!needle) return [];
  return list.invitations
    .map((invitation) => ({ invitation, guests: guestsOf(list, invitation) }))
    .filter(
      ({ invitation, guests }) =>
        fold(invitation.invitationName).includes(needle) || guests.some((guest) => fold(guest.label).includes(needle)),
    );
}

export function arrivals(list: DoorList): { arrived: number; expected: number } {
  return {
    arrived: list.guests.filter((guest) => guest.checkedInAt).length,
    expected: list.guests.length,
  };
}

/** The list with these check-ins applied; the earliest time for a guest wins. */
export function applyCheckins(list: DoorList, entries: CheckinEntry[]): DoorList {
  const earliest = new Map<string, string>();
  for (const entry of entries) {
    if (entry.serviceId !== list.serviceId) continue;
    const at = isoOrNull(entry.at);
    if (!at) continue;
    const current = earliest.get(entry.guestId);
    if (!current || at < current) earliest.set(entry.guestId, at);
  }
  if (earliest.size === 0) return list;

  return {
    ...list,
    guests: list.guests.map((guest) => {
      const at = earliest.get(guest.guestId);
      if (!at) return guest;
      const existing = isoOrNull(guest.checkedInAt);
      return { ...guest, checkedInAt: existing && existing <= at ? existing : at };
    }),
  };
}
