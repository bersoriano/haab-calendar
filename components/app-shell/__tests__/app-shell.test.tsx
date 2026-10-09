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
const { Alert } = await import("@/components/ui/Alert");

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

  it("offers a closed menu button for small screens", () => {
    expect(html).toContain('aria-label="Open menu"');
    expect(html).toContain('aria-expanded="false"');
  });
});

describe("Alert", () => {
  it("uses status tokens instead of fixed colors", () => {
    const html = renderToStaticMarkup(<Alert tone="danger">Nope</Alert>);

    expect(html).toContain("var(--danger-soft)");
    expect(html).not.toMatch(/#[0-9a-f]{6}/i);
  });

  it("carries the role it is given", () => {
    expect(renderToStaticMarkup(<Alert tone="success" role="status">Saved</Alert>)).toContain(
      'role="status"',
    );
  });
});
