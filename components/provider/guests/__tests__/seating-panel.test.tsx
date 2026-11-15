// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/app-ui";
import { SeatingPanel } from "@/components/provider/guests/SeatingPanel";
import type { Invitation } from "@/lib/invitations";
import type { Service } from "@/lib/types";

const RECEPTION = "11111111-1111-4111-8111-111111111111";
const services = [{ id: RECEPTION, name: "Recepción" }] as Service[];

function invitation(overrides: Partial<Invitation>): Invitation {
  return {
    id: "inv",
    displayName: "Familia",
    contactPhone: "",
    contactEmail: "",
    seatLimit: 4,
    token: "t".repeat(43),
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

const LIST = [
  invitation({
    id: "a",
    displayName: "Familia Ortiz",
    guests: [
      { id: "g1", name: "Ana", position: 0, attending: { [RECEPTION]: true } },
      { id: "g2", name: "Luis", position: 1, attending: { [RECEPTION]: true } },
      { id: "g3", name: "Sofía", position: 2, attending: {} },
    ],
  }),
  invitation({
    id: "b",
    displayName: "Familia Ruiz",
    guests: [
      { id: "g4", name: "Marta", position: 0, attending: { [RECEPTION]: true }, tables: { [RECEPTION]: "t1" } },
      { id: "g5", name: "Leo", position: 1, attending: { [RECEPTION]: true }, tables: { [RECEPTION]: "t1" } },
      { id: "g6", name: "Eva", position: 2, attending: { [RECEPTION]: true }, tables: { [RECEPTION]: "t1" } },
    ],
  }),
];

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("SeatingPanel", () => {
  it("lists attending people without a table, warns at a full table, and seats a household in one choice", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/provider/seating" && !init?.method) {
        return new Response(
          JSON.stringify({
            tables: [{ id: "t1", serviceId: RECEPTION, name: "Mesa 1", seatCount: 2, position: 0 }],
            published: false,
            publishedAt: null,
          }),
        );
      }
      return new Response(JSON.stringify({ moved: 2 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const onSeated = vi.fn();

    await act(async () =>
      root.render(
        <ToastProvider dismissLabel="Dismiss">
          <SeatingPanel lang="es" services={services} invitations={LIST} readOnly={false} onSeated={onSeated} />
        </ToastProvider>,
      ),
    );
    await act(async () => undefined);

    expect(container.textContent).toContain("Sin mesa (2)");
    expect(container.textContent).not.toContain("Sofía");
    expect(container.textContent).toContain("3 de 2");
    expect(container.textContent).toContain("Más personas que lugares");

    const household = container.querySelector<HTMLSelectElement>("select[aria-label='Sentar a todos en Familia Ortiz en']")!;
    await act(async () => {
      household.value = "t1";
      household.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const assign = fetchMock.mock.calls.find(([url]) => url === "/api/provider/seating/assign")!;
    expect(JSON.parse(String(assign[1]!.body))).toEqual({ serviceId: RECEPTION, guestIds: ["g1", "g2"], tableId: "t1" });
    const seated = onSeated.mock.lastCall![0] as Invitation[];
    expect(seated[0].guests.map((guest) => guest.tables?.[RECEPTION] ?? null)).toEqual(["t1", "t1", null]);
  });
});
