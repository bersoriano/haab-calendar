import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getPublicInvitation: vi.fn(), submitPublicRsvp: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/invitations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/invitations")>();
  return { ...actual, getPublicInvitation: mocks.getPublicInvitation, submitPublicRsvp: mocks.submitPublicRsvp };
});

import { GET, POST } from "@/app/api/public/[verticalSegment]/[providerSlug]/invitations/[token]/route";
import { InvitationWriteError } from "@/lib/supabase/invitations";

const GOOD_TOKEN = "a".repeat(43);

function context(token: string, providerSlug = "boda-valeria-y-diego") {
  return { params: Promise.resolve({ verticalSegment: "events", providerSlug, token }) };
}

function post(body: unknown) {
  return new NextRequest("http://localhost/api/public/events/boda/invitations/x", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("public invitation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The data layer turns a malformed or unknown token into "nothing found".
    mocks.getPublicInvitation.mockResolvedValue(null);
  });

  it("answers a malformed and an unknown token with the same 404", async () => {
    const malformed = await GET(new NextRequest("http://localhost"), context("short"));
    const unknown = await GET(new NextRequest("http://localhost"), context(GOOD_TOKEN));

    expect(malformed.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(await malformed.json()).toEqual(await unknown.json());
  });

  it("answers a submit to a bad link with the same 404", async () => {
    mocks.submitPublicRsvp.mockRejectedValue(new InvitationWriteError("This invitation link is not valid.", 404));

    const response = await POST(post({ guests: [] }), context(GOOD_TOKEN));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ userMessage: "This invitation link is not valid." });
  });

  it("returns a household's mistake as a 400 and a double submit as a 429", async () => {
    mocks.submitPublicRsvp.mockRejectedValueOnce(
      new InvitationWriteError("Your invitation is for 2. Remove a guest to continue.", 400),
    );
    const tooMany = await POST(post({ guests: [{}, {}, {}] }), context(GOOD_TOKEN));
    expect(tooMany.status).toBe(400);

    mocks.submitPublicRsvp.mockRejectedValueOnce(new InvitationWriteError("Wait a moment.", 429));
    const twice = await POST(post({ guests: [] }), context(GOOD_TOKEN));
    expect(twice.status).toBe(429);
  });

  it("refuses a body that is not JSON before touching the database", async () => {
    const response = await POST(post("{not json"), context(GOOD_TOKEN));

    expect(response.status).toBe(400);
    expect(mocks.submitPublicRsvp).not.toHaveBeenCalled();
  });

  it("saves an answer and returns the invitation without caching", async () => {
    mocks.submitPublicRsvp.mockResolvedValue({ displayName: "Familia Ortiz" });

    const response = await POST(post({ guests: [], attendance: {} }), context(GOOD_TOKEN));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.submitPublicRsvp).toHaveBeenCalledWith(
      expect.anything(),
      { vertical: "events", providerSlug: "boda-valeria-y-diego", token: GOOD_TOKEN },
      { guests: [], attendance: {} },
    );
  });
});
