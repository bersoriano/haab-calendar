import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOwnerProvider: vi.fn(),
  listInvitations: vi.fn(),
  getInvitation: vi.fn(),
  markContacted: vi.fn(),
  getInvitationPage: vi.fn(),
  clock: { last_bulk_reminder_at: null as string | null },
  stamp: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/supabase/provider-clients", () => ({ getOwnerProvider: mocks.getOwnerProvider }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: mocks.clock, error: null }) }) }),
      update: (values: unknown) => ({
        eq: async () => {
          mocks.stamp(values);
          return { error: null };
        },
      }),
    }),
  }),
}));
vi.mock("@/lib/supabase/invitations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/invitations")>();
  return {
    ...actual,
    listInvitations: mocks.listInvitations,
    getInvitation: mocks.getInvitation,
    markContacted: mocks.markContacted,
  };
});
vi.mock("@/lib/supabase/invitation-sending", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/invitation-sending")>();
  return { ...actual, getInvitationPage: mocks.getInvitationPage };
});

import { POST as EMAIL } from "@/app/api/provider/invitations/[invitationId]/email/route";
import { POST as REMIND } from "@/app/api/provider/invitations/remind/route";

const PAGE = {
  businessName: "Boda de Valeria & Diego",
  email: "planner@example.com",
  language: "es",
  deadline: "2026-12-20",
  vertical: "events",
  slug: "boda-valeria-y-diego",
};

function invitation(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    displayName: `Familia ${id}`,
    contactEmail: `${id}@example.com`,
    contactPhone: "",
    token: "t".repeat(43),
    eventIds: ["svc"],
    guests: [],
    submittedAt: null,
    ...overrides,
  };
}

function resendAccepts() {
  mocks.fetch.mockImplementation(async (_url: string, init: RequestInit) => {
    const batch = JSON.parse(String(init.body)) as unknown[];
    return new Response(JSON.stringify({ data: batch.map((_, index) => ({ id: `email-${index}` })) }));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("BOOKING_EMAIL_FROM", "Haab <hola@haabcalendar.com>");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.clock.last_bulk_reminder_at = null;
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null });
  mocks.getOwnerProvider.mockResolvedValue({ id: "provider-1", timezone: "UTC" });
  mocks.getInvitationPage.mockResolvedValue(PAGE);
  resendAccepts();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/provider/invitations/remind", () => {
  it("says email is not set up, and marks nobody contacted, without a key", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    const response = await REMIND();

    expect(response.status).toBe(503);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.markContacted).not.toHaveBeenCalled();
  });

  it("refuses a second round inside 24 hours and says when the next is allowed", async () => {
    mocks.clock.last_bulk_reminder_at = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const response = await REMIND();

    expect(response.status).toBe(429);
    expect((await response.json()).nextAllowedAt).toEqual(expect.any(String));
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("emails only unanswered households with an address, from the planner, and starts the clock", async () => {
    mocks.listInvitations.mockResolvedValue([
      invitation("a"),
      invitation("b", { submittedAt: "2026-11-01T00:00:00Z" }),
      invitation("c", { contactEmail: "" }),
      invitation("d", { eventIds: [] }),
      invitation("e"),
    ]);

    const response = await REMIND();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: 2 });
    const [, init] = mocks.fetch.mock.calls[0];
    const batch = JSON.parse(String(init.body));
    expect(batch.map((message: { to: string[] }) => message.to[0])).toEqual(["a@example.com", "e@example.com"]);
    expect(batch[0].reply_to).toBe("planner@example.com");
    expect(batch[0].subject).toBe("Recordatorio: confirme su asistencia a Boda de Valeria & Diego");
    expect(batch[0].text).toContain("/events/boda-valeria-y-diego/i/");
    expect(mocks.stamp).toHaveBeenCalledWith({ last_bulk_reminder_at: expect.any(String) });
    expect(mocks.markContacted).toHaveBeenCalledWith(expect.anything(), "provider-1", ["a", "e"]);
  });

  it("does not start the clock when nobody needs a reminder", async () => {
    mocks.listInvitations.mockResolvedValue([invitation("b", { submittedAt: "2026-11-01T00:00:00Z" })]);

    const response = await REMIND();

    expect(await response.json()).toEqual({ sent: 0 });
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.stamp).not.toHaveBeenCalled();
  });
});

describe("POST /api/provider/invitations/[id]/email", () => {
  function send(kind: string) {
    return EMAIL(new NextRequest("http://localhost", { method: "POST", body: JSON.stringify({ kind }) }), {
      params: Promise.resolve({ invitationId: "a" }),
    });
  }

  it("refuses an invitation without an email address", async () => {
    mocks.getInvitation.mockResolvedValue(invitation("a", { contactEmail: "" }));

    const response = await send("invite");

    expect(response.status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("sends the invitation and records the contact", async () => {
    mocks.getInvitation.mockResolvedValue(invitation("a"));

    const response = await send("invite");

    expect(response.status).toBe(200);
    const [, init] = mocks.fetch.mock.calls[0];
    expect(JSON.parse(String(init.body))[0].subject).toBe("Su invitación: Boda de Valeria & Diego");
    expect(mocks.markContacted).toHaveBeenCalledWith(expect.anything(), "provider-1", ["a"]);
  });

  it("marks nobody contacted when Resend refuses", async () => {
    mocks.getInvitation.mockResolvedValue(invitation("a"));
    mocks.fetch.mockResolvedValue(new Response("{}", { status: 422 }));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await send("reminder");

    expect(response.status).toBe(500);
    expect(mocks.markContacted).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
