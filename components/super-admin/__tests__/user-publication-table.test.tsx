import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/super-admin/accounts",
}));

import { UserPublicationTable } from "@/components/super-admin/UserPublicationTable";
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
    expect(html).toMatch(/aria-pressed="true"[^>]*>Publishing off<|>Publishing off</);
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
