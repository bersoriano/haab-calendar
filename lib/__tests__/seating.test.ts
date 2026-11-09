import { describe, expect, it } from "vitest";

import type { Invitation } from "@/lib/invitations";
import { attendingGuestIds, seatingFor, toSeatingCsv, type SeatingTable } from "@/lib/seating";

const RECEPTION = "svc-reception";
const BRUNCH = "svc-brunch";

const TABLES: SeatingTable[] = [
  { id: "t2", serviceId: RECEPTION, name: "Mesa 2", seatCount: 2, position: 1 },
  { id: "t1", serviceId: RECEPTION, name: "Mesa 1", seatCount: null, position: 0 },
  { id: "tb", serviceId: BRUNCH, name: "Terraza", seatCount: 10, position: 0 },
];

function invitation(overrides: Partial<Invitation>): Invitation {
  return {
    id: "inv",
    displayName: "Familia",
    contactPhone: "",
    contactEmail: "",
    seatLimit: 4,
    token: "t".repeat(43),
    notes: "",
    eventIds: [RECEPTION, BRUNCH],
    guests: [],
    submittedAt: "2026-11-05T00:00:00.000Z",
    lastContactedAt: null,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

const LIST = [
  invitation({
    id: "a",
    displayName: "Familia Ortiz",
    guests: [
      { id: "g1", name: "Ana", position: 0, attending: { [RECEPTION]: true }, tables: { [RECEPTION]: "t2" } },
      { id: "g2", name: "", position: 1, attending: { [RECEPTION]: true }, tables: { [RECEPTION]: "t2" } },
      { id: "g3", name: "Luis", position: 2, attending: { [RECEPTION]: true }, tables: { [RECEPTION]: "t2" } },
      { id: "g4", name: "Sofía", position: 3, attending: { [BRUNCH]: true } },
    ],
  }),
  invitation({
    id: "b",
    displayName: "Familia Ruiz",
    guests: [{ id: "g5", name: "Marta", position: 0, attending: { [RECEPTION]: true }, tables: { [RECEPTION]: "gone" } }],
  }),
  invitation({
    id: "c",
    displayName: "Sin respuesta",
    submittedAt: null,
    guests: [{ id: "g6", name: "Pre", position: 0, attending: { [RECEPTION]: true } }],
  }),
];

describe("seatingFor", () => {
  it("orders tables, seats people, flags a full table and lists the rest as not seated", () => {
    const seating = seatingFor(LIST, TABLES, RECEPTION, "es");

    expect(seating.tables.map(({ table }) => table.name)).toEqual(["Mesa 1", "Mesa 2"]);
    expect(seating.tables[1].seated.map((guest) => guest.label)).toEqual(["Ana", "Acompañante de Ana", "Luis"]);
    expect(seating.tables[1].over).toBe(true);
    expect(seating.tables[0].over).toBe(false);
    // A table that was deleted leaves its people unseated; unanswered households aren't seated at all.
    expect(seating.unseated.map((guest) => guest.label)).toEqual(["Marta"]);
  });

  it("keeps each event's tables to itself", () => {
    const brunch = seatingFor(LIST, TABLES, BRUNCH);
    expect(brunch.tables.map(({ table }) => table.name)).toEqual(["Terraza"]);
    expect(brunch.unseated.map((guest) => guest.label)).toEqual(["Sofía"]);
  });
});

describe("attendingGuestIds", () => {
  it("seats only the household members attending that event", () => {
    expect(attendingGuestIds(LIST[0], RECEPTION)).toEqual(["g1", "g2", "g3"]);
    expect(attendingGuestIds(LIST[0], BRUNCH)).toEqual(["g4"]);
  });
});

describe("toSeatingCsv", () => {
  it("lists every table in order, then everyone not seated", () => {
    const lines = toSeatingCsv({ invitations: LIST, tables: TABLES, serviceId: RECEPTION, lang: "en" })
      .replace(/^﻿/, "")
      .trim()
      .split("\r\n");
    expect(lines).toEqual([
      "Table,Guest,Invitation",
      "Mesa 2,Ana,Familia Ortiz",
      "Mesa 2,Guest of Ana,Familia Ortiz",
      "Mesa 2,Luis,Familia Ortiz",
      "Not seated,Marta,Familia Ruiz",
    ]);
  });
});
