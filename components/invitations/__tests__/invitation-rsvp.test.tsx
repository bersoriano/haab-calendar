// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InvitationRsvp } from "@/components/invitations/InvitationRsvp";
import type { PublicInvitation } from "@/lib/supabase/invitations";
import type { Service } from "@/lib/types";

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

function service(id: string, name: string): Service {
  return {
    id,
    name,
    slug: id,
    bookingType: "appointment",
    durationMinutes: 120,
    description: "",
    occurrenceMode: "single",
    occurrenceDate: "2027-01-23",
    startTime: "16:30",
    endTime: "23:30",
  } as Service;
}

const SERVICES = [service("svc-ceremony", "Ceremonia"), service("svc-brunch", "Tornaboda")];

function invitation(overrides: Partial<PublicInvitation> = {}): PublicInvitation {
  return {
    displayName: "Familia Ortiz",
    seatLimit: 2,
    guests: [{ id: "g1", name: "Ana", attending: {} }],
    eventIds: ["svc-ceremony", "svc-brunch"],
    contactPhone: "",
    contactEmail: "",
    submittedAt: null,
    ...overrides,
  };
}

async function render(target: PublicInvitation) {
  await act(async () =>
    root.render(<InvitationRsvp invitation={target} services={SERVICES} apiPath="/api/x" lang="es" />),
  );
}

function button(text: string) {
  const found = Array.from(container.querySelectorAll("button")).find((element) => element.textContent?.includes(text));
  if (!found) throw new Error(`No button "${text}"`);
  return found as HTMLButtonElement;
}

function checkbox(fieldsetIndex: number, labelText: string) {
  const fieldset = container.querySelectorAll("fieldset")[fieldsetIndex];
  const label = Array.from(fieldset.querySelectorAll("label")).find((element) =>
    element.textContent?.includes(labelText),
  );
  if (!label) throw new Error(`No checkbox "${labelText}"`);
  return label.querySelector("input") as HTMLInputElement;
}

async function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("InvitationRsvp", () => {
  it("stops adding guests at the seat limit and says what the limit is", async () => {
    await render(invitation());

    expect(container.textContent).toContain("Su invitación es para 2.");
    expect(button("+ Agregar invitado").disabled).toBe(false);

    await act(async () => button("+ Agregar invitado").click());

    expect(container.querySelectorAll("input[placeholder='Nombre completo']")).toHaveLength(2);
    expect(button("+ Agregar invitado").disabled).toBe(true);
    // The companion is named after the first guest until someone types a name.
    expect(checkbox(1, "Acompañante de Ana")).toBeTruthy();
  });

  it("unticks everyone for an event when the household can't make it", async () => {
    await render(invitation());

    await act(async () => checkbox(1, "Ana").click());
    expect(checkbox(1, "Ana").checked).toBe(true);

    await act(async () => checkbox(1, "No podremos asistir").click());
    expect(checkbox(1, "Ana").checked).toBe(false);
    expect(checkbox(1, "No podremos asistir").checked).toBe(true);
  });

  it("needs an answer for every event before it sends", async () => {
    await render(invitation());

    expect(button("Enviar confirmación").disabled).toBe(true);
    await act(async () => checkbox(1, "Ana").click());
    expect(button("Enviar confirmación").disabled).toBe(true);
    await act(async () => checkbox(2, "No podremos asistir").click());
    expect(button("Enviar confirmación").disabled).toBe(false);
  });

  it("sends answers aligned with the guests and shows them back", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          invitation: invitation({
            submittedAt: "2026-11-09T00:00:00.000Z",
            guests: [
              { id: "g1", name: "Ana", attending: { "svc-ceremony": true, "svc-brunch": false } },
              { id: "g2", name: "Luis", attending: { "svc-ceremony": true, "svc-brunch": false } },
            ],
          }),
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await render(invitation());

    await act(async () => button("+ Agregar invitado").click());
    await type(container.querySelectorAll<HTMLInputElement>("input[placeholder='Nombre completo']")[1], "Luis");
    await act(async () => checkbox(1, "Ana").click());
    await act(async () => checkbox(1, "Luis").click());
    await act(async () => checkbox(2, "No podremos asistir").click());
    await act(async () => button("Enviar confirmación").click());

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/x");
    expect(JSON.parse(init.body)).toEqual({
      guests: [{ id: "g1", name: "Ana" }, { name: "Luis" }],
      attendance: { "svc-ceremony": [true, true], "svc-brunch": [false, false] },
      contactPhone: "",
      contactEmail: "",
    });
    expect(container.textContent).toContain("¡Gracias! Recibimos su confirmación.");
    expect(container.textContent).toContain("2 asistirán: Ana, Luis");
    expect(container.textContent).toContain("No asistirán");
  });

  it("keeps what was typed when the network is gone", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await render(invitation());

    await type(container.querySelector<HTMLInputElement>("input[placeholder='Nombre completo']")!, "Ana Ortiz");
    await act(async () => checkbox(1, "No podremos asistir").click());
    await act(async () => checkbox(2, "No podremos asistir").click());
    await act(async () => button("Enviar confirmación").click());

    expect(container.querySelector("[role='alert']")?.textContent).toContain("Sin conexión");
    expect(container.querySelector<HTMLInputElement>("input[placeholder='Nombre completo']")!.value).toBe("Ana Ortiz");
  });

  it("opens on the saved answer when the household already replied", async () => {
    await render(
      invitation({
        submittedAt: "2026-11-09T00:00:00.000Z",
        guests: [{ id: "g1", name: "Ana", attending: { "svc-ceremony": true } }],
      }),
    );

    expect(container.textContent).toContain("1 asistirán: Ana");
    await act(async () => button("Cambiar mi respuesta").click());
    expect(checkbox(1, "Ana").checked).toBe(true);
    expect(checkbox(2, "No podremos asistir").checked).toBe(true);
  });
});
