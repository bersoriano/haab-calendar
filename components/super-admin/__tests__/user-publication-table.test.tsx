import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/super-admin/accounts",
}));

import { UserPublicationTable } from "@/components/super-admin/UserPublicationTable";
import { resolveEntitlements } from "@/lib/entitlements/resolve";
import type { ManagedUserSummary } from "@/lib/supabase/publication";

const users: ManagedUserSummary[] = [
  {
    id: "34f91e76-c1d7-47bd-9c1f-8f67c08c5c69",
    email: "bsorianodev@gmail.com",
    createdAt: "2026-07-01T12:00:00.000Z",
    emailConfirmedAt: "2026-07-01T12:05:00.000Z",
    lastSignInAt: "2026-07-23T05:30:00.000Z",
    publishingEnabled: true,
    superAdmin: true,
    demoOwner: false,
    workflow: {
      businessName: "Haab Admin",
      setupComplete: true,
      publicPath: "/professional/haab-admin",
    },
  },
  {
    id: "74fd3d46-3e85-4dc3-8ce3-a20f89f09d45",
    email: "new-user@example.com",
    createdAt: "2026-07-20T12:00:00.000Z",
    publishingEnabled: false,
    superAdmin: false,
    demoOwner: false,
  },
];

describe("UserPublicationTable", () => {
  it("renders confirmed, unconfirmed, workflow, and publication states", () => {
    const html = renderToStaticMarkup(
      <UserPublicationTable initialUsers={users} />,
    );

    expect(html).toContain("bsorianodev@gmail.com");
    expect(html).toContain("Registered accounts and access controls");
    expect(html).toContain("Super admin");
    expect(html).toContain("Haab Admin");
    expect(html).toContain("Confirmed");
    expect(html).toContain("new-user@example.com");
    expect(html).toContain("No workflow created");
    expect(html).toContain("Unconfirmed");
    expect(html).toContain("Disable publishing");
    expect(html).toContain("Enable publishing");
    expect(html).toContain("Protected account");
    expect(html).toContain("Delete account");
  });

  it("renders the empty state", () => {
    const html = renderToStaticMarkup(
      <UserPublicationTable initialUsers={[]} />,
    );

    expect(html).toContain("No registered users");
  });

  it("offers search and publishing filters", () => {
    const html = renderToStaticMarkup(<UserPublicationTable initialUsers={users} />);

    expect(html).toContain('type="search"');
    expect(html).toContain('aria-label="Search accounts"');
    for (const label of ["All", "Publishing on", "Publishing off"]) {
      expect(html).toContain(`>${label}<`);
    }
    expect(html).toContain("2 of 2 accounts");
  });

  it("starts from the filters in the link", () => {
    const html = renderToStaticMarkup(
      <UserPublicationTable initialUsers={users} initialStatus="disabled" />,
    );

    expect(html).toContain("new-user@example.com");
    expect(html).not.toContain("bsorianodev@gmail.com");
    expect(html).toContain("1 of 2 accounts");
    expect(html).toMatch(/role="radio" aria-checked="true"[^>]*>Publishing off</);
  });

  it("counts each publishing state for the current search", () => {
    const html = renderToStaticMarkup(<UserPublicationTable initialUsers={users} />);

    expect(html).toMatch(/>All<span[^>]*>2<\/span>/);
    expect(html).toMatch(/>Publishing on<span[^>]*>1<\/span>/);
    expect(html).toMatch(/>Publishing off<span[^>]*>1<\/span>/);
  });

  it("lays accounts out as a table on wide screens and as cards below", () => {
    const html = renderToStaticMarkup(<UserPublicationTable initialUsers={users} />);

    expect(html).toContain("<table");
    expect(html).toMatch(/<th[^>]*>Account<\/th>/);
    expect(html).toMatch(/<th[^>]*>Publishing<\/th>/);
    // Both layouts render; CSS shows one.
    expect(html.match(/new-user@example.com/g)?.length).toBe(2);
  });

  it("links a live workflow's public page in a new tab", () => {
    const html = renderToStaticMarkup(<UserPublicationTable initialUsers={users} />);

    expect(html).toMatch(/<a[^>]*href="\/professional\/haab-admin"[^>]*target="_blank"/);
  });

  it("opens premium access from a Features button once a provider exists", () => {
    const withProvider: ManagedUserSummary = {
      ...users[1],
      provider: {
        id: "00000000-0000-4000-8000-000000000001",
        planTier: "free",
        entitlements: resolveEntitlements({
          providerId: "00000000-0000-4000-8000-000000000001",
          planTier: "free",
          overrides: [],
          now: new Date("2026-08-15T12:00:00.000Z"),
        }),
      },
    };
    const html = renderToStaticMarkup(<UserPublicationTable initialUsers={[withProvider]} />);

    expect(html).toMatch(/>Features<span class="sr-only"> for new-user@example.com<\/span><\/button>/);
    expect(html).toContain("free plan");
    expect(html).toContain("0 of 6 enabled");
  });

  it("says when a search matches nobody", () => {
    const html = renderToStaticMarkup(
      <UserPublicationTable initialUsers={users} initialQuery="zzz-nobody" />,
    );

    expect(html).toContain("No accounts match");
    expect(html).not.toContain("No registered users");
  });

  it("fits beside the sidebar instead of scrolling sideways", () => {
    const html = renderToStaticMarkup(<UserPublicationTable initialUsers={users} />);

    expect(html).not.toContain("min-w-[1120px]");
  });
});
