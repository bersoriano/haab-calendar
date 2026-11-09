import { describe, expect, it } from "vitest";

import type { Invitation } from "@/lib/invitations";
import {
  appliesTo,
  choiceCounts,
  cleanAnswers,
  parseRsvpQuestions,
  questionLabel,
  type RsvpQuestion,
} from "@/lib/rsvp-questions";
import { toGuestListCsv } from "@/lib/guest-list-csv";

const RECEPTION = "svc-reception";
const BRUNCH = "svc-brunch";

const MENU: RsvpQuestion = {
  id: "menu",
  kind: "choice",
  label: "Menú",
  options: [
    { id: "res", label: "Res" },
    { id: "pescado", label: "Pescado" },
    { id: "veg", label: "Vegetariano" },
  ],
  per: "guest",
  eventIds: [RECEPTION],
};
const DIET: RsvpQuestion = { id: "diet", kind: "text", label: "", options: [], per: "guest", eventIds: [] };
const SHUTTLE: RsvpQuestion = { id: "shuttle", kind: "text", label: "", options: [], per: "invitation", eventIds: [RECEPTION] };

describe("parseRsvpQuestions", () => {
  it("keeps well-formed questions and drops the rest", () => {
    const parsed = parseRsvpQuestions([
      MENU,
      { id: "empty-choice", kind: "choice", label: "Nada", options: [], per: "guest", eventIds: [] },
      { id: "Bad Id!", kind: "text", label: "x", per: "guest" },
      { id: "kind", kind: "rating", label: "x" },
      { id: "menu", kind: "text", label: "Duplicate id" },
      "junk",
    ]);
    expect(parsed.map((question) => question.id)).toEqual(["menu"]);
  });

  it("caps questions, options and lengths, and fixes built-ins to their shape", () => {
    const many = Array.from({ length: 12 }, (_, index) => ({ id: `q${index}`, kind: "text", label: "Q" }));
    expect(parseRsvpQuestions(many)).toHaveLength(10);

    const [wide] = parseRsvpQuestions([
      {
        id: "wide",
        kind: "choice",
        label: "x".repeat(200),
        options: Array.from({ length: 15 }, (_, index) => ({ id: `o${index}`, label: `O${index}` })),
      },
    ]);
    expect(wide.options).toHaveLength(12);
    expect(wide.label).toHaveLength(80);
    expect(wide.per).toBe("guest");
    expect(wide.eventIds).toEqual([]);

    const [diet, shuttle] = parseRsvpQuestions([
      { id: "diet", kind: "choice", per: "invitation", options: [{ id: "a", label: "A" }] },
      { id: "shuttle", kind: "text", per: "guest" },
    ]);
    expect(diet).toMatchObject({ kind: "text", per: "guest", options: [] });
    expect(shuttle).toMatchObject({ kind: "text", per: "invitation" });
    expect(parseRsvpQuestions("nope")).toEqual([]);
  });
});

describe("questionLabel", () => {
  it("uses the planner's label, or the built-in's own in each language", () => {
    expect(questionLabel(MENU, "en")).toBe("Menú");
    expect(questionLabel(DIET, "es")).toBe("Alergias o restricciones alimentarias");
    expect(questionLabel(SHUTTLE, "en")).toBe("Hotel for the shuttle");
  });
});

describe("appliesTo", () => {
  it("asks a question only of people at one of its events", () => {
    expect(appliesTo(MENU, [RECEPTION])).toBe(true);
    expect(appliesTo(MENU, [BRUNCH])).toBe(false);
    expect(appliesTo(DIET, [BRUNCH])).toBe(true);
    expect(appliesTo(DIET, [])).toBe(false);
  });
});

describe("cleanAnswers", () => {
  it("keeps valid answers to questions that apply, and nothing else", () => {
    expect(
      cleanAnswers(
        { menu: "pescado", diet: "  sin gluten ", shuttle: "Hotel Sol", unknown: "x" },
        [MENU, DIET, SHUTTLE],
        "guest",
        [RECEPTION],
      ),
    ).toEqual({ menu: "pescado", diet: "sin gluten" });
  });

  it("drops an option that does not exist and a question the guest's events don't cover", () => {
    expect(cleanAnswers({ menu: "pollo" }, [MENU], "guest", [RECEPTION])).toEqual({});
    expect(cleanAnswers({ menu: "res", diet: "" }, [MENU, DIET], "guest", [BRUNCH])).toEqual({});
  });

  it("trims long text and ignores junk", () => {
    expect(cleanAnswers({ diet: "x".repeat(300) }, [DIET], "guest", [BRUNCH]).diet).toHaveLength(200);
    expect(cleanAnswers("junk", [DIET], "guest", [BRUNCH])).toEqual({});
  });
});

function invitation(overrides: Partial<Invitation>): Invitation {
  return {
    id: "inv",
    displayName: "Familia Ortiz",
    contactPhone: "+52 777 555 0101",
    contactEmail: "ana@example.com",
    seatLimit: 4,
    token: "t".repeat(43),
    notes: "",
    eventIds: [RECEPTION, BRUNCH],
    guests: [],
    submittedAt: "2026-11-05T00:00:00.000Z",
    lastContactedAt: null,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    answers: {},
    ...overrides,
  };
}

const LIST = [
  invitation({
    id: "a",
    answers: { shuttle: "Hotel Sol" },
    guests: [
      { id: "g1", name: "Ana", position: 0, attending: { [RECEPTION]: true }, answers: { menu: "res", diet: "=HYPERLINK(\"x\")" } },
      { id: "g2", name: "", position: 1, attending: { [RECEPTION]: true }, answers: { menu: "pollo" } },
      { id: "g3", name: "Luis", position: 2, attending: { [BRUNCH]: true }, answers: { menu: "res" } },
    ],
  }),
  invitation({
    id: "b",
    displayName: "Sofía Ruiz",
    guests: [{ id: "g4", name: "Sofía", position: 0, attending: { [RECEPTION]: true }, answers: { menu: "veg" } }],
  }),
  invitation({
    id: "c",
    submittedAt: null,
    guests: [{ id: "g5", name: "Pre-ticked", position: 0, attending: { [RECEPTION]: true }, answers: { menu: "res" } }],
  }),
];

describe("choiceCounts", () => {
  it("counts each option among people attending the event, ignoring removed options and silent households", () => {
    expect(choiceCounts(LIST, [MENU, DIET], RECEPTION)).toEqual({ menu: { res: 1, pescado: 0, veg: 1 } });
    expect(choiceCounts(LIST, [MENU], BRUNCH)).toEqual({});
  });
});

describe("toGuestListCsv", () => {
  it("lists attending guests with their answers, safe to open in a spreadsheet", () => {
    const csv = toGuestListCsv({ invitations: LIST, questions: [MENU, DIET, SHUTTLE], serviceId: RECEPTION, lang: "es" });
    const lines = csv.replace(/^﻿/, "").trim().split("\r\n");

    expect(lines[0]).toBe("Invitación,Invitado,Teléfono,Correo,Menú,Alergias o restricciones alimentarias,Hotel para el transporte");
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe(`Familia Ortiz,Ana,+52 777 555 0101,ana@example.com,Res,"'=HYPERLINK(""x"")",Hotel Sol`);
    expect(lines[2]).toBe("Familia Ortiz,Acompañante de Ana,+52 777 555 0101,ana@example.com,pollo (eliminada),,Hotel Sol");
    expect(lines[3]).toBe("Sofía Ruiz,Sofía,+52 777 555 0101,ana@example.com,Vegetariano,,");
  });
});
