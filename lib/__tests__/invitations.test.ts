import { describe, expect, it } from "vitest";

import {
  guestLabel,
  invitationPath,
  isWellFormedInvitationToken,
  overallState,
  parseGuestPaste,
  responseState,
  totalsByEvent,
  validateRsvpSubmission,
  type Invitation,
} from "@/lib/invitations";
import { generateInvitationToken, hashInvitationToken } from "@/lib/invitation-tokens";

const CEREMONY = "svc-ceremony";
const BRUNCH = "svc-brunch";

function invitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    id: "inv-1",
    displayName: "Familia Ortiz",
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

function guest(id: string, name: string, attending: Record<string, boolean> = {}) {
  return { id, name, position: 0, attending };
}

describe("responseState", () => {
  it("is null for an event the invitation does not cover", () => {
    expect(responseState(invitation({ eventIds: [CEREMONY] }), BRUNCH)).toBeNull();
  });

  it("stays no answer until the household submits, even if the planner pre-ticked", () => {
    const pending = invitation({ guests: [guest("g1", "Ana", { [CEREMONY]: true })] });
    expect(responseState(pending, CEREMONY)).toBe("no_answer");
  });

  it("is attending when anyone attends, declined when nobody does", () => {
    const answered = invitation({
      submittedAt: "2026-11-02T00:00:00.000Z",
      guests: [guest("g1", "Ana", { [CEREMONY]: true, [BRUNCH]: false })],
    });
    expect(responseState(answered, CEREMONY)).toBe("attending");
    expect(responseState(answered, BRUNCH)).toBe("declined");
    expect(overallState(answered)).toBe("partial");
  });

  it("sums up a whole invitation", () => {
    expect(overallState(invitation())).toBe("no_answer");
    const allIn = invitation({
      submittedAt: "2026-11-02T00:00:00.000Z",
      guests: [guest("g1", "Ana", { [CEREMONY]: true, [BRUNCH]: true })],
    });
    expect(overallState(allIn)).toBe("attending");
    const allOut = invitation({ submittedAt: "2026-11-02T00:00:00.000Z", guests: [] });
    expect(overallState(allOut)).toBe("declined");
  });
});

describe("totalsByEvent", () => {
  it("counts people, answers and silences per event", () => {
    const list = [
      invitation({
        id: "a",
        submittedAt: "2026-11-02T00:00:00.000Z",
        guests: [
          guest("g1", "Ana", { [CEREMONY]: true, [BRUNCH]: true }),
          guest("g2", "", { [CEREMONY]: true, [BRUNCH]: false }),
        ],
      }),
      invitation({ id: "b", submittedAt: "2026-11-02T00:00:00.000Z", guests: [guest("g3", "Luis")] }),
      invitation({ id: "c", eventIds: [CEREMONY] }),
    ];

    expect(totalsByEvent(list, [CEREMONY, BRUNCH])).toEqual([
      {
        serviceId: CEREMONY,
        attendingPeople: 2,
        attendingInvitations: 1,
        declinedInvitations: 1,
        noAnswerInvitations: 1,
        invitedInvitations: 3,
      },
      {
        serviceId: BRUNCH,
        attendingPeople: 1,
        attendingInvitations: 1,
        declinedInvitations: 1,
        noAnswerInvitations: 0,
        invitedInvitations: 2,
      },
    ]);
  });

  it("ignores answers for an event that no longer exists", () => {
    const list = [
      invitation({
        submittedAt: "2026-11-02T00:00:00.000Z",
        eventIds: [CEREMONY, "svc-gone"],
        guests: [guest("g1", "Ana", { [CEREMONY]: true, "svc-gone": true })],
      }),
    ];
    expect(totalsByEvent(list, [CEREMONY]).map((total) => total.serviceId)).toEqual([CEREMONY]);
  });
});

describe("guestLabel", () => {
  it("uses the name, or names an unnamed companion after the first named guest", () => {
    const guests = [{ name: "Ana" }, { name: "" }, { name: "  " }];
    expect(guestLabel(guests[0], 0, guests, "en")).toBe("Ana");
    expect(guestLabel(guests[1], 1, guests, "en")).toBe("Guest of Ana");
    expect(guestLabel(guests[2], 2, guests, "es")).toBe("Acompañante de Ana");
  });

  it("numbers guests when nobody is named", () => {
    const guests = [{ name: "" }, { name: "" }];
    expect(guestLabel(guests[1], 1, guests, "en")).toBe("Guest 2");
    expect(guestLabel(guests[0], 0, guests, "es")).toBe("Invitado 1");
  });
});

describe("parseGuestPaste", () => {
  it("reads a Spanish header in any column order, tab separated", () => {
    const result = parseGuestPaste(
      "Correo\tNombre\tLugares\tWhatsApp\nana@example.com\tFamilia Ortiz\t4\t+52 777 555 0101\n",
      2,
    );
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      { displayName: "Familia Ortiz", contactPhone: "+52 777 555 0101", contactEmail: "ana@example.com", seatLimit: 4 },
    ]);
  });

  it("reads headerless rows as name, phone, email, seats and finds an email anywhere", () => {
    const result = parseGuestPaste("Familia Ortiz, +52 777 555 0101, , 3\nLuis Pérez; luis@example.com\n\n", 2);
    expect(result.rows).toEqual([
      { displayName: "Familia Ortiz", contactPhone: "+52 777 555 0101", contactEmail: "", seatLimit: 3 },
      { displayName: "Luis Pérez", contactPhone: "", contactEmail: "luis@example.com", seatLimit: 2 },
    ]);
  });

  it("treats a list of names only as guests, not as a header", () => {
    const result = parseGuestPaste("Familia Ortiz\nLuis Pérez", 3);
    expect(result.rows.map((row) => [row.displayName, row.seatLimit])).toEqual([
      ["Familia Ortiz", 3],
      ["Luis Pérez", 3],
    ]);
  });

  it("reports junk seats, missing names and bad emails by line", () => {
    const result = parseGuestPaste(
      "nombre,lugares,correo\nFamilia Ortiz,muchos,\n,2,\nAna,2,not-an-email\nLuis,25,\nSofía,2,sofia@example.com",
      2,
    );
    expect(result.rows.map((row) => row.displayName)).toEqual(["Sofía"]);
    expect(result.errors).toEqual([
      { line: 2, reason: "bad_seats" },
      { line: 3, reason: "missing_name" },
      { line: 4, reason: "bad_email" },
      { line: 5, reason: "bad_seats" },
    ]);
  });
});

