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

const { SuperAdminOverview } = await import("@/components/super-admin/SuperAdminOverview");

function render(props: Partial<Parameters<typeof SuperAdminOverview>[0]> = {}) {
  return renderToStaticMarkup(
    <SuperAdminOverview
      accounts={{ total: 12, enabled: 10, disabled: 2 }}
      pendingCleanups={0}
      demoPagesNeedingSeed={0}
      {...props}
    />,
  );
}

describe("SuperAdminOverview", () => {
  it("shows the account counts", () => {
    const html = render();

    expect(html).toContain(">12<");
    expect(html).toContain(">10<");
    expect(html).toContain(">2<");
  });

  it("links straight to the accounts that cannot publish", () => {
    expect(render()).toContain('href="/super-admin/accounts?status=disabled"');
  });

  it("raises queued cleanups and unseeded demo pages", () => {
    const html = render({ pendingCleanups: 3, demoPagesNeedingSeed: 1 });

    expect(html).toContain('href="/super-admin/cleanups"');
    expect(html).toContain('href="/super-admin/demo-pages"');
  });

  it("says so when nothing needs attention", () => {
    const html = render({ accounts: { total: 4, enabled: 4, disabled: 0 } });

    expect(html).toContain("Nothing needs attention");
  });
});
