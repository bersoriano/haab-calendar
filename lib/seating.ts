import { csvCell, UTF8_BOM } from "./csv";
import { guestLabel, type Invitation } from "./invitations";
import type { Lang } from "./types";

/**
 * Tables at one event and who sits at each. A seat is per person per event,
 * and only someone attending has one (the database enforces both). Pure,
 * shared by the dashboard, the export and the door.
 */

export type SeatingTable = {
  id: string;
  serviceId: string;
  name: string;
  seatCount: number | null;
  position: number;
};

export type SeatedGuest = {
  invitationId: string;
  invitationName: string;
  guestId: string;
  label: string;
};

export type EventSeating = {
  tables: { table: SeatingTable; seated: SeatedGuest[]; over: boolean }[];
  /** Attending people with no table at this event yet. */
  unseated: SeatedGuest[];
};

export const TABLE_NAME_MAX_LENGTH = 60;
export const TABLE_SEAT_COUNT_MAX = 100;

/**
 * Who sits where at one event, among answered invitations. Someone seated at a
 * table that no longer exists counts as not seated.
 */
export function seatingFor(invitations: Invitation[], tables: SeatingTable[], serviceId: string, lang: Lang = "en"): EventSeating {
  const eventTables = tables
    .filter((table) => table.serviceId === serviceId)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const byTable = new Map(eventTables.map((table) => [table.id, [] as SeatedGuest[]]));
  const unseated: SeatedGuest[] = [];

  for (const invitation of invitations) {
    if (!invitation.submittedAt) continue;
    invitation.guests.forEach((guest, index) => {
      if (!guest.attending[serviceId]) return;
      const seated: SeatedGuest = {
        invitationId: invitation.id,
        invitationName: invitation.displayName,
        guestId: guest.id,
        label: guestLabel(guest, index, invitation.guests, lang),
      };
      const tableId = guest.tables?.[serviceId];
      const list = tableId ? byTable.get(tableId) : undefined;
      (list ?? unseated).push(seated);
    });
  }

  return {
    tables: eventTables.map((table) => {
      const seated = byTable.get(table.id) ?? [];
      return { table, seated, over: table.seatCount !== null && seated.length > table.seatCount };
    }),
    unseated,
  };
}

/** The guests of an invitation who attend this event: who "seat the household" moves. */
export function attendingGuestIds(invitation: Invitation, serviceId: string): string[] {
  return invitation.guests.filter((guest) => guest.attending[serviceId]).map((guest) => guest.id);
}

const CSV_HEADERS: Record<Lang, string[]> = {
  en: ["Table", "Guest", "Invitation"],
  es: ["Mesa", "Invitado", "Invitación"],
};
const NOT_SEATED: Record<Lang, string> = { en: "Not seated", es: "Sin mesa" };

/** The seating by table, then everyone not seated yet: what the venue asks for. */
export function toSeatingCsv(input: {
  invitations: Invitation[];
  tables: SeatingTable[];
  serviceId: string;
  lang: Lang;
}): string {
  const seating = seatingFor(input.invitations, input.tables, input.serviceId, input.lang);
  const rows = [
    ...seating.tables.flatMap(({ table, seated }) =>
      seated.map((guest) => [table.name, guest.label, guest.invitationName]),
    ),
    ...seating.unseated.map((guest) => [NOT_SEATED[input.lang], guest.label, guest.invitationName]),
  ].map((cells) => cells.map(csvCell).join(","));

  return `${UTF8_BOM}${[CSV_HEADERS[input.lang].map(csvCell).join(","), ...rows].join("\r\n")}\r\n`;
}
