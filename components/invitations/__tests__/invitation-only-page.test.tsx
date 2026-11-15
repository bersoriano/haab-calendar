import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InvitationOnlyPage } from "@/components/invitations/InvitationOnlyPage";
import type { ModuleStore, Service } from "@/lib/types";

function service(id: string, name: string, slug: string): Service {
  return {
    id,
    name,
    slug,
    bookingType: "appointment",
    durationMinutes: 120,
    description: `${name} description`,
    occurrenceMode: "single",
    occurrenceDate: "2027-01-23",
    startTime: "16:30",
    endTime: "23:30",
    notes: "Formal de jardín.",
    linkedAddress1: true,
    cost: "Sin costo",
  } as Service;
}

const store = {
  vertical: "events",
  provider: {
    fullName: "Mariana Salgado",
    businessName: "Boda de Valeria & Diego",
    email: "",
    phoneNumber1: "",
    phoneNumber2: "",
    address1: "Jardín de la hacienda, Xochitepec",
    address2: "",
    publicSlug: "boda-valeria-y-diego",
    language: "es",
    rsvpMode: "invitations",
    heroText: "Nos elegimos, hoy y siempre.",
  },
  services: [service("s1", "Ceremonia y recepción", "ceremonia"), service("s2", "Tornaboda", "tornaboda")],
} as unknown as ModuleStore;

describe("InvitationOnlyPage", () => {
  it("shows every event and where to answer, with nothing to book", () => {
    const html = renderToStaticMarkup(
      <InvitationOnlyPage store={store} vertical="events" lang="es" path="/events/boda-valeria-y-diego" />,
    );

    expect(html).toContain("Ceremonia y recepción");
    expect(html).toContain("Tornaboda");
    expect(html).toContain("Jardín de la hacienda, Xochitepec");
    expect(html).toContain("Formal de jardín.");
    expect(html).toContain("Nos elegimos, hoy y siempre.");
    expect(html).toContain("Para confirmar, abra el enlace personal que le enviaron.");
    expect(html).not.toContain("Ver fecha");
    expect(html).not.toContain("Sin costo");
    expect(html).not.toMatch(/<button/);
  });

  it("shows only the event of an event's own URL", () => {
    const html = renderToStaticMarkup(
      <InvitationOnlyPage store={store} vertical="events" lang="en" path="/events/x/tornaboda" serviceSlug="tornaboda" />,
    );

    expect(html).toContain("Tornaboda");
    expect(html).not.toContain("Ceremonia y recepción");
    expect(html).toContain("To RSVP, open the personal link you were sent.");
  });
});
