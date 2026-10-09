import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/super-admin" }));

vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/app/login/actions", () => ({ logout: () => undefined }));

const { SuperAdminShell } = await import("@/components/super-admin/SuperAdminShell");

function render(pathname: string, pendingCleanups = 0) {
  nav.pathname = pathname;
  return renderToStaticMarkup(
    <SuperAdminShell email="admin@example.com" pendingCleanups={pendingCleanups}>
      <p>page</p>
    </SuperAdminShell>,
  );
}

describe("SuperAdminShell", () => {
  beforeEach(() => {
    nav.pathname = "/super-admin";
  });

  it("links every super-admin page and the owner's own dashboard", () => {
    const html = render("/super-admin");

    for (const href of [
      "/super-admin",
      "/super-admin/accounts",
      "/super-admin/demo-pages",
      "/super-admin/cleanups",
      "/dashboard",
    ]) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  it("marks the page it is on and titles it", () => {
    const html = render("/super-admin/accounts");

    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/<a[^>]*href="\/super-admin\/accounts"[^>]*aria-current="page"|<a[^>]*aria-current="page"[^>]*href="\/super-admin\/accounts"/);
    expect(html).toMatch(/<h1[^>]*>Accounts<\/h1>/);
  });

  it("counts queued cleanups in the navigation", () => {
    expect(render("/super-admin", 2)).toMatch(/Cleanups<\/span><span[^>]*>2<\/span>/);
    expect(render("/super-admin", 0)).not.toMatch(/Cleanups<\/span><span/);
  });

  it("shows who is signed in, with a way out", () => {
    const html = render("/super-admin");

    expect(html).toContain("admin@example.com");
    expect(html).toContain("Sign out");
  });
});
