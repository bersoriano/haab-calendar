import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { AppShell } = await import("@/components/app-shell/AppShell");
const { SidebarNav } = await import("@/components/app-shell/SidebarNav");
const { ShellFooter } = await import("@/components/app-shell/ShellFooter");
const { ShellAccount, ShellBrand, ShellWorkspace } = await import(
  "@/components/app-shell/ShellSidebarParts"
);

const groups = [
  {
    id: "operate",
    label: "Operate",
    items: [
      { id: "dashboard", href: "/dashboard", label: "Overview", icon: "overview" as const },
      { id: "bookings", href: "/dashboard/bookings", label: "Bookings", icon: "bookings" as const },
    ],
  },
];

describe("SidebarNav", () => {
  it("renders real links and marks only the active one", () => {
    const html = renderToStaticMarkup(
      <SidebarNav groups={groups} activeId="bookings" ariaLabel="Dashboard" />,
    );

    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/dashboard/bookings"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/<a[^>]*href="\/dashboard\/bookings"[^>]*aria-current="page"|<a[^>]*aria-current="page"[^>]*href="\/dashboard\/bookings"/);
    expect(html).toContain('aria-label="Dashboard"');
  });

  it("keeps real hrefs when the host navigates client-side", () => {
    const html = renderToStaticMarkup(
      <SidebarNav
        groups={groups}
        activeId="dashboard"
        ariaLabel="Dashboard"
        onNavigate={() => undefined}
      />,
    );

    expect(html).toContain('href="/dashboard/bookings"');
  });

  it("colors the active item from app tokens", () => {
    const html = renderToStaticMarkup(
      <SidebarNav groups={groups} activeId="bookings" ariaLabel="Dashboard" />,
    );
    expect(html).toContain("text-app-accent");
    expect(html).not.toContain("var(--");
  });

  it("shows a badge when an item carries one", () => {
    const html = renderToStaticMarkup(
      <SidebarNav
        groups={[
          {
            id: "admin",
            items: [
              { id: "cleanups", href: "/super-admin/cleanups", label: "Cleanups", icon: "cleanups", badge: 2 },
            ],
          },
        ]}
        activeId="none"
        ariaLabel="Super admin"
      />,
    );

    expect(html).toContain(">2<");
  });
});

describe("AppShell", () => {
  const html = renderToStaticMarkup(
    <AppShell
      sidebar={<p>sidebar</p>}
      title="Bookings"
      description="Every booking"
      footer={
        <ShellFooter links={[{ href: "/terms", label: "Terms" }]} note="© 2026 Haab Calendar" />
      }
      copy={{ skipToContent: "Skip to content", openMenu: "Open menu", closeMenu: "Close menu" }}
      navigationKey="bookings"
    >
      <p>content</p>
    </AppShell>,
  );

  it("has one h1, a skip link and a main landmark", () => {
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('id="main-content"');
  });

  it("names the page and describes it", () => {
    expect(html).toMatch(/<h1[^>]*>Bookings<\/h1>/);
    expect(html).toContain("Every booking");
  });

  it("renders the footer links", () => {
    expect(html).toContain('href="/terms"');
    expect(html).toContain("© 2026 Haab Calendar");
  });

  it("paints the page on the app canvas", () => {
    expect(html).toContain("bg-app-canvas");
    expect(html).not.toContain("var(--");
  });

  it("offers a closed menu button for small screens", () => {
    expect(html).toContain('aria-label="Open menu"');
    expect(html).toContain('aria-expanded="false"');
  });
});

describe("sidebar parts", () => {
  const longName = "The Extremely Long Family Medicine And Pediatrics Practice Of Doctor Rivera";
  const longEmail = "someone.with.a.very.long.address@an-extremely-long-domain-example.com";

  it("links the brand home and shows an optional badge", () => {
    const html = renderToStaticMarkup(<ShellBrand href="/super-admin" badge={<span>Super admin</span>} />);
    expect(html).toContain('href="/super-admin"');
    expect(html).toContain("Haab Calendar");
    expect(html).toContain("Super admin");
  });

  it("truncates a long business name and keeps it in a title", () => {
    const html = renderToStaticMarkup(
      <ShellWorkspace name={longName} status={{ tone: "success", label: "Live" }} />,
    );
    expect(html).toContain(`title="${longName}"`);
    expect(html).toContain("truncate");
    expect(html).toContain("Live");
  });

  it("keeps sign-out reachable beside a long email", () => {
    const html = renderToStaticMarkup(
      <ShellAccount
        email={longEmail}
        signedInAsLabel="Signed in as"
        signOutLabel="Sign out"
        signOutAction={async () => undefined}
      />,
    );
    expect(html).toContain(`title="${longEmail}"`);
    expect(html).toContain("min-w-0 flex-1");
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*aria-label="Sign out"|<button[^>]*aria-label="Sign out"[^>]*type="submit"/);
  });
});
