// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/app-ui";
import { alignCreatedGuests, GuestListSurface } from "@/components/provider/guests/GuestListSurface";
import { writeGuestListCache } from "@/lib/guest-list-cache";
import type { Invitation } from "@/lib/invitations";
import type { ProviderInfo, Service } from "@/lib/types";
import { getVerticalCopy } from "@/lib/vertical-copy";

const CEREMONY = "11111111-1111-4111-8111-111111111111";
const BRUNCH = "22222222-2222-4222-8222-222222222222";

const services = [
  { id: CEREMONY, name: "Ceremonia", maxSpots: 3 },
  { id: BRUNCH, name: "Tornaboda", maxSpots: 70 },
] as Service[];

const provider = {
  businessName: "Boda de Valeria & Diego",
  publicSlug: "boda-valeria-y-diego",
  rsvpMode: "invitations",
  defaultInvitationSeats: 2,
} as ProviderInfo;

function invitation(overrides: Partial<Invitation>): Invitation {
  return {
    id: "inv",
    displayName: "Familia",
    contactPhone: "",
    contactEmail: "",
    seatLimit: 2,
    token: "t".repeat(43),
    notes: "",
    eventIds: [CEREMONY, BRUNCH],
    guests: [],
    submittedAt: null,
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
    seatLimit: 4,
    submittedAt: "2026-11-05T18:00:00.000Z",
    guests: [
      { id: "g1", name: "Ana", position: 0, attending: { [CEREMONY]: true, [BRUNCH]: false } },
      { id: "g2", name: "Luis", position: 1, attending: { [CEREMONY]: true, [BRUNCH]: false } },
      { id: "g3", name: "Sofía", position: 2, attending: { [CEREMONY]: true, [BRUNCH]: false } },
      { id: "g4", name: "", position: 3, attending: { [CEREMONY]: true, [BRUNCH]: false } },
    ],
  }),
  invitation({ id: "b", displayName: "Familia Ruiz", submittedAt: "2026-11-06T18:00:00.000Z" }),
  invitation({ id: "c", displayName: "Marta Paz", eventIds: [CEREMONY] }),
];


// Node's own experimental localStorage shadows happy-dom's and is unusable
// without a backing file, so each test gets a fresh in-memory one.
function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
    clear: () => items.clear(),
  };
}

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("localStorage", memoryStorage());
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render() {
  await act(async () =>
    root.render(
      <ToastProvider dismissLabel="Dismiss">
        <GuestListSurface
          lang="en"
          integratedMode
          services={services}
          provider={provider}
          vertical="events"
          copy={getVerticalCopy("events", "en", "weddings")}
        />
      </ToastProvider>,
    ),
  );
  // Let the list request settle.
  await act(async () => undefined);
}

function rows() {
  return Array.from(container.querySelectorAll("tbody tr")).map((row) => row.querySelector("td")?.textContent ?? "");
}

describe("GuestListSurface", () => {
  it("counts people and answers per event, and warns when an event is over its seats", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ invitations: LIST }))));
    await render();

    const cards = Array.from(container.querySelectorAll("section li")).slice(0, 2).map((card) => card.textContent);
    expect(cards[0]).toContain("Ceremonia");
    expect(cards[0]).toContain("4confirmed of 3");
    expect(cards[0]).toContain("1 attending");
    expect(cards[0]).toContain("1 declined");
    expect(cards[0]).toContain("1 no answer");
    expect(cards[0]).toContain("More people confirmed than the 3 seats this event has.");
    expect(cards[1]).toContain("0confirmed of 70");
    expect(cards[1]).toContain("2 declined");
    expect(cards[1]).not.toContain("More people confirmed");
  });

  it("filters the invitations by answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ invitations: LIST }))));
    await render();

    expect(rows()).toHaveLength(3);
    const noAnswer = Array.from(container.querySelectorAll<HTMLButtonElement>("[role='radiogroup'] button")).find(
      (button) => button.textContent === "No answer",
    )!;
    await act(async () => noAnswer.click());

    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toContain("Marta Paz");
  });

  it("shows the saved list read-only when the network is gone", async () => {
    writeGuestListCache("boda-valeria-y-diego", LIST, new Date("2026-11-08T12:00:00.000Z"));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await render();

    expect(container.textContent).toContain("Offline: showing the list saved on");
    expect(rows()).toHaveLength(3);
    expect(container.querySelector("button[aria-label^='Edit']")).toBeNull();
    expect(container.querySelector("button[aria-label^='Delete']")).toBeNull();
    expect(container.textContent).not.toContain("Add invitation");
  });

  it("offers a retry when the list fails and nothing is saved", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));
    await render();

    expect(container.textContent).toContain("Your guest list didn't load.");
    expect(container.textContent).toContain("Try again");
  });
});

describe("alignCreatedGuests", () => {
  it("gives named rows the server's ids in order and leaves blank rows new", () => {
    expect(
      alignCreatedGuests([{ name: "Ana" }, { name: "" }, { name: "Luis" }], [{ id: "g1" }, { id: "g2" }]),
    ).toEqual([{ id: "g1", name: "Ana" }, { name: "" }, { id: "g2", name: "Luis" }]);
  });
});
