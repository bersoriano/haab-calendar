import { describe, expect, it } from "vitest";

import { buildInvitationEmail, buildInvitationMessage, whatsappUrl } from "@/lib/invitation-messages";

const base = {
  displayName: "Familia Ortiz",
  pageName: "Boda de Valeria & Diego",
  link: "https://haabcalendar.com/events/boda/i/abc",
};

describe("buildInvitationMessage", () => {
  it("invites in Spanish with the link and the deadline", () => {
    const text = buildInvitationMessage({ ...base, lang: "es", kind: "invite", deadline: "2026-12-20" });
    expect(text).toContain("Familia Ortiz");
    expect(text).toContain("Boda de Valeria & Diego");
    expect(text).toContain(base.link);
    expect(text).toContain("20 de diciembre de 2026");
  });

  it("reminds in English, and leaves the date out when there is none", () => {
    const text = buildInvitationMessage({ ...base, lang: "en", kind: "reminder" });
    expect(text).toContain("Familia Ortiz");
    expect(text).toContain(base.link);
    expect(text).not.toMatch(/by \w+ \d/);
  });
});

describe("buildInvitationEmail", () => {
  it("has a subject naming the page and the message as its body", () => {
    const email = buildInvitationEmail({ ...base, lang: "es", kind: "reminder", deadline: "2026-12-20" });
    expect(email.subject).toContain("Boda de Valeria & Diego");
    expect(email.text).toBe(buildInvitationMessage({ ...base, lang: "es", kind: "reminder", deadline: "2026-12-20" }));
  });
});

describe("whatsappUrl", () => {
  it("keeps only the phone's digits", () => {
    expect(whatsappUrl("+52 (777) 555-0101", "hola")).toBe("https://wa.me/527775550101?text=hola");
  });

  it("lets the planner pick the contact when there is no phone", () => {
    expect(whatsappUrl("", "hola & adiós")).toBe(`https://wa.me/?text=${encodeURIComponent("hola & adiós")}`);
  });
});
