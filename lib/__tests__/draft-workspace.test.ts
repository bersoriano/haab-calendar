import { describe, expect, it, vi } from "vitest";

import {
  draftSaveMode,
  draftWorkspaceSection,
  draftWorkspaceSections,
  isUnpublishedDraft,
  publishDraft,
} from "@/lib/draft-workspace";
import { createEmptyStore } from "@/lib/store";
import type { AdminTab, ModuleStore } from "@/lib/types";

const ALL: Array<{ value: AdminTab; label: string }> = [
  { value: "dashboard", label: "Dashboard" },
  { value: "bookings", label: "Appointments" },
  { value: "calendar", label: "Calendar" },
  { value: "services", label: "Services" },
  { value: "availability", label: "Availability" },
  { value: "appearance", label: "Appearance" },
  { value: "analytics", label: "Analytics" },
  { value: "integrations", label: "Integrations" },
  { value: "settings", label: "Settings" },
];

/**
 * A draft that has not been published takes no bookings, counts no visits and
 * has no account to connect anything to. Its workspace offers the sections
 * that build the page, in the order the full workspace lists them.
 */
describe("draftWorkspaceSections", () => {
  it("keeps the sections that set the page up", () => {
    expect(draftWorkspaceSections(ALL, true).map((section) => section.value)).toEqual([
      "dashboard",
      "services",
      "availability",
      "appearance",
      "settings",
    ]);
  });

  it("leaves a published workspace every section", () => {
    expect(draftWorkspaceSections(ALL, false)).toEqual(ALL);
  });
});

describe("draftWorkspaceSection", () => {
  it("opens the overview in place of a section a draft does not offer", () => {
    for (const hidden of ["bookings", "calendar", "analytics", "integrations"] as const) {
      expect(draftWorkspaceSection(hidden, true)).toBe("dashboard");
    }
  });

  it("keeps a section a draft does offer", () => {
    expect(draftWorkspaceSection("services", true)).toBe("services");
  });

  it("never moves a published workspace", () => {
    expect(draftWorkspaceSection("bookings", false)).toBe("bookings");
  });
});

/**
 * A draft is a page that lives only in the browser. Signing in does not
 * publish it: an account with a finished draft and no page is still looking
 * at a draft, and must not be shown a dashboard for a page that is not there.
 */
describe("isUnpublishedDraft", () => {
  it("is a signed-out visitor's page", () => {
    expect(isUnpublishedDraft({ integratedMode: false, isGuestDraft: true, persistSetup: false })).toBe(true);
  });

  it("is a signed-in account's page until it is published", () => {
    expect(isUnpublishedDraft({ integratedMode: false, isGuestDraft: false, persistSetup: true })).toBe(true);
  });

  it("is not a page the server already has", () => {
    expect(isUnpublishedDraft({ integratedMode: true, isGuestDraft: false, persistSetup: false })).toBe(false);
    expect(isUnpublishedDraft({ integratedMode: true, isGuestDraft: false, persistSetup: true })).toBe(false);
  });

  it("is not a standalone module that never publishes", () => {
    expect(isUnpublishedDraft({ integratedMode: false, isGuestDraft: false, persistSetup: false })).toBe(false);
  });
});

describe("draftSaveMode", () => {
  it("offers a signed-out visitor the account that publishes the draft", () => {
    expect(draftSaveMode({ loggedIn: false, configured: false, draftFinished: false })).toBe("guest");
    expect(draftSaveMode({ loggedIn: false, configured: false, draftFinished: true })).toBe("guest");
  });

  it("offers a signed-in account to publish a finished draft", () => {
    expect(draftSaveMode({ loggedIn: true, configured: false, draftFinished: true })).toBe("account");
  });

  it("only says where the draft is while a signed-in account is still in setup", () => {
    // Setup's last step publishes; a button here would skip its checks.
    expect(draftSaveMode({ loggedIn: true, configured: false, draftFinished: false })).toBe("setup");
  });

  it("has nothing to say once the page is published", () => {
    expect(draftSaveMode({ loggedIn: true, configured: true, draftFinished: true })).toBeNull();
  });
});

describe("publishDraft", () => {
  const draft: ModuleStore = {
    ...createEmptyStore(),
    vertical: "healthcare",
    provider: { ...createEmptyStore().provider, businessName: "Nav Draft Clinic" },
  };

  function respond(status: number, body: unknown) {
    return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
  }

  it("sends the draft as a finished page with a link of its own", async () => {
    const fetcher = respond(200, { store: draft });

    await publishDraft(draft, fetcher);

    expect(fetcher).toHaveBeenCalledWith(
      "/api/provider/store",
      expect.objectContaining({ method: "PUT" }),
    );
    const sent = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as { store: ModuleStore };
    expect(sent.store.setupComplete).toBe(true);
    expect(sent.store.provider.publicSlug).toBe("nav-draft-clinic");
  });

  it("returns the page as the server saved it", async () => {
    const saved = { ...draft, setupComplete: true, provider: { ...draft.provider, publicSlug: "from-server" } };
    const result = await publishDraft(draft, respond(200, { store: saved }));

    expect(result).toMatchObject({ ok: true });
    expect(result.ok && result.store.provider.publicSlug).toBe("from-server");
  });

  it("passes on the server's reason for refusing", async () => {
    const result = await publishDraft(draft, respond(409, { userMessage: "That link is taken." }));

    expect(result).toEqual({ ok: false, reason: "refused", message: "That link is taken." });
  });

  it("treats an answer without a page as a refusal", async () => {
    expect(await publishDraft(draft, respond(200, {}))).toEqual({ ok: false, reason: "refused" });
  });

  it("says when the server could not be reached", async () => {
    const offline = vi.fn<typeof fetch>(async () => {
      throw new TypeError("Failed to fetch");
    });

    expect(await publishDraft(draft, offline)).toEqual({ ok: false, reason: "unreachable" });
  });
});
