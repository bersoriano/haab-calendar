// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultDoorEvent, DoorCheckIn } from "@/components/provider/guests/DoorCheckIn";
import type { DoorList } from "@/lib/door";
import type { Service } from "@/lib/types";

vi.mock("@/components/provider/QrCamera", () => ({ QrCamera: () => null }));

const RECEPTION = "svc-reception";
const BRUNCH = "svc-brunch";
const services = [
  { id: RECEPTION, name: "Recepción", occurrenceMode: "single", occurrenceDate: "2026-12-19" },
  { id: BRUNCH, name: "Tornaboda", occurrenceMode: "single", occurrenceDate: "2026-12-20" },
] as Service[];

const LIST: DoorList = {
  serviceId: RECEPTION,
  serviceName: "Recepción",
  generatedAt: "2026-12-19T20:00:00.000Z",
  invitations: [
    { invitationId: "a", invitationName: "Familia Peña", tokenHash: "h-a", guestIds: ["g1", "g2"] },
    { invitationId: "b", invitationName: "Abuela Rosa", tokenHash: "h-b", guestIds: ["g3"] },
  ],
  guests: [
    { guestId: "g1", invitationId: "a", invitationName: "Familia Peña", label: "Ana", table: "Mesa 7", checkedInAt: null },
    { guestId: "g2", invitationId: "a", invitationName: "Familia Peña", label: "Luis", table: "Mesa 7", checkedInAt: null },
    { guestId: "g3", invitationId: "b", invitationName: "Abuela Rosa", label: "Rosa", table: null, checkedInAt: "2026-12-19T23:00:00.000Z" },
  ],
};

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

async function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("DoorCheckIn", () => {
  it("checks a guest in with no connection, keeps the arrival on the phone, and counts it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === "POST") throw new TypeError("Failed to fetch");
        return new Response(JSON.stringify({ list: LIST }));
      }),
    );
    await act(async () =>
      root.render(<DoorCheckIn lang="en" services={services} pageKey="boda" timeZone="UTC" />),
    );
    await act(async () => undefined);

    expect(container.textContent).toContain("1 of 3 arrived");

    await type(container.querySelector<HTMLInputElement>("input[type='search']")!, "pena");
    expect(container.textContent).toContain("Familia Peña");
    expect(container.textContent).toContain("Mesa 7");

    const checkInAna = Array.from(container.querySelectorAll("li"))
      .find((item) => item.textContent?.includes("Ana"))!
      .querySelector("button")!;
    await act(async () => checkInAna.click());
    await act(async () => undefined);

    expect(container.textContent).toContain("2 of 3 arrived");
    expect(container.textContent).toContain("1 check-in waiting to send");
    const queued = JSON.parse(localStorage.getItem("haab:door-queue:boda") ?? "[]");
    expect(queued).toEqual([{ serviceId: RECEPTION, guestId: "g1", at: expect.any(String) }]);
  });

  it("shows the saved list when the phone starts offline", async () => {
    localStorage.setItem(`haab:door:boda:${RECEPTION}`, JSON.stringify(LIST));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await act(async () =>
      root.render(<DoorCheckIn lang="es" services={services} pageKey="boda" timeZone="UTC" />),
    );
    await act(async () => undefined);

    expect(container.textContent).toContain("1 de 3 llegaron");
    expect(container.textContent).not.toContain("No se cargó la lista");
  });
});

describe("defaultDoorEvent", () => {
  it("opens on today's event in the page's zone, else the first", () => {
    expect(defaultDoorEvent(services, "UTC", new Date("2026-12-20T12:00:00Z"))).toBe(BRUNCH);
    expect(defaultDoorEvent(services, "America/Mexico_City", new Date("2026-12-20T03:00:00Z"))).toBe(RECEPTION);
    expect(defaultDoorEvent(services, "UTC", new Date("2027-01-01T12:00:00Z"))).toBe(RECEPTION);
  });
});
