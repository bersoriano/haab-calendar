import { describe, expect, it } from "vitest";

import {
  applyCheckins,
  arrivals,
  buildDoorList,
  findByTokenHash,
  invitationTokenFromCode,
  searchDoor,
} from "@/lib/door";
import type { Invitation } from "@/lib/invitations";

const RECEPTION = "svc-reception";
const TOKEN_A = "A".repeat(43);
const TOKEN_B = "B".repeat(43);

function invitation(overrides: Partial<Invitation>): Invitation {
  return {
    id: "inv",
    displayName: "Familia",
    contactPhone: "",
    contactEmail: "",
    seatLimit: 4,
    token: TOKEN_A,
    notes: "",
    eventIds: [RECEPTION],
    guests: [],
    submittedAt: "2026-11-05T00:00:00.000Z",
    lastContactedAt: null,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

const LIST = buildDoorList({
  invitations: [
    invitation({
      id: "a",
      displayName: "Familia Peña",
      token: TOKEN_A,
      guests: [
        { id: "g1", name: "Ana", position: 0, attending: { [RECEPTION]: true }, tables: { [RECEPTION]: "t7" } },
        { id: "g2", name: "", position: 1, attending: { [RECEPTION]: true }, checkedIn: { [RECEPTION]: "2026-12-20T23:05:00.000Z" } },
        { id: "g3", name: "Luis", position: 2, attending: {} },
      ],
    }),
    invitation({ id: "b", displayName: "Abuela Rosa", token: TOKEN_B, guests: [{ id: "g4", name: "Rosa", position: 0, attending: { [RECEPTION]: true } }] }),
    invitation({ id: "c", displayName: "Sin respuesta", token: "C".repeat(43), submittedAt: null, guests: [{ id: "g5", name: "X", position: 0, attending: { [RECEPTION]: true } }] }),
  ],
  tables: [{ id: "t7", serviceId: RECEPTION, name: "Mesa 7", seatCount: 8, position: 0 }],
  serviceId: RECEPTION,
  serviceName: "Recepción",
  lang: "es",
  hashToken: (token) => `hash-${token[0]}`,
  now: new Date("2026-12-20T22:00:00.000Z"),
});

describe("buildDoorList", () => {
  it("lists answered households attending the event, with tables and arrivals, by name", () => {
    expect(LIST.invitations.map((entry) => [entry.invitationName, entry.tokenHash, entry.guestIds])).toEqual([
      ["Abuela Rosa", "hash-B", ["g4"]],
      ["Familia Peña", "hash-A", ["g1", "g2"]],
    ]);
    expect(LIST.guests.find((guest) => guest.guestId === "g1")).toMatchObject({ label: "Ana", table: "Mesa 7", checkedInAt: null });
    expect(LIST.guests.find((guest) => guest.guestId === "g2")).toMatchObject({
      label: "Acompañante de Ana",
      checkedInAt: "2026-12-20T23:05:00.000Z",
    });
    expect(arrivals(LIST)).toEqual({ arrived: 1, expected: 3 });
  });
});

describe("invitationTokenFromCode", () => {
  it("reads the token from an invitation URL or path, from any host", () => {
    expect(invitationTokenFromCode(`https://haabcalendar.com/events/boda/i/${TOKEN_A}`)).toBe(TOKEN_A);
    expect(invitationTokenFromCode(`https://old.example/events/boda/i/${TOKEN_A}?lang=es`)).toBe(TOKEN_A);
    expect(invitationTokenFromCode(`/events/boda/i/${TOKEN_A}`)).toBe(TOKEN_A);
  });

  it("refuses booking codes and anything else", () => {
    expect(invitationTokenFromCode(`https://haabcalendar.com/events/boda/manage/${TOKEN_A}`)).toBeNull();
    expect(invitationTokenFromCode("https://haabcalendar.com/events/boda/i/short")).toBeNull();
    expect(invitationTokenFromCode("hello")).toBeNull();
    expect(invitationTokenFromCode("")).toBeNull();
  });
});

describe("findByTokenHash and searchDoor", () => {
  it("finds a household by its code, or by any name, ignoring accents", () => {
    expect(findByTokenHash(LIST, "hash-A")?.guests.map((guest) => guest.label)).toEqual(["Ana", "Acompañante de Ana"]);
    expect(findByTokenHash(LIST, "hash-Z")).toBeNull();
    expect(searchDoor(LIST, "pena").map(({ invitation }) => invitation.invitationName)).toEqual(["Familia Peña"]);
    expect(searchDoor(LIST, "rosa").map(({ invitation }) => invitation.invitationName)).toEqual(["Abuela Rosa"]);
    expect(searchDoor(LIST, "  ")).toEqual([]);
  });
});

describe("applyCheckins", () => {
  it("keeps the earliest arrival for each guest, whichever phone recorded it", () => {
    const merged = applyCheckins(LIST, [
      { serviceId: RECEPTION, guestId: "g1", at: "2026-12-20T23:10:00.000Z" },
      { serviceId: RECEPTION, guestId: "g1", at: "2026-12-20T23:08:00.000Z" },
      { serviceId: RECEPTION, guestId: "g2", at: "2026-12-20T23:30:00+00:00" },
      { serviceId: "other-event", guestId: "g4", at: "2026-12-20T23:00:00.000Z" },
    ]);
    const at = (id: string) => merged.guests.find((guest) => guest.guestId === id)?.checkedInAt;
    expect(at("g1")).toBe("2026-12-20T23:08:00.000Z");
    expect(at("g2")).toBe("2026-12-20T23:05:00.000Z");
    expect(at("g4")).toBeNull();
    expect(arrivals(merged)).toEqual({ arrived: 2, expected: 3 });
  });
});