describe("validateRsvpSubmission", () => {
  const target = { seatLimit: 2, eventIds: [CEREMONY, BRUNCH], guests: [guest("g1", "Ana")] };

  it("normalizes a valid answer and fills events left out as not attending", () => {
    const result = validateRsvpSubmission(
      { guests: [{ id: "g1", name: " Ana " }, { name: "" }], attendance: { [CEREMONY]: [true, true] } },
      target,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        guests: [{ id: "g1", name: "Ana" }, { name: "" }],
        attendance: { [CEREMONY]: [true, true], [BRUNCH]: [false, false] },
        contactPhone: undefined,
        contactEmail: undefined,
      },
    });
  });

  it("accepts nobody attending anything", () => {
    const result = validateRsvpSubmission({ guests: [], attendance: {} }, target);
    expect(result.ok).toBe(true);
  });

  it("refuses more guests than seats, unknown events, misaligned answers and strangers", () => {
    const three = [{ name: "A" }, { name: "B" }, { name: "C" }];
    expect(validateRsvpSubmission({ guests: three, attendance: {} }, target)).toEqual({ ok: false, reason: "too_many_guests" });
    expect(
      validateRsvpSubmission({ guests: [{ name: "A" }], attendance: { "svc-other": [true] } }, target),
    ).toEqual({ ok: false, reason: "unknown_event" });
    expect(
      validateRsvpSubmission({ guests: [{ name: "A" }], attendance: { [CEREMONY]: [true, false] } }, target),
    ).toEqual({ ok: false, reason: "bad_attendance" });
    expect(
      validateRsvpSubmission({ guests: [{ id: "g-stranger", name: "A" }], attendance: {} }, target),
    ).toEqual({ ok: false, reason: "unknown_guest" });
    expect(validateRsvpSubmission({ guests: [{ name: "x".repeat(121) }], attendance: {} }, target)).toEqual({
      ok: false,
      reason: "name_too_long",
    });
    expect(
      validateRsvpSubmission({ guests: [], attendance: {}, contactEmail: "nope" }, target),
    ).toEqual({ ok: false, reason: "bad_contact" });
    expect(validateRsvpSubmission("junk", target)).toEqual({ ok: false, reason: "bad_attendance" });
  });
});

describe("validateRsvpSubmission with questions", () => {
  const menu = {
    id: "menu",
    kind: "choice" as const,
    label: "Menú",
    options: [{ id: "res", label: "Res" }],
    per: "guest" as const,
    eventIds: [CEREMONY],
  };
  const shuttle = { id: "shuttle", kind: "text" as const, label: "", options: [], per: "invitation" as const, eventIds: [] };
  const target = { seatLimit: 2, eventIds: [CEREMONY, BRUNCH], guests: [] };

  it("keeps each guest's answers for the events they attend, and the household's once", () => {
    const result = validateRsvpSubmission(
      {
        guests: [{ name: "Ana" }, { name: "Luis" }],
        attendance: { [CEREMONY]: [true, false], [BRUNCH]: [false, true] },
        guestAnswers: [{ menu: "res" }, { menu: "res" }],
        answers: { shuttle: "Hotel Sol", menu: "res" },
      },
      target,
      [menu, shuttle],
    );
    expect(result.ok && result.value.guestAnswers).toEqual([{ menu: "res" }, {}]);
    expect(result.ok && result.value.answers).toEqual({ shuttle: "Hotel Sol" });
  });

  it("leaves answers alone when the request does not send them, and refuses misaligned ones", () => {
    const untouched = validateRsvpSubmission({ guests: [{ name: "Ana" }], attendance: {} }, target, [menu]);
    expect(untouched.ok && "guestAnswers" in untouched.value).toBe(false);

    expect(
      validateRsvpSubmission({ guests: [{ name: "Ana" }], attendance: {}, guestAnswers: [{}, {}] }, target, [menu]),
    ).toEqual({ ok: false, reason: "bad_attendance" });
  });
});

describe("tokens and links", () => {
  it("makes a 43-character token whose hash matches", () => {
    const { token, tokenHash } = generateInvitationToken();
    expect(isWellFormedInvitationToken(token)).toBe(true);
    expect(hashInvitationToken(token)).toBe(tokenHash);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(generateInvitationToken().token).not.toBe(token);
  });

  it("rejects malformed tokens", () => {
    expect(isWellFormedInvitationToken("short")).toBe(false);
    expect(isWellFormedInvitationToken(`${"a".repeat(42)}!`)).toBe(false);
  });

  it("builds the invitation path under the page", () => {
    expect(invitationPath("events", "boda-valeria-y-diego", "abc")).toBe("/events/boda-valeria-y-diego/i/abc");
  });
});
